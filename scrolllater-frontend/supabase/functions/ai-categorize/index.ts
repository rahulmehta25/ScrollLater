/**
 * @fileoverview AI-powered content categorization edge function
 * @description Automatically categorizes and tags saved content using AI analysis.
 *              Considers user's existing tags and custom categories for personalization.
 *
 * @example
 * POST /functions/v1/ai-categorize
 * {
 *   "entryId": "uuid",
 *   "content": "Content to categorize...",
 *   "url": "https://example.com/article",
 *   "existingTags": ["tech", "startup"],
 *   "customCategories": ["must-read", "project-alpha"]
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  handleCors,
  jsonResponse,
  errorResponse,
  createAuthenticatedClient,
  callAI,
  parseAIJson,
  detectContentType,
  logAIUsage,
  measureLatency,
  parseRequestBody,
  validateRequired,
} from '../_shared/utils.ts'
import type {
  CategorizeRequest,
  CategorizeResponse,
  CategoryAssignment,
  Category,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for categorization */
const SYSTEM_PROMPT = `You are a content categorization expert for ScrollLater, a personal knowledge management app. Your role is to analyze content and assign accurate, useful categories and tags.

Guidelines:
- Choose categories that aid discoverability and organization
- Generate specific, actionable tags (not generic ones)
- Consider the user's existing tagging patterns
- Identify multiple relevant categories when appropriate
- Extract key topics and themes from the content
- Prioritize categories that match the user's interests`

/** Standard categories available in the system */
const STANDARD_CATEGORIES: Category[] = [
  'tech', 'ai', 'business', 'finance', 'design', 'science',
  'productivity', 'health', 'entertainment', 'news', 'research',
  'tutorial', 'opinion', 'other'
]

/**
 * Fetch user's tagging history for personalization
 */
async function fetchUserTagHistory(
  client: ReturnType<typeof import('../_shared/utils.ts').createServiceClient>,
  userId: string
): Promise<{ frequentTags: string[]; frequentCategories: string[] }> {
  const { data: entries } = await client
    .from('entries')
    .select('ai_tags, ai_category, user_tags, user_category')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const tagCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}

  if (entries) {
    for (const entry of entries) {
      // Count AI tags
      if (Array.isArray(entry.ai_tags)) {
        for (const tag of entry.ai_tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
      // Count user tags
      if (Array.isArray(entry.user_tags)) {
        for (const tag of entry.user_tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 2 // Weight user tags higher
        }
      }
      // Count categories
      if (entry.ai_category) {
        categoryCounts[entry.ai_category] = (categoryCounts[entry.ai_category] || 0) + 1
      }
      if (entry.user_category) {
        categoryCounts[entry.user_category] = (categoryCounts[entry.user_category] || 0) + 2
      }
    }
  }

  const frequentTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag]) => tag)

  const frequentCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([cat]) => cat)

  return { frequentTags, frequentCategories }
}

/**
 * Build categorization prompt
 */
function buildCategorizationPrompt(
  content: string,
  url: string | undefined,
  existingTags: string[],
  customCategories: string[],
  userHistory: { frequentTags: string[]; frequentCategories: string[] }
): string {
  return `Analyze and categorize the following content.

CONTENT:
"""
${content.substring(0, 6000)}
"""
${url ? `\nSOURCE URL: ${url}` : ''}

AVAILABLE STANDARD CATEGORIES:
${STANDARD_CATEGORIES.join(', ')}

USER'S CUSTOM CATEGORIES (if any):
${customCategories.length > 0 ? customCategories.join(', ') : 'None defined'}

USER'S EXISTING TAGS ON THIS ITEM:
${existingTags.length > 0 ? existingTags.join(', ') : 'None'}

USER'S FREQUENTLY USED TAGS (for context):
${userHistory.frequentTags.slice(0, 10).join(', ') || 'None yet'}

USER'S FREQUENT CATEGORIES:
${userHistory.frequentCategories.slice(0, 5).join(', ') || 'None yet'}

Provide categorization in this JSON format:
{
  "primaryCategory": {
    "category": "category name from standard or custom list",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation"
  },
  "secondaryCategories": [
    {
      "category": "category name",
      "confidence": 0.0-1.0,
      "reasoning": "Brief explanation"
    }
  ],
  "tags": ["specific", "relevant", "tags", "for", "this", "content"],
  "suggestedCustomTags": ["tags matching user's style"],
  "topics": ["main", "themes", "discussed"]
}

Requirements:
- Primary category confidence should be > 0.6
- Include 2-4 secondary categories if relevant
- Generate 5-8 specific, useful tags
- suggestedCustomTags: Generate tags similar to user's existing tag style
- topics: Extract 3-5 main themes/topics`
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let usage: TokenUsage | undefined

  try {
    // Authenticate user
    const { client, user, error: authError } = await createAuthenticatedClient(req)
    if (authError) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    const { body, error: parseError } = await parseRequestBody<CategorizeRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    // Validate required fields
    const validationError = validateRequired(body as Record<string, unknown>, ['entryId', 'content'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const {
      entryId,
      content,
      url,
      existingTags = [],
      customCategories = [],
    } = body

    // Fetch user's tagging history
    const userHistory = await fetchUserTagHistory(client, user.id)

    // Build prompt and call AI
    const prompt = buildCategorizationPrompt(
      content,
      url,
      existingTags,
      customCategories,
      userHistory
    )

    const { result: aiResult, latencyMs } = await measureLatency(async () => {
      return await callAI(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 600,
        temperature: 0.3,
      })
    })

    usage = aiResult.usage

    // Parse response
    const parsed = parseAIJson<{
      primaryCategory: CategoryAssignment
      secondaryCategories: CategoryAssignment[]
      tags: string[]
      suggestedCustomTags?: string[]
      topics: string[]
    }>(aiResult.content, {
      primaryCategory: { category: 'other', confidence: 0.5, reasoning: 'Fallback category' },
      secondaryCategories: [],
      tags: ['uncategorized'],
      topics: [],
    })

    // Validate primary category
    const isValidCategory = (cat: string): boolean =>
      STANDARD_CATEGORIES.includes(cat as Category) || customCategories.includes(cat)

    const primaryCategory: CategoryAssignment = {
      category: isValidCategory(parsed.primaryCategory.category)
        ? parsed.primaryCategory.category
        : 'other',
      confidence: Math.max(0, Math.min(1, parsed.primaryCategory.confidence || 0.5)),
      reasoning: parsed.primaryCategory.reasoning || '',
    }

    const secondaryCategories: CategoryAssignment[] = (parsed.secondaryCategories || [])
      .filter(c => isValidCategory(c.category))
      .slice(0, 4)
      .map(c => ({
        category: c.category,
        confidence: Math.max(0, Math.min(1, c.confidence || 0.5)),
        reasoning: c.reasoning || '',
      }))

    const result = {
      primaryCategory,
      secondaryCategories,
      tags: (parsed.tags || []).slice(0, 10).map(String),
      suggestedCustomTags: (parsed.suggestedCustomTags || []).slice(0, 5).map(String),
      topics: (parsed.topics || []).slice(0, 5).map(String),
    }

    // Log usage
    await logAIUsage(client, {
      user_id: user.id,
      function_name: 'ai-categorize',
      entry_id: entryId,
      tokens_used: usage.totalTokens,
      model: usage.model,
      latency_ms: latencyMs,
      success: true,
    })

    // Update entry with categorization
    await client
      .from('entries')
      .update({
        ai_category: primaryCategory.category,
        ai_secondary_categories: secondaryCategories.map(c => c.category),
        ai_tags: result.tags,
        ai_topics: result.topics,
        ai_confidence_score: primaryCategory.confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', user.id)

    const response: CategorizeResponse = {
      success: true,
      result,
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-categorize function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})

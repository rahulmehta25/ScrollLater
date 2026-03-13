/**
 * @fileoverview AI-powered content summarization edge function
 * @description Analyzes content to extract summaries, categories, tags, key takeaways,
 *              and metadata. Supports multiple content types including articles, videos,
 *              tweets, PDFs, and more.
 *
 * @example
 * POST /functions/v1/ai-summarize
 * {
 *   "entryId": "uuid",
 *   "content": "Content to analyze...",
 *   "url": "https://example.com/article",
 *   "contentType": "article",
 *   "extractTakeaways": true
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
  estimateReadingTime,
  logAIUsage,
  measureLatency,
  parseRequestBody,
  validateRequired,
  generateFallbackSummary,
} from '../_shared/utils.ts'
import type {
  SummarizeRequest,
  SummarizeResponse,
  ContentType,
  Category,
  KeyTakeaway,
  TokenUsage,
} from '../_shared/types.ts'

/** System prompt for content analysis */
const SYSTEM_PROMPT = `You are an expert content analyst for a personal knowledge management app called ScrollLater. Your role is to help users organize and prioritize their saved content by providing accurate, insightful analysis.

Guidelines:
- Be concise but comprehensive
- Identify the core value proposition of the content
- Extract actionable insights when present
- Detect time-sensitive information accurately
- Use professional but accessible language
- Consider the user's perspective as a knowledge worker`

/**
 * Build the analysis prompt based on content type
 * @param content - Raw content
 * @param url - Content URL
 * @param contentType - Detected content type
 * @param extractTakeaways - Whether to extract detailed takeaways
 */
function buildAnalysisPrompt(
  content: string,
  url: string | undefined,
  contentType: ContentType,
  extractTakeaways: boolean
): string {
  const contentTypeInstructions: Record<ContentType, string> = {
    article: 'This is an article. Focus on the main thesis, supporting arguments, and conclusions.',
    video: 'This is video content. Summarize the key visual/audio points and main takeaways.',
    tweet: 'This is a tweet/thread. Capture the core message and any discussion points.',
    reddit: 'This is a Reddit post/discussion. Identify the main topic and valuable community insights.',
    pdf: 'This is PDF content. Extract key sections, findings, and important data points.',
    podcast: 'This is podcast content. Summarize main discussion topics and guest insights.',
    newsletter: 'This is a newsletter. Identify the main updates, insights, and calls to action.',
    github: 'This is GitHub content. Summarize the project purpose, key features, and use cases.',
    unknown: 'Analyze this content and determine its type and purpose.',
  }

  const takeawaysSection = extractTakeaways
    ? `
"keyTakeaways": [
  {
    "point": "Main insight or learning",
    "significance": "Why this matters",
    "actionItem": "Optional: what the reader could do with this"
  }
  // Include 2-4 key takeaways
]`
    : `"keyTakeaways": []`

  return `Analyze the following ${contentType} content and provide a comprehensive analysis.

${contentTypeInstructions[contentType]}

Content:
"""
${content.substring(0, 8000)}
"""
${url ? `\nSource URL: ${url}` : ''}

Provide your analysis in the following JSON format:
{
  "title": "Engaging, descriptive title (max 60 characters)",
  "summary": "Comprehensive summary capturing the essence of the content (max 200 words)",
  "contentType": "${contentType}",
  "category": "Primary category from: tech, ai, business, finance, design, science, productivity, health, entertainment, news, research, tutorial, opinion, other",
  "secondaryCategories": ["Optional secondary categories"],
  "tags": ["3-7 relevant tags for organization"],
  ${takeawaysSection},
  "confidence": 0.85,
  "sentiment": "positive|neutral|negative",
  "complexity": 3,
  "isTimeSensitive": false,
  "expiresAt": null
}

Important:
- confidence: How confident you are in the categorization (0-1)
- complexity: Reading difficulty from 1 (easy) to 5 (expert)
- isTimeSensitive: true if content has an expiration (news, events, deals)
- expiresAt: ISO date string if time-sensitive, otherwise null
- Ensure all JSON is valid and properly escaped`
}

/**
 * Validate and transform AI response
 */
function validateResponse(
  parsed: Record<string, unknown>,
  content: string,
  url: string | undefined,
  contentType: ContentType
): SummarizeResponse['result'] {
  const readingTime = estimateReadingTime(content, contentType, url)

  // Validate category
  const validCategories: Category[] = [
    'tech', 'ai', 'business', 'finance', 'design', 'science',
    'productivity', 'health', 'entertainment', 'news', 'research',
    'tutorial', 'opinion', 'other'
  ]
  const category = validCategories.includes(parsed.category as Category)
    ? (parsed.category as Category)
    : 'other'

  // Validate and transform key takeaways
  const keyTakeaways: KeyTakeaway[] = Array.isArray(parsed.keyTakeaways)
    ? parsed.keyTakeaways.slice(0, 5).map((t: Record<string, unknown>) => ({
        point: String(t.point || '').substring(0, 200),
        significance: String(t.significance || '').substring(0, 200),
        actionItem: t.actionItem ? String(t.actionItem).substring(0, 200) : undefined,
      }))
    : []

  // Validate secondary categories
  const secondaryCategories = Array.isArray(parsed.secondaryCategories)
    ? (parsed.secondaryCategories as string[]).filter(c => validCategories.includes(c as Category)).slice(0, 3) as Category[]
    : []

  return {
    title: String(parsed.title || content.substring(0, 60)).substring(0, 60),
    summary: String(parsed.summary || content.substring(0, 200)).substring(0, 500),
    contentType: contentType,
    category,
    secondaryCategories,
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 7).map(String) : ['uncategorized'],
    keyTakeaways,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    sentiment: ['positive', 'neutral', 'negative'].includes(String(parsed.sentiment))
      ? (parsed.sentiment as 'positive' | 'neutral' | 'negative')
      : 'neutral',
    estimatedReadTime: readingTime.minutes,
    complexity: Math.max(1, Math.min(5, Number(parsed.complexity) || 3)),
    isTimeSensitive: Boolean(parsed.isTimeSensitive),
    expiresAt: parsed.expiresAt ? String(parsed.expiresAt) : undefined,
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const startTime = performance.now()
  let usage: TokenUsage | undefined

  try {
    // Authenticate user
    const { client, user, error: authError } = await createAuthenticatedClient(req)
    if (authError) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    const { body, error: parseError } = await parseRequestBody<SummarizeRequest>(req)
    if (parseError) {
      return errorResponse(parseError, 400)
    }

    // Validate required fields
    const validationError = validateRequired(body as Record<string, unknown>, ['entryId', 'content'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const { entryId, content, url, contentType: requestedType, extractTakeaways = true } = body

    // Detect content type
    const contentType = requestedType || detectContentType(url, content)

    // Build prompt and call AI
    const prompt = buildAnalysisPrompt(content, url, contentType, extractTakeaways)

    let result: SummarizeResponse['result']

    try {
      const { result: aiResult, latencyMs } = await measureLatency(async () => {
        return await callAI(prompt, {
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 1000,
          temperature: 0.3,
        })
      })

      usage = aiResult.usage

      // Parse and validate response
      const parsed = parseAIJson<Record<string, unknown>>(aiResult.content, {})
      result = validateResponse(parsed, content, url, contentType)

      // Log successful usage
      await logAIUsage(client, {
        user_id: user.id,
        function_name: 'ai-summarize',
        entry_id: entryId,
        tokens_used: usage.totalTokens,
        model: usage.model,
        latency_ms: latencyMs,
        success: true,
      })
    } catch (aiError) {
      console.error('AI call failed, using fallback:', aiError)

      // Use fallback when AI is unavailable
      result = generateFallbackSummary(content, url)

      // Log failed attempt
      await logAIUsage(client, {
        user_id: user.id,
        function_name: 'ai-summarize',
        entry_id: entryId,
        tokens_used: 0,
        model: 'fallback',
        latency_ms: Math.round(performance.now() - startTime),
        success: false,
        error_message: aiError instanceof Error ? aiError.message : 'Unknown error',
      })
    }

    // Update entry in database
    const { error: updateError } = await client
      .from('entries')
      .update({
        title: result.title,
        ai_summary: result.summary,
        ai_category: result.category,
        ai_tags: result.tags,
        ai_confidence_score: result.confidence,
        ai_reading_time: result.estimatedReadTime,
        ai_key_takeaways: result.keyTakeaways,
        ai_sentiment: result.sentiment,
        ai_complexity: result.complexity,
        ai_is_time_sensitive: result.isTimeSensitive,
        ai_expires_at: result.expiresAt,
        ai_content_type: result.contentType,
        ai_secondary_categories: result.secondaryCategories,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Database update error:', updateError)
      // Don't fail the request, still return the result
    }

    // Update processing queue if exists
    await client
      .from('processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: result,
        ai_model_used: usage?.model || 'fallback',
        tokens_used: usage?.totalTokens || 0,
      })
      .eq('entry_id', entryId)
      .eq('task_type', 'summarize')

    const response: SummarizeResponse = {
      success: true,
      result,
      usage,
    }

    return jsonResponse(response)
  } catch (error) {
    console.error('Error in ai-summarize function:', error)

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})

/**
 * @fileoverview Shared utilities for AI edge functions
 * @module _shared/utils
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type {
  OpenRouterResponse,
  TokenUsage,
  AIUsageLog,
  ContentType,
  ReadingTimeEstimate,
  ErrorResponse,
} from './types.ts'

// =============================================================================
// CORS Configuration
// =============================================================================

/** Standard CORS headers for all edge functions */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Handle CORS preflight requests
 * @param req - Incoming request
 * @returns Response for OPTIONS or null if not OPTIONS
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create a JSON response with CORS headers
 * @param data - Response data
 * @param status - HTTP status code
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Create an error response
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Optional error code
 */
export function errorResponse(
  message: string,
  status = 500,
  code?: string
): Response {
  const error: ErrorResponse = {
    success: false,
    error: message,
    ...(code && { code }),
  }
  return jsonResponse(error, status)
}

// =============================================================================
// Supabase Client
// =============================================================================

/**
 * Create an authenticated Supabase client
 * @param req - Request with authorization header
 * @returns Supabase client and user
 */
export async function createAuthenticatedClient(req: Request): Promise<{
  client: SupabaseClient
  user: { id: string; email?: string }
  error?: string
}> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    return {
      client: supabaseClient,
      user: { id: '' },
      error: 'Unauthorized',
    }
  }

  return { client: supabaseClient, user }
}

/**
 * Create a service role Supabase client (no auth required)
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

// =============================================================================
// OpenRouter AI Client
// =============================================================================

/** OpenRouter API configuration */
interface AIRequestConfig {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  responseFormat?: 'json' | 'text'
}

const DEFAULT_MODEL = 'anthropic/claude-3-haiku'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Call OpenRouter API with error handling and retries
 * @param prompt - User prompt
 * @param config - Request configuration
 * @returns AI response content and usage
 */
export async function callAI(
  prompt: string,
  config: AIRequestConfig = {}
): Promise<{ content: string; usage: TokenUsage }> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = 800,
    temperature = 0.3,
    systemPrompt,
    responseFormat = 'json',
  } = config

  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const messages: Array<{ role: string; content: string }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  }

  if (responseFormat === 'json') {
    requestBody.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://scrolllater.app',
      'X-Title': 'ScrollLater',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
  }

  const data: OpenRouterResponse = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content received from AI')
  }

  const usage: TokenUsage = {
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
    model: data.model ?? model,
    estimatedCost: estimateCost(data.usage?.total_tokens ?? 0, model),
  }

  return { content, usage }
}

/**
 * Parse JSON from AI response with fallback
 * @param content - Raw AI response
 * @param fallback - Fallback value if parsing fails
 */
export function parseAIJson<T>(content: string, fallback: T): T {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.warn('No JSON found in AI response, using fallback')
      return fallback
    }
    return JSON.parse(jsonMatch[0]) as T
  } catch (error) {
    console.error('Failed to parse AI JSON:', error)
    return fallback
  }
}

/**
 * Estimate cost based on token usage
 * @param tokens - Total tokens used
 * @param model - Model name
 * @returns Estimated cost in USD
 */
function estimateCost(tokens: number, model: string): number {
  // Approximate costs per 1M tokens (as of 2024)
  const costs: Record<string, number> = {
    'anthropic/claude-3-haiku': 0.25,
    'anthropic/claude-3-sonnet': 3.0,
    'anthropic/claude-3-opus': 15.0,
    'openai/gpt-4-turbo': 10.0,
    'openai/gpt-3.5-turbo': 0.5,
  }
  const costPer1M = costs[model] ?? 1.0
  return (tokens / 1_000_000) * costPer1M
}

// =============================================================================
// Content Type Detection
// =============================================================================

/** URL patterns for content type detection */
const URL_PATTERNS: Array<{ pattern: RegExp; type: ContentType }> = [
  { pattern: /youtube\.com|youtu\.be|vimeo\.com/i, type: 'video' },
  { pattern: /twitter\.com|x\.com/i, type: 'tweet' },
  { pattern: /reddit\.com/i, type: 'reddit' },
  { pattern: /github\.com/i, type: 'github' },
  { pattern: /\.pdf$/i, type: 'pdf' },
  { pattern: /spotify\.com.*podcast|apple\.com.*podcast|podcasts?\./i, type: 'podcast' },
  { pattern: /substack\.com|newsletter|mailchimp/i, type: 'newsletter' },
]

/**
 * Detect content type from URL and content
 * @param url - URL of the content
 * @param content - Content text
 * @returns Detected content type
 */
export function detectContentType(url?: string, content?: string): ContentType {
  // Check URL patterns first
  if (url) {
    for (const { pattern, type } of URL_PATTERNS) {
      if (pattern.test(url)) {
        return type
      }
    }
  }

  // Check content patterns
  if (content) {
    const lowerContent = content.toLowerCase()
    if (lowerContent.includes('thread:') || lowerContent.includes('tweet')) {
      return 'tweet'
    }
    if (lowerContent.includes('video') || lowerContent.includes('watch')) {
      return 'video'
    }
  }

  return 'article'
}

// =============================================================================
// Reading Time Estimation
// =============================================================================

/** Reading speed factors by content type (words per minute adjustment) */
const CONTENT_TYPE_FACTORS: Record<ContentType, number> = {
  article: 1.0,
  video: 0.0, // Videos have explicit duration
  tweet: 1.5, // Tweets are quick reads
  reddit: 0.9, // Reddit discussions need more context
  pdf: 0.8, // PDFs often have dense content
  podcast: 0.0, // Podcasts have explicit duration
  newsletter: 0.95,
  github: 0.7, // Code requires more careful reading
  unknown: 1.0,
}

/** Average reading speed in words per minute */
const BASE_READING_SPEED = 200

/**
 * Estimate reading time for content
 * @param content - Text content
 * @param contentType - Type of content
 * @param url - URL for additional context
 * @returns Reading time estimate
 */
export function estimateReadingTime(
  content: string,
  contentType: ContentType = 'article',
  url?: string
): ReadingTimeEstimate {
  // For video/podcast, try to extract duration from content
  if (contentType === 'video' || contentType === 'podcast') {
    const durationMatch = content.match(/(\d+)\s*(?:min|minutes?|mins?)/i)
    if (durationMatch) {
      return {
        minutes: parseInt(durationMatch[1], 10),
        wordCount: 0,
        contentTypeFactor: 0,
        complexityAdjustment: 0,
      }
    }
    // Default video/podcast duration
    return {
      minutes: 15,
      wordCount: 0,
      contentTypeFactor: 0,
      complexityAdjustment: 0,
    }
  }

  // Count words
  const words = content.trim().split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length

  // Get content type factor
  const detectedType = contentType === 'unknown' ? detectContentType(url, content) : contentType
  const contentTypeFactor = CONTENT_TYPE_FACTORS[detectedType] ?? 1.0

  // Calculate complexity adjustment based on average word length
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (wordCount || 1)
  const complexityAdjustment = avgWordLength > 6 ? 1.2 : avgWordLength > 5 ? 1.1 : 1.0

  // Calculate reading time
  const adjustedSpeed = BASE_READING_SPEED * contentTypeFactor
  const rawMinutes = wordCount / adjustedSpeed
  const adjustedMinutes = rawMinutes * complexityAdjustment

  return {
    minutes: Math.max(1, Math.round(adjustedMinutes)),
    wordCount,
    contentTypeFactor,
    complexityAdjustment,
  }
}

// =============================================================================
// Usage Tracking
// =============================================================================

/**
 * Log AI function usage to database
 * @param client - Supabase client
 * @param log - Usage log entry
 */
export async function logAIUsage(
  client: SupabaseClient,
  log: Omit<AIUsageLog, 'id' | 'created_at'>
): Promise<void> {
  try {
    await client.from('ai_usage_logs').insert({
      user_id: log.user_id,
      function_name: log.function_name,
      entry_id: log.entry_id,
      tokens_used: log.tokens_used,
      model: log.model,
      latency_ms: log.latency_ms,
      success: log.success,
      error_message: log.error_message,
    })
  } catch (error) {
    // Log usage tracking errors but don't fail the main operation
    console.error('Failed to log AI usage:', error)
  }
}

/**
 * Measure execution time of an async function
 * @param fn - Async function to measure
 * @returns Result and elapsed time in ms
 */
export async function measureLatency<T>(
  fn: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now()
  const result = await fn()
  const latencyMs = Math.round(performance.now() - start)
  return { result, latencyMs }
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate required fields in request body
 * @param body - Request body
 * @param requiredFields - List of required field names
 * @returns Error message or null if valid
 */
export function validateRequired(
  body: Record<string, unknown>,
  requiredFields: string[]
): string | null {
  const missing = requiredFields.filter(
    field => body[field] === undefined || body[field] === null || body[field] === ''
  )
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`
  }
  return null
}

/**
 * Safely parse request JSON body
 * @param req - Request object
 * @returns Parsed body or error
 */
export async function parseRequestBody<T>(
  req: Request
): Promise<{ body: T; error?: never } | { body?: never; error: string }> {
  try {
    const body = await req.json()
    return { body: body as T }
  } catch {
    return { error: 'Invalid JSON in request body' }
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

/** Rate limit configuration */
interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

/** Default rate limits per endpoint */
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ai-summarize': { maxRequests: 30, windowSeconds: 60 },
  'ai-schedule-suggest': { maxRequests: 20, windowSeconds: 60 },
  'calendar-integration': { maxRequests: 60, windowSeconds: 60 },
  'webhook-handler': { maxRequests: 100, windowSeconds: 60 },
  default: { maxRequests: 50, windowSeconds: 60 },
}

/**
 * Check if request is within rate limit
 * @param client - Supabase client
 * @param userId - User ID
 * @param endpoint - Endpoint name
 * @param config - Optional custom rate limit config
 * @returns True if within limit, false if rate limited
 */
export async function checkRateLimit(
  client: SupabaseClient,
  userId: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const { maxRequests, windowSeconds } = config || DEFAULT_RATE_LIMITS[endpoint] || DEFAULT_RATE_LIMITS.default
  const windowStart = new Date(Date.now() - windowSeconds * 1000)

  try {
    // Get or create rate limit record
    const { data, error } = await client
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single()

    if (error && error.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Rate limit check error:', error)
      // Allow request on error, but log it
      return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowSeconds * 1000) }
    }

    const now = new Date()
    let requestCount = 1
    let windowStartTime = now

    if (data) {
      const recordWindowStart = new Date(data.window_start)

      if (recordWindowStart >= windowStart) {
        // Within current window
        requestCount = data.request_count + 1
        windowStartTime = recordWindowStart
      }
      // If outside window, start fresh with count = 1

      // Update existing record
      await client
        .from('rate_limits')
        .update({
          request_count: requestCount,
          window_start: requestCount === 1 ? now.toISOString() : data.window_start,
        })
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
    } else {
      // Create new record
      await client
        .from('rate_limits')
        .insert({
          user_id: userId,
          endpoint,
          request_count: 1,
          window_start: now.toISOString(),
        })
    }

    const resetAt = new Date(windowStartTime.getTime() + windowSeconds * 1000)
    const allowed = requestCount <= maxRequests
    const remaining = Math.max(0, maxRequests - requestCount)

    return { allowed, remaining, resetAt }
  } catch (err) {
    console.error('Rate limit error:', err)
    // Allow on error
    return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowSeconds * 1000) }
  }
}

/**
 * Apply rate limiting middleware
 * Returns error response if rate limited, null otherwise
 */
export async function applyRateLimit(
  client: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<Response | null> {
  const { allowed, remaining, resetAt } = await checkRateLimit(client, userId, endpoint)

  if (!allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': resetAt.toISOString(),
          'Retry-After': String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
        },
      }
    )
  }

  return null
}

// =============================================================================
// Error Handling
// =============================================================================

/** Standard error codes */
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AI_ERROR: 'AI_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * Create standardized error response with proper logging
 */
export function createError(
  message: string,
  code: keyof typeof ErrorCodes,
  status: number,
  details?: unknown
): Response {
  console.error(`[${code}] ${message}`, details)

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code,
      ...(Deno.env.get('DEBUG') === 'true' && details ? { details } : {}),
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandling<T extends Request>(
  handler: (req: T) => Promise<Response>
): (req: T) => Promise<Response> {
  return async (req: T) => {
    try {
      return await handler(req)
    } catch (error) {
      console.error('Unhandled error:', error)

      if (error instanceof Response) {
        return error
      }

      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      return createError(message, 'INTERNAL_ERROR', 500, error)
    }
  }
}

// =============================================================================
// Fallback Generators
// =============================================================================

/**
 * Generate fallback summary when AI is unavailable
 * @param content - Original content
 * @param url - Content URL
 */
export function generateFallbackSummary(content: string, url?: string) {
  const contentType = detectContentType(url, content)
  const readingTime = estimateReadingTime(content, contentType, url)

  return {
    title: content.substring(0, 60).trim() + (content.length > 60 ? '...' : ''),
    summary: content.substring(0, 200).trim() + (content.length > 200 ? '...' : ''),
    contentType,
    category: 'other' as const,
    secondaryCategories: [],
    tags: ['uncategorized'],
    keyTakeaways: [],
    confidence: 0.3,
    sentiment: 'neutral' as const,
    estimatedReadTime: readingTime.minutes,
    complexity: 3,
    isTimeSensitive: false,
  }
}

/**
 * Generate fallback priority score
 * @param content - Content to score
 */
export function generateFallbackPriority(content: string) {
  const wordCount = content.split(/\s+/).length
  const hasUrls = /https?:\/\//.test(content)
  const hasQuestions = /\?/.test(content)

  // Simple heuristic scoring
  let score = 50
  if (wordCount > 500) score += 10
  if (hasUrls) score += 5
  if (hasQuestions) score += 5

  return {
    score: Math.min(100, score),
    tier: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low' as const,
    factors: {
      relevance: 0.5,
      timeliness: 0.5,
      quality: 0.5,
      actionability: hasQuestions ? 0.6 : 0.4,
      learningValue: 0.5,
      urgency: 0.3,
    },
    explanation: 'Fallback scoring used due to AI unavailability',
  }
}

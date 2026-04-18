# ScrollLater AI Edge Functions

This directory contains Supabase Edge Functions that power ScrollLater's AI-driven content intelligence features.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Functions](#functions)
  - [ai-summarize](#ai-summarize)
  - [ai-schedule-suggest](#ai-schedule-suggest)
  - [ai-categorize](#ai-categorize)
  - [ai-digest](#ai-digest)
  - [ai-recommend](#ai-recommend)
  - [ai-priority-score](#ai-priority-score)
  - [ai-smart-queue](#ai-smart-queue)
  - [ai-reading-time](#ai-reading-time)
- [Shared Utilities](#shared-utilities)
- [Setup & Configuration](#setup--configuration)
- [Usage Tracking](#usage-tracking)
- [Error Handling](#error-handling)
- [Development](#development)

## Overview

ScrollLater uses AI to help users manage their saved content more effectively. The AI features include:

- **Content Analysis**: Automatic summarization, categorization, and tagging
- **Smart Scheduling**: AI-suggested optimal reading times based on calendar and patterns
- **Priority Scoring**: Intelligent ranking of content by relevance and importance
- **Personalized Recommendations**: Content suggestions based on reading history
- **Digest Generation**: Daily/weekly summaries of saved content
- **Smart Queue**: AI-curated reading queues for focused sessions

All AI features are powered by OpenRouter API, providing access to models like Claude 3 Haiku/Sonnet.

## Architecture

```
supabase/functions/
├── _shared/                    # Shared utilities and types
│   ├── types.ts               # TypeScript interfaces for all functions
│   └── utils.ts               # Common utilities (CORS, AI client, etc.)
├── ai-summarize/              # Content summarization
├── ai-schedule-suggest/       # Schedule suggestions
├── ai-categorize/             # Auto-categorization
├── ai-digest/                 # Digest generation
├── ai-recommend/              # Content recommendations
├── ai-priority-score/         # Priority scoring
├── ai-smart-queue/            # Smart queue generation
├── ai-reading-time/           # Reading time estimation
├── calendar-integration/      # Google Calendar integration
└── webhook-handler/           # Apple Shortcuts webhook
```

## Functions

### ai-summarize

Analyzes content to extract summaries, categories, tags, and key takeaways. Supports multiple content types.

**Endpoint**: `POST /functions/v1/ai-summarize`

**Request**:
```json
{
  "entryId": "uuid",
  "content": "Content to analyze...",
  "url": "https://example.com/article",
  "contentType": "article",
  "extractTakeaways": true
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "title": "Generated title",
    "summary": "Content summary...",
    "contentType": "article",
    "category": "tech",
    "secondaryCategories": ["ai"],
    "tags": ["react", "web-dev"],
    "keyTakeaways": [
      {
        "point": "Main insight",
        "significance": "Why it matters",
        "actionItem": "What to do"
      }
    ],
    "confidence": 0.85,
    "sentiment": "positive",
    "estimatedReadTime": 8,
    "complexity": 3,
    "isTimeSensitive": false
  },
  "usage": {
    "totalTokens": 450,
    "model": "anthropic/claude-3-haiku"
  }
}
```

**Content Types Supported**:
- `article` - Web articles and blog posts
- `video` - YouTube, Vimeo content
- `tweet` - Twitter/X threads
- `reddit` - Reddit posts and discussions
- `pdf` - PDF documents
- `podcast` - Podcast episodes
- `newsletter` - Email newsletters
- `github` - GitHub repositories and code

---

### ai-schedule-suggest

Analyzes user's calendar and reading patterns to suggest optimal times for content consumption.

**Endpoint**: `POST /functions/v1/ai-schedule-suggest`

**Request**:
```json
{
  "entryId": "uuid",
  "numSuggestions": 3,
  "minDaysAhead": 0,
  "maxDaysAhead": 7
}
```

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "startTime": "2024-03-15T14:00:00Z",
      "endTime": "2024-03-15T14:30:00Z",
      "durationMinutes": 30,
      "confidence": 0.85,
      "reason": "Free slot during your typical afternoon reading time",
      "slotQuality": 4
    }
  ],
  "patternsUsed": {
    "preferredTimesByDay": {
      "weekday": ["morning", "evening"],
      "weekend": ["morning", "afternoon"]
    },
    "productiveHours": [9, 10, 14, 19],
    "averageSessionDuration": 25,
    "completionRate": 0.72
  }
}
```

**Features**:
- Learns from user's reading completion patterns
- Considers Google Calendar busy slots
- Respects user timezone and preferences
- Groups similar content for focused sessions

---

### ai-categorize

Automatically categorizes and tags content with AI-powered analysis.

**Endpoint**: `POST /functions/v1/ai-categorize`

**Request**:
```json
{
  "entryId": "uuid",
  "content": "Content to categorize...",
  "url": "https://example.com",
  "existingTags": ["tech"],
  "customCategories": ["must-read", "project-alpha"]
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "primaryCategory": {
      "category": "tech",
      "confidence": 0.92,
      "reasoning": "Article discusses React and Next.js development"
    },
    "secondaryCategories": [
      {
        "category": "tutorial",
        "confidence": 0.78,
        "reasoning": "Contains step-by-step instructions"
      }
    ],
    "tags": ["react", "nextjs", "server-components", "performance"],
    "suggestedCustomTags": ["frontend-architecture"],
    "topics": ["web development", "React ecosystem", "performance optimization"]
  }
}
```

**Categories**:
`tech`, `ai`, `business`, `finance`, `design`, `science`, `productivity`, `health`, `entertainment`, `news`, `research`, `tutorial`, `opinion`, `other`

---

### ai-digest

Generates daily, weekly, or monthly digest summaries of saved content.

**Endpoint**: `POST /functions/v1/ai-digest`

**Request**:
```json
{
  "frequency": "weekly",
  "startDate": "2024-03-08",
  "endDate": "2024-03-15",
  "maxItems": 50,
  "focusCategories": ["tech", "ai"]
}
```

**Response**:
```json
{
  "success": true,
  "digest": {
    "title": "Your Week in Tech & AI",
    "executiveSummary": "This week focused on AI advances and React ecosystem updates...",
    "period": {
      "start": "2024-03-08T00:00:00Z",
      "end": "2024-03-15T00:00:00Z"
    },
    "totalItems": 23,
    "unreadItems": 18,
    "categorySummaries": [
      {
        "category": "ai",
        "itemCount": 8,
        "totalReadingMinutes": 95,
        "keyThemes": ["LLM advances", "AI regulation"],
        "mainTakeaway": "GPT-5 benchmarks show significant reasoning improvements",
        "topItems": [
          {"id": "uuid", "title": "Article title", "relevanceScore": 0.95}
        ]
      }
    ],
    "insights": [
      "AI developments are driving changes in web development practices",
      "Performance optimization remains a key theme across tech content"
    ],
    "recommendedReadingOrder": ["uuid1", "uuid2", "uuid3"],
    "estimatedCatchUpTime": 180
  }
}
```

---

### ai-recommend

Generates personalized content recommendations based on reading history and current context.

**Endpoint**: `POST /functions/v1/ai-recommend`

**Request**:
```json
{
  "currentEntryId": "uuid",
  "limit": 5,
  "includeExternal": false
}
```

**Response**:
```json
{
  "success": true,
  "recommendations": [
    {
      "entryId": "uuid",
      "title": "Related article title",
      "reason": "Covers React Server Components, complementing your current read",
      "relevanceScore": 0.88,
      "category": "tech",
      "readTimeMinutes": 12,
      "matchType": "topic"
    }
  ],
  "reasoning": "Selected items that build on React performance concepts from your current reading"
}
```

**Match Types**:
- `topic` - Same/related topics
- `author` - Same source/author
- `similar_users` - Popular with similar readers
- `trending` - Trending in user's categories
- `complementary` - Different perspective on same topic

---

### ai-priority-score

Calculates priority scores based on relevance, timeliness, and user interests.

**Endpoint**: `POST /functions/v1/ai-priority-score`

**Request**:
```json
{
  "entryId": "uuid",
  "content": "Content to score...",
  "url": "https://example.com",
  "userContext": {
    "interests": ["AI", "startups"],
    "recentlyRead": ["machine learning", "GPT-4"],
    "goals": ["Learn ML fundamentals"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "score": 82,
    "tier": "must_read",
    "factors": {
      "relevance": 0.9,
      "timeliness": 0.85,
      "quality": 0.8,
      "actionability": 0.7,
      "learningValue": 0.85,
      "urgency": 0.6
    },
    "explanation": "Highly relevant to your ML learning goals with actionable insights",
    "suggestedDeadline": "2024-03-20T00:00:00Z"
  }
}
```

**Priority Tiers**:
- `must_read` (80-100): Critical, time-sensitive content
- `high` (60-79): Valuable, worth scheduling soon
- `medium` (40-59): Good content for when time permits
- `low` (20-39): Nice-to-have, can wait
- `archive_candidate` (1-19): Consider archiving

---

### ai-smart-queue

Creates AI-curated reading queues optimized for available time and energy.

**Endpoint**: `POST /functions/v1/ai-smart-queue`

**Request**:
```json
{
  "availableMinutes": 30,
  "timeOfDay": "morning",
  "energyLevel": "high",
  "focusAreas": ["tech", "ai"],
  "maxItems": 10
}
```

**Response**:
```json
{
  "success": true,
  "queue": {
    "items": [
      {
        "entryId": "uuid",
        "title": "Article title",
        "category": "ai",
        "readTimeMinutes": 8,
        "priorityScore": 85,
        "reason": "High priority AI content, good starter piece",
        "position": 1,
        "skippable": false
      }
    ],
    "totalMinutes": 28,
    "fitsInTimeSlot": true,
    "explanation": "Optimized for high-energy morning session focusing on AI topics",
    "quickAlternative": [
      // Shorter alternative if time is limited
    ]
  }
}
```

**Time of Day Options**:
`early_morning`, `morning`, `afternoon`, `evening`, `night`

**Energy Levels**:
`low`, `medium`, `high`

---

### ai-reading-time

Estimates reading/viewing time based on content analysis.

**Endpoint**: `POST /functions/v1/ai-reading-time`

**Request**:
```json
{
  "entryId": "uuid",
  "content": "Content text...",
  "url": "https://example.com",
  "contentType": "article"
}
```

**Response**:
```json
{
  "success": true,
  "estimate": {
    "minutes": 12,
    "formatted": "12 minutes",
    "wordCount": 2400,
    "contentTypeFactor": 1.0,
    "complexityAdjustment": 1.1,
    "detectedType": "article"
  }
}
```

## Shared Utilities

### `_shared/types.ts`

Contains TypeScript interfaces for all function inputs/outputs:

- `SummarizeRequest`, `SummarizeResponse`
- `ScheduleSuggestRequest`, `ScheduleSuggestResponse`
- `CategorizeRequest`, `CategorizeResponse`
- `DigestRequest`, `DigestResponse`
- `RecommendRequest`, `RecommendResponse`
- `PriorityScoreRequest`, `PriorityScoreResponse`
- `SmartQueueRequest`, `SmartQueueResponse`
- `TokenUsage`, `AIUsageLog`
- And more...

### `_shared/utils.ts`

Common utilities used across all functions:

```typescript
// CORS handling
handleCors(req: Request): Response | null
jsonResponse<T>(data: T, status?: number): Response
errorResponse(message: string, status?: number): Response

// Authentication
createAuthenticatedClient(req: Request): Promise<{client, user, error?}>

// AI Client
callAI(prompt: string, config?: AIRequestConfig): Promise<{content, usage}>
parseAIJson<T>(content: string, fallback: T): T

// Content Analysis
detectContentType(url?: string, content?: string): ContentType
estimateReadingTime(content: string, type?: ContentType): ReadingTimeEstimate

// Usage Tracking
logAIUsage(client: SupabaseClient, log: AIUsageLog): Promise<void>
measureLatency<T>(fn: () => Promise<T>): Promise<{result, latencyMs}>

// Fallbacks
generateFallbackSummary(content: string, url?: string)
generateFallbackPriority(content: string)
```

## Setup & Configuration

### Environment Variables

Required environment variables for Supabase Edge Functions:

```bash
# Supabase (automatically provided)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter API (required)
OPENROUTER_API_KEY=your-openrouter-api-key

# Google Calendar (optional, for schedule suggestions)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Database Migration

Run the migration to add required columns and tables:

```bash
supabase db push
# Or apply manually:
# supabase/migrations/20240315_ai_features.sql
```

### Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ai-summarize
```

## Usage Tracking

All AI functions log usage to the `ai_usage_logs` table:

```sql
SELECT
  function_name,
  COUNT(*) as calls,
  SUM(tokens_used) as total_tokens,
  AVG(latency_ms) as avg_latency
FROM ai_usage_logs
WHERE user_id = 'your-user-id'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY function_name;
```

Use the helper function for statistics:

```sql
SELECT * FROM get_ai_usage_stats('user-uuid', 30);
```

## Error Handling

All functions implement graceful degradation:

1. **AI Unavailable**: Falls back to rule-based analysis
2. **Rate Limited**: Returns cached/fallback results
3. **Invalid Input**: Returns descriptive error messages
4. **Database Errors**: Logs error but returns AI results

Error response format:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

## Development

### Local Development

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve --env-file .env.local

# Test a function
curl -X POST http://localhost:54321/functions/v1/ai-summarize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entryId": "uuid", "content": "Test content"}'
```

### Testing

```bash
# Run function tests
deno test --allow-all supabase/functions/tests/
```

### Adding New Functions

1. Create function directory: `supabase/functions/ai-new-feature/`
2. Add `index.ts` with serve() handler
3. Add types to `_shared/types.ts`
4. Import utilities from `_shared/utils.ts`
5. Add JSDoc documentation
6. Update this README

## Security

- All functions require authentication via `Authorization` header
- User data is scoped by `user_id` with RLS policies
- API keys are stored as Supabase secrets
- No sensitive data is logged

## Performance

- Average latency: 500-2000ms (depends on content size)
- Token usage: 200-1000 tokens per call
- Caching: Results stored in database for reuse
- Parallel processing: Multiple entries can be processed concurrently

## Cost Estimation

Using Claude 3 Haiku ($0.25/1M tokens):
- ~500 tokens per summarization: $0.000125
- Typical user (100 items/month): ~$0.01-0.05/month

---

For questions or issues, please open an issue in the repository.

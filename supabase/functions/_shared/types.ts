/**
 * @fileoverview Shared TypeScript types for all AI edge functions
 * @module _shared/types
 */

// =============================================================================
// Content Types
// =============================================================================

/** Supported content types for AI analysis */
export type ContentType = 'article' | 'video' | 'tweet' | 'reddit' | 'pdf' | 'podcast' | 'newsletter' | 'github' | 'unknown';

/** Content categories used for classification */
export type Category =
  | 'tech'
  | 'ai'
  | 'business'
  | 'finance'
  | 'design'
  | 'science'
  | 'productivity'
  | 'health'
  | 'entertainment'
  | 'news'
  | 'research'
  | 'tutorial'
  | 'opinion'
  | 'other';

/** Sentiment analysis results */
export type Sentiment = 'positive' | 'neutral' | 'negative';

/** Urgency/priority levels */
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

/** Time of day preferences */
export type TimeOfDay = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';

/** Digest frequency options */
export type DigestFrequency = 'daily' | 'weekly' | 'monthly';

// =============================================================================
// AI Summarize Types
// =============================================================================

/** Request payload for ai-summarize function */
export interface SummarizeRequest {
  /** Unique entry ID */
  entryId: string;
  /** Raw content to analyze */
  content: string;
  /** Optional URL of the content source */
  url?: string;
  /** Detected or specified content type */
  contentType?: ContentType;
  /** Whether to extract detailed takeaways */
  extractTakeaways?: boolean;
}

/** Key takeaway extracted from content */
export interface KeyTakeaway {
  /** The main point or insight */
  point: string;
  /** Why this is important */
  significance: string;
  /** Actionable next step if applicable */
  actionItem?: string;
}

/** Response from ai-summarize function */
export interface SummarizeResponse {
  success: boolean;
  result?: {
    /** Generated title (max 60 chars) */
    title: string;
    /** Brief summary (max 200 words) */
    summary: string;
    /** Detected content type */
    contentType: ContentType;
    /** Primary category */
    category: Category;
    /** Secondary categories if applicable */
    secondaryCategories?: Category[];
    /** Relevant tags (3-7) */
    tags: string[];
    /** Key takeaways from the content */
    keyTakeaways: KeyTakeaway[];
    /** Confidence score (0-1) */
    confidence: number;
    /** Overall sentiment */
    sentiment: Sentiment;
    /** Estimated reading/viewing time in minutes */
    estimatedReadTime: number;
    /** Content complexity (1-5) */
    complexity: number;
    /** Whether content is time-sensitive */
    isTimeSensitive: boolean;
    /** Expiration date if time-sensitive */
    expiresAt?: string;
  };
  error?: string;
  /** Token usage for tracking */
  usage?: TokenUsage;
}

// =============================================================================
// AI Schedule Suggest Types
// =============================================================================

/** Request payload for ai-schedule-suggest function */
export interface ScheduleSuggestRequest {
  /** Entry ID to suggest schedule for */
  entryId: string;
  /** Number of suggestions to return */
  numSuggestions?: number;
  /** Minimum days ahead to schedule */
  minDaysAhead?: number;
  /** Maximum days ahead to schedule */
  maxDaysAhead?: number;
}

/** A single schedule suggestion */
export interface ScheduleSuggestion {
  /** Suggested start time in ISO 8601 format */
  startTime: string;
  /** Suggested end time in ISO 8601 format */
  endTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Confidence score for this suggestion (0-1) */
  confidence: number;
  /** Reasoning for this suggestion */
  reason: string;
  /** Time slot quality score (1-5) */
  slotQuality: number;
}

/** User reading patterns for personalization */
export interface UserReadingPatterns {
  /** Preferred reading times by day of week */
  preferredTimesByDay: Record<string, TimeOfDay[]>;
  /** Average session duration in minutes */
  averageSessionDuration: number;
  /** Most productive hours (0-23) */
  productiveHours: number[];
  /** Categories user reads most */
  topCategories: Category[];
  /** Average completion rate */
  completionRate: number;
}

/** Response from ai-schedule-suggest function */
export interface ScheduleSuggestResponse {
  success: boolean;
  suggestions?: ScheduleSuggestion[];
  /** User patterns used for suggestions */
  patternsUsed?: UserReadingPatterns;
  error?: string;
  usage?: TokenUsage;
}

// =============================================================================
// AI Categorize Types
// =============================================================================

/** Request payload for ai-categorize function */
export interface CategorizeRequest {
  /** Entry ID to categorize */
  entryId: string;
  /** Content to categorize */
  content: string;
  /** Optional URL */
  url?: string;
  /** Existing user tags to consider */
  existingTags?: string[];
  /** User's custom categories if any */
  customCategories?: string[];
}

/** Category assignment with confidence */
export interface CategoryAssignment {
  /** Category name */
  category: Category | string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Why this category was assigned */
  reasoning: string;
}

/** Response from ai-categorize function */
export interface CategorizeResponse {
  success: boolean;
  result?: {
    /** Primary category */
    primaryCategory: CategoryAssignment;
    /** Secondary categories */
    secondaryCategories: CategoryAssignment[];
    /** Generated tags */
    tags: string[];
    /** Suggested custom tags based on user history */
    suggestedCustomTags?: string[];
    /** Topics/themes extracted */
    topics: string[];
  };
  error?: string;
  usage?: TokenUsage;
}

// =============================================================================
// AI Digest Types
// =============================================================================

/** Request payload for ai-digest function */
export interface DigestRequest {
  /** User ID */
  userId: string;
  /** Digest frequency */
  frequency: DigestFrequency;
  /** Start date for digest period */
  startDate?: string;
  /** End date for digest period */
  endDate?: string;
  /** Maximum items to include */
  maxItems?: number;
  /** Categories to focus on (optional) */
  focusCategories?: Category[];
}

/** Summary of a category in the digest */
export interface DigestCategorySummary {
  /** Category name */
  category: Category;
  /** Number of items */
  itemCount: number;
  /** Total reading time */
  totalReadingMinutes: number;
  /** Key themes */
  keyThemes: string[];
  /** Main takeaway */
  mainTakeaway: string;
  /** Top items in this category */
  topItems: Array<{
    id: string;
    title: string;
    relevanceScore: number;
  }>;
}

/** Response from ai-digest function */
export interface DigestResponse {
  success: boolean;
  digest?: {
    /** Digest title */
    title: string;
    /** Executive summary */
    executiveSummary: string;
    /** Period covered */
    period: {
      start: string;
      end: string;
    };
    /** Total items analyzed */
    totalItems: number;
    /** Total unread items */
    unreadItems: number;
    /** Category summaries */
    categorySummaries: DigestCategorySummary[];
    /** Cross-cutting insights */
    insights: string[];
    /** Recommended reading order */
    recommendedReadingOrder: string[];
    /** Time required to catch up (minutes) */
    estimatedCatchUpTime: number;
  };
  error?: string;
  usage?: TokenUsage;
}

// =============================================================================
// AI Recommend Types
// =============================================================================

/** Request payload for ai-recommend function */
export interface RecommendRequest {
  /** User ID for personalization */
  userId: string;
  /** Current entry ID (for related content) */
  currentEntryId?: string;
  /** Number of recommendations */
  limit?: number;
  /** Whether to include external recommendations */
  includeExternal?: boolean;
}

/** A content recommendation */
export interface Recommendation {
  /** Entry ID (for internal content) */
  entryId?: string;
  /** Title */
  title: string;
  /** Why this is recommended */
  reason: string;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Category */
  category: Category;
  /** Estimated read time */
  readTimeMinutes: number;
  /** External URL if external recommendation */
  externalUrl?: string;
  /** Match type */
  matchType: 'topic' | 'author' | 'similar_users' | 'trending' | 'complementary';
}

/** Response from ai-recommend function */
export interface RecommendResponse {
  success: boolean;
  recommendations?: Recommendation[];
  /** Why these were recommended */
  reasoning?: string;
  error?: string;
  usage?: TokenUsage;
}

// =============================================================================
// AI Priority Score Types
// =============================================================================

/** Request payload for ai-priority-score function */
export interface PriorityScoreRequest {
  /** Entry ID to score */
  entryId: string;
  /** Content for analysis */
  content: string;
  /** URL if available */
  url?: string;
  /** User context for personalization */
  userContext?: {
    interests: string[];
    recentlyRead: string[];
    goals?: string[];
  };
}

/** Priority scoring factors */
export interface PriorityFactors {
  /** Relevance to user interests (0-1) */
  relevance: number;
  /** Timeliness/freshness (0-1) */
  timeliness: number;
  /** Content quality indicators (0-1) */
  quality: number;
  /** Actionability (0-1) */
  actionability: number;
  /** Learning value (0-1) */
  learningValue: number;
  /** Urgency based on content (0-1) */
  urgency: number;
}

/** Response from ai-priority-score function */
export interface PriorityScoreResponse {
  success: boolean;
  result?: {
    /** Overall priority score (1-100) */
    score: number;
    /** Priority tier */
    tier: 'must_read' | 'high' | 'medium' | 'low' | 'archive_candidate';
    /** Individual scoring factors */
    factors: PriorityFactors;
    /** Explanation of the score */
    explanation: string;
    /** Suggested deadline if time-sensitive */
    suggestedDeadline?: string;
  };
  error?: string;
  usage?: TokenUsage;
}

// =============================================================================
// AI Smart Queue Types
// =============================================================================

/** Request payload for ai-smart-queue function */
export interface SmartQueueRequest {
  /** User ID */
  userId: string;
  /** Available time in minutes */
  availableMinutes: number;
  /** Time of day for context */
  timeOfDay?: TimeOfDay;
  /** Mood/energy level */
  energyLevel?: 'low' | 'medium' | 'high';
  /** Focus areas (optional) */
  focusAreas?: Category[];
  /** Maximum items to return */
  maxItems?: number;
}

/** A queue item with scheduling info */
export interface QueueItem {
  /** Entry ID */
  entryId: string;
  /** Title */
  title: string;
  /** Category */
  category: Category;
  /** Reading time in minutes */
  readTimeMinutes: number;
  /** Priority score */
  priorityScore: number;
  /** Why this is in the queue */
  reason: string;
  /** Suggested order position */
  position: number;
  /** Can be skipped? */
  skippable: boolean;
}

/** Response from ai-smart-queue function */
export interface SmartQueueResponse {
  success: boolean;
  queue?: {
    /** Queue items in recommended order */
    items: QueueItem[];
    /** Total reading time */
    totalMinutes: number;
    /** Items that fit in available time */
    fitsInTimeSlot: boolean;
    /** Queue explanation */
    explanation: string;
    /** Alternative shorter queue */
    quickAlternative?: QueueItem[];
  };
  error?: string;
  usage?: TokenUsage;
}

// =============================================================================
// Common/Shared Types
// =============================================================================

/** Token usage tracking */
export interface TokenUsage {
  /** Prompt tokens used */
  promptTokens: number;
  /** Completion tokens used */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Model used */
  model: string;
  /** Estimated cost in USD */
  estimatedCost?: number;
}

/** Standard error response */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/** OpenRouter API response structure */
export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/** Entry data from database */
export interface EntryData {
  id: string;
  user_id: string;
  url: string | null;
  title: string | null;
  content: string;
  ai_summary: string | null;
  ai_category: string | null;
  ai_tags: string[];
  ai_confidence_score: number | null;
  ai_priority_score?: number;
  ai_reading_time?: number;
  status: 'inbox' | 'scheduled' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

/** User profile data */
export interface UserProfileData {
  id: string;
  timezone: string;
  google_refresh_token: string | null;
  default_calendar_id: string | null;
  preferred_scheduling_times: Record<string, unknown>;
  ai_preferences?: {
    favoriteCategories?: Category[];
    readingGoals?: string[];
    excludeTopics?: string[];
  };
}

/** Reading time estimation result */
export interface ReadingTimeEstimate {
  /** Minutes to read */
  minutes: number;
  /** Words in content */
  wordCount: number;
  /** Content type factor applied */
  contentTypeFactor: number;
  /** Complexity adjustment */
  complexityAdjustment: number;
}

/** AI usage log entry */
export interface AIUsageLog {
  id?: string;
  user_id: string;
  function_name: string;
  entry_id?: string;
  tokens_used: number;
  model: string;
  latency_ms: number;
  success: boolean;
  error_message?: string;
  created_at?: string;
}

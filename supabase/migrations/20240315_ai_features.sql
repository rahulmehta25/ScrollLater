-- Migration: Add AI features columns and usage tracking
-- Description: Adds new columns for enhanced AI features and creates usage tracking table

-- ============================================================================
-- Add new AI columns to entries table
-- ============================================================================

-- Reading time and content analysis
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS ai_reading_time INTEGER,
ADD COLUMN IF NOT EXISTS ai_content_type TEXT,
ADD COLUMN IF NOT EXISTS ai_key_takeaways JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS ai_complexity INTEGER CHECK (ai_complexity >= 1 AND ai_complexity <= 5),
ADD COLUMN IF NOT EXISTS ai_is_time_sensitive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_secondary_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_topics TEXT[] DEFAULT '{}';

-- Priority scoring
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS ai_priority_score INTEGER CHECK (ai_priority_score >= 1 AND ai_priority_score <= 100),
ADD COLUMN IF NOT EXISTS ai_priority_tier TEXT CHECK (ai_priority_tier IN ('must_read', 'high', 'medium', 'low', 'archive_candidate')),
ADD COLUMN IF NOT EXISTS ai_priority_factors JSONB,
ADD COLUMN IF NOT EXISTS ai_suggested_deadline TIMESTAMPTZ;

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_entries_priority_score ON entries(ai_priority_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(ai_category);
CREATE INDEX IF NOT EXISTS idx_entries_time_sensitive ON entries(ai_is_time_sensitive) WHERE ai_is_time_sensitive = TRUE;

-- ============================================================================
-- Create AI usage tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_function ON ai_usage_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at DESC);

-- Enable RLS on usage logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage logs
CREATE POLICY "Users can view own usage logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert usage logs
CREATE POLICY "Service role can insert usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- Create AI digests table for storing generated digests
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  digest_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for digest retrieval
CREATE INDEX IF NOT EXISTS idx_ai_digests_user ON ai_digests(user_id, created_at DESC);

-- Enable RLS on digests
ALTER TABLE ai_digests ENABLE ROW LEVEL SECURITY;

-- Users can only access their own digests
CREATE POLICY "Users can view own digests"
  ON ai_digests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digests"
  ON ai_digests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Create function to get AI usage statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ai_usage_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  function_name TEXT,
  call_count BIGINT,
  total_tokens BIGINT,
  avg_latency_ms NUMERIC,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.function_name,
    COUNT(*) as call_count,
    SUM(l.tokens_used) as total_tokens,
    ROUND(AVG(l.latency_ms), 2) as avg_latency_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE l.success = TRUE))::NUMERIC / COUNT(*) * 100,
      2
    ) as success_rate
  FROM ai_usage_logs l
  WHERE l.user_id = p_user_id
    AND l.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY l.function_name
  ORDER BY call_count DESC;
END;
$$;

-- ============================================================================
-- Create trigger to auto-queue entries for AI processing
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_entry_for_ai_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue new entries that don't have AI analysis yet
  IF NEW.ai_summary IS NULL THEN
    INSERT INTO processing_queue (entry_id, task_type, status, created_at)
    VALUES (NEW.id, 'summarize', 'pending', NOW())
    ON CONFLICT (entry_id, task_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on entries table
DROP TRIGGER IF EXISTS trigger_queue_ai_processing ON entries;
CREATE TRIGGER trigger_queue_ai_processing
  AFTER INSERT ON entries
  FOR EACH ROW
  EXECUTE FUNCTION queue_entry_for_ai_processing();

-- ============================================================================
-- Add comment documentation
-- ============================================================================

COMMENT ON TABLE ai_usage_logs IS 'Tracks AI function usage for analytics and cost monitoring';
COMMENT ON TABLE ai_digests IS 'Stores generated content digests for users';
COMMENT ON COLUMN entries.ai_reading_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN entries.ai_priority_score IS 'AI-calculated priority score (1-100)';
COMMENT ON COLUMN entries.ai_key_takeaways IS 'Array of key insights extracted from content';
COMMENT ON COLUMN entries.ai_complexity IS 'Content complexity rating (1=easy, 5=expert)';

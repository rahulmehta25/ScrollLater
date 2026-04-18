-- Enhanced Schema Migration for ScrollLater
-- Adds missing indexes, constraints, rate limiting, and additional fields

-- ============ Add notification preferences to user_profiles ============
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_weekly_digest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_ai_insights BOOLEAN DEFAULT false;

-- ============ Add rate_limits table ============
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- RLS for rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rate limits" ON public.rate_limits FOR SELECT USING (auth.uid() = user_id);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- ============ Add missing indexes for performance ============

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_entries_user_status_created
ON public.entries(user_id, status, created_at DESC);

-- Index for scheduled items lookup
CREATE INDEX IF NOT EXISTS idx_entries_user_scheduled
ON public.entries(user_id, scheduled_for)
WHERE scheduled_for IS NOT NULL;

-- Index for priority sorting
CREATE INDEX IF NOT EXISTS idx_entries_user_priority
ON public.entries(user_id, priority DESC);

-- Index for processing queue by status and priority
CREATE INDEX IF NOT EXISTS idx_processing_queue_status_priority
ON public.processing_queue(status, priority DESC, created_at);

-- Index for finding pending tasks to process
CREATE INDEX IF NOT EXISTS idx_processing_queue_pending
ON public.processing_queue(status, created_at)
WHERE status = 'pending';

-- ============ Add constraints ============

-- Ensure priority is within valid range
ALTER TABLE public.entries
DROP CONSTRAINT IF EXISTS entries_priority_check;
ALTER TABLE public.entries
ADD CONSTRAINT entries_priority_check CHECK (priority >= 1 AND priority <= 5);

-- Ensure confidence score is valid percentage
ALTER TABLE public.entries
DROP CONSTRAINT IF EXISTS entries_confidence_check;
ALTER TABLE public.entries
ADD CONSTRAINT entries_confidence_check CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 1));

-- Ensure block duration is reasonable
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_block_duration_check;
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_block_duration_check CHECK (default_block_duration >= 5 AND default_block_duration <= 480);

-- ============ Rate limiting function ============

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

    -- Try to update existing record
    UPDATE public.rate_limits
    SET
        request_count = CASE
            WHEN window_start < v_window_start THEN 1
            ELSE request_count + 1
        END,
        window_start = CASE
            WHEN window_start < v_window_start THEN NOW()
            ELSE window_start
        END
    WHERE user_id = p_user_id AND endpoint = p_endpoint
    RETURNING request_count INTO v_count;

    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
        VALUES (p_user_id, p_endpoint, 1, NOW())
        RETURNING request_count INTO v_count;
    END IF;

    -- Return true if under limit, false if over
    RETURN v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ Clean up old rate limit records (to be called periodically) ============

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ Improve entry processing policies ============

-- Allow service role to manage processing queue
DROP POLICY IF EXISTS "Service role can manage processing queue" ON public.processing_queue;
CREATE POLICY "Service role can manage processing queue" ON public.processing_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- ============ Add delete policies where missing ============

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile" ON public.user_profiles
FOR DELETE
USING (auth.uid() = id);

-- ============ Optimize search vector for better performance ============

-- Add GiST index for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_entries_search_gist
ON public.entries USING GIST(search_vector);

-- ============ Add soft delete support (optional, uncomment if needed) ============
-- ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
-- CREATE INDEX IF NOT EXISTS idx_entries_deleted ON public.entries(deleted_at) WHERE deleted_at IS NULL;

-- ============ Grant necessary permissions ============

-- Allow authenticated users to use the rate limit function
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;

COMMENT ON FUNCTION public.check_rate_limit IS 'Check if user is within rate limit for an endpoint. Returns true if allowed, false if rate limited.';
COMMENT ON TABLE public.rate_limits IS 'Tracks API request counts per user per endpoint for rate limiting.';

-- Database optimization migration for ScrollLater
-- Creates optimized indexes for better query performance

-- Remove existing simple indexes that will be replaced with composite ones
DROP INDEX IF EXISTS idx_entries_user_id;
DROP INDEX IF EXISTS idx_entries_status;
DROP INDEX IF EXISTS idx_entries_created_at;

-- Create optimized composite indexes for common query patterns
-- This index supports: user_id filtering, status filtering, and created_at ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_status_created 
ON public.entries(user_id, status, created_at DESC);

-- This index supports category filtering with user ownership
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_category 
ON public.entries(user_id, COALESCE(user_category, ai_category));

-- Partial index for active entries only (reduces index size)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_active 
ON public.entries(user_id, created_at DESC) 
WHERE status IN ('inbox', 'scheduled');

-- Index for scheduled entries with time filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_scheduled_time 
ON public.entries(user_id, scheduled_for) 
WHERE status = 'scheduled' AND scheduled_for IS NOT NULL;

-- Index for priority-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_priority_created 
ON public.entries(user_id, priority, created_at DESC);

-- GIN index for array operations on tags (both AI and user tags combined)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_all_tags_gin 
ON public.entries USING GIN((ai_tags || user_tags));

-- Optimize full-text search with better GIN index
DROP INDEX IF EXISTS idx_entries_search;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_search_optimized 
ON public.entries USING GIN(search_vector) 
WHERE search_vector IS NOT NULL;

-- Index for user profile lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_calendar_connected 
ON public.user_profiles(google_calendar_connected, updated_at DESC)
WHERE google_calendar_connected = true;

-- Processing queue optimizations
DROP INDEX IF EXISTS idx_processing_queue_status;
DROP INDEX IF EXISTS idx_processing_queue_created_at;
DROP INDEX IF EXISTS idx_processing_queue_entry_id;

-- Composite index for processing queue efficiency
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_status_priority_created 
ON public.processing_queue(status, priority DESC, created_at ASC)
WHERE status IN ('pending', 'processing');

-- Index for processing queue cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_completed_at 
ON public.processing_queue(completed_at) 
WHERE status IN ('completed', 'failed') AND completed_at IS NOT NULL;

-- Index for user-specific processing queue queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_user_status 
ON public.processing_queue(user_id, status, created_at DESC);

-- Create database functions for optimized queries
-- Function to get pending tasks with proper ordering
CREATE OR REPLACE FUNCTION get_next_pending_tasks(limit_count integer DEFAULT 5)
RETURNS TABLE (
    id uuid,
    entry_id uuid,
    user_id uuid,
    task_type text,
    priority integer,
    status text,
    created_at timestamptz,
    result jsonb,
    error_message text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.id,
        pq.entry_id,
        pq.user_id,
        pq.task_type,
        pq.priority,
        pq.status,
        pq.created_at,
        pq.result,
        pq.error_message
    FROM public.processing_queue pq
    WHERE pq.status = 'pending'
    ORDER BY pq.priority DESC, pq.created_at ASC
    LIMIT limit_count
    FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Function to complete processing task efficiently
CREATE OR REPLACE FUNCTION complete_processing_task(
    p_task_id uuid,
    p_result jsonb,
    p_model_used text DEFAULT NULL,
    p_tokens_used integer DEFAULT NULL,
    p_processing_time_ms integer DEFAULT NULL
) RETURNS void AS $$
BEGIN
    UPDATE public.processing_queue 
    SET 
        status = 'completed',
        completed_at = NOW(),
        result = p_result,
        ai_model_used = p_model_used,
        tokens_used = p_tokens_used,
        processing_time_ms = p_processing_time_ms
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to fail processing task
CREATE OR REPLACE FUNCTION fail_processing_task(
    p_task_id uuid,
    p_error_message text
) RETURNS void AS $$
BEGIN
    UPDATE public.processing_queue 
    SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = p_error_message,
        retry_count = retry_count + 1
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to enqueue AI processing task
CREATE OR REPLACE FUNCTION enqueue_ai_processing(
    p_entry_id uuid,
    p_user_id uuid,
    p_task_type text,
    p_priority integer DEFAULT 5
) RETURNS uuid AS $$
DECLARE
    task_id uuid;
BEGIN
    -- Check if task already exists
    SELECT id INTO task_id
    FROM public.processing_queue
    WHERE entry_id = p_entry_id 
    AND task_type = p_task_type 
    AND status IN ('pending', 'processing');
    
    -- If no existing task, create new one
    IF task_id IS NULL THEN
        INSERT INTO public.processing_queue (entry_id, user_id, task_type, priority)
        VALUES (p_entry_id, p_user_id, p_task_type, p_priority)
        RETURNING id INTO task_id;
    END IF;
    
    RETURN task_id;
END;
$$ LANGUAGE plpgsql;

-- Optimized function for user entry statistics
CREATE OR REPLACE FUNCTION get_user_entry_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    WITH entry_stats AS (
        SELECT 
            COUNT(*) as total_entries,
            COUNT(*) FILTER (WHERE status = 'inbox') as inbox_count,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as entries_this_week,
            COUNT(*) FILTER (WHERE scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '7 days') as scheduled_this_week,
            AVG(COALESCE(estimated_read_time, 0)) as avg_read_time,
            SUM(COALESCE(estimated_read_time, 0)) as total_read_time,
            MAX(updated_at) as last_updated
        FROM public.entries 
        WHERE user_id = p_user_id
    ),
    category_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(user_category, ai_category, 'Uncategorized'), 
            category_count
        ) as by_category
        FROM (
            SELECT 
                COALESCE(user_category, ai_category, 'Uncategorized') as category,
                COUNT(*) as category_count
            FROM public.entries 
            WHERE user_id = p_user_id
            GROUP BY COALESCE(user_category, ai_category, 'Uncategorized')
        ) cat_counts
    )
    SELECT jsonb_build_object(
        'total_entries', es.total_entries,
        'inbox_count', es.inbox_count,
        'scheduled_count', es.scheduled_count,
        'completed_count', es.completed_count,
        'archived_count', es.archived_count,
        'entries_this_week', es.entries_this_week,
        'scheduled_this_week', es.scheduled_this_week,
        'avg_read_time', ROUND(es.avg_read_time::numeric, 2),
        'total_read_time', es.total_read_time,
        'last_updated', es.last_updated,
        'by_category', COALESCE(cs.by_category, '{}'::jsonb)
    ) INTO result
    FROM entry_stats es
    CROSS JOIN category_stats cs;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add constraints to improve data integrity
ALTER TABLE public.entries 
ADD CONSTRAINT chk_priority_range 
CHECK (priority >= 1 AND priority <= 5);

ALTER TABLE public.entries 
ADD CONSTRAINT chk_scheduled_for_future 
CHECK (scheduled_for IS NULL OR scheduled_for > created_at);

ALTER TABLE public.processing_queue 
ADD CONSTRAINT chk_retry_count_limit 
CHECK (retry_count >= 0 AND retry_count <= max_retries);

-- Add partial unique constraint to prevent duplicate pending tasks
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_unique_pending
ON public.processing_queue(entry_id, task_type)
WHERE status IN ('pending', 'processing');

-- Update table statistics for better query planning
ANALYZE public.entries;
ANALYZE public.processing_queue;
ANALYZE public.user_profiles;
ANALYZE public.categories;

-- Create materialized view for dashboard analytics (updated hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_analytics AS
SELECT 
    up.id as user_id,
    up.display_name,
    COUNT(e.id) as total_entries,
    COUNT(e.id) FILTER (WHERE e.status = 'inbox') as inbox_count,
    COUNT(e.id) FILTER (WHERE e.status = 'scheduled') as scheduled_count,
    COUNT(e.id) FILTER (WHERE e.status = 'completed') as completed_count,
    COUNT(e.id) FILTER (WHERE e.created_at >= NOW() - INTERVAL '30 days') as entries_last_30_days,
    AVG(COALESCE(e.estimated_read_time, 0)) as avg_read_time,
    COUNT(pq.id) as total_ai_tasks,
    COUNT(pq.id) FILTER (WHERE pq.status = 'completed') as completed_ai_tasks,
    EXTRACT(epoch FROM NOW())::bigint as last_updated_ts
FROM public.user_profiles up
LEFT JOIN public.entries e ON e.user_id = up.id
LEFT JOIN public.processing_queue pq ON pq.user_id = up.id
GROUP BY up.id, up.display_name;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id 
ON public.user_analytics(user_id);

-- Function to refresh analytics (called by cron)
CREATE OR REPLACE FUNCTION refresh_user_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON public.user_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_pending_tasks(integer) TO service_role;
GRANT EXECUTE ON FUNCTION complete_processing_task(uuid, jsonb, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION fail_processing_task(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_ai_processing(uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_entry_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_analytics() TO service_role;
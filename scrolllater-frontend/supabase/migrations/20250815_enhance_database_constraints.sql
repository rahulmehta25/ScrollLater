-- Enhanced Database Constraints and Relationships for ScrollLater
-- Adds missing constraints, improves referential integrity, and optimizes join operations

-- Add missing foreign key constraints and improve existing ones
-- Note: Some constraints may already exist, using IF NOT EXISTS where possible

-- Ensure proper referential integrity for entries table
-- Add constraint names for better management
ALTER TABLE public.entries 
DROP CONSTRAINT IF EXISTS fk_entries_user_id;

ALTER TABLE public.entries 
ADD CONSTRAINT fk_entries_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add constraint for processing_queue to entries relationship
ALTER TABLE public.processing_queue 
DROP CONSTRAINT IF EXISTS fk_processing_queue_entry_id;

ALTER TABLE public.processing_queue 
ADD CONSTRAINT fk_processing_queue_entry_id 
FOREIGN KEY (entry_id) REFERENCES public.entries(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add constraint for processing_queue to users relationship
ALTER TABLE public.processing_queue 
DROP CONSTRAINT IF EXISTS fk_processing_queue_user_id;

ALTER TABLE public.processing_queue 
ADD CONSTRAINT fk_processing_queue_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add constraint for user_profiles to users relationship
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_id;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT fk_user_profiles_id 
FOREIGN KEY (id) REFERENCES auth.users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add additional data integrity constraints

-- Ensure entry content is not empty
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_content_not_empty 
CHECK (LENGTH(TRIM(content)) > 0);

-- Ensure original_input is not empty
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_original_input_not_empty 
CHECK (LENGTH(TRIM(original_input)) > 0);

-- Ensure valid URLs (basic check)
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_url_format 
CHECK (url IS NULL OR url ~ '^https?://.*');

-- Ensure AI confidence score is between 0 and 1
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_ai_confidence_range 
CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 1));

-- Ensure estimated read time is positive
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_read_time_positive 
CHECK (estimated_read_time IS NULL OR estimated_read_time > 0);

-- Ensure scheduled_for is in the future when status is scheduled
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_scheduled_future 
CHECK (
  (status != 'scheduled') OR 
  (status = 'scheduled' AND scheduled_for > created_at)
);

-- Ensure completed_at is set when status is completed
ALTER TABLE public.entries 
ADD CONSTRAINT chk_entries_completed_consistency 
CHECK (
  (status != 'completed') OR 
  (status = 'completed' AND completed_at IS NOT NULL)
);

-- Processing queue constraints
-- Ensure processing time is positive
ALTER TABLE public.processing_queue 
ADD CONSTRAINT chk_processing_queue_time_positive 
CHECK (processing_time_ms IS NULL OR processing_time_ms > 0);

-- Ensure tokens used is positive
ALTER TABLE public.processing_queue 
ADD CONSTRAINT chk_processing_queue_tokens_positive 
CHECK (tokens_used IS NULL OR tokens_used > 0);

-- Ensure completed_at is set for completed/failed tasks
ALTER TABLE public.processing_queue 
ADD CONSTRAINT chk_processing_queue_completion_consistency 
CHECK (
  (status NOT IN ('completed', 'failed')) OR 
  (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
);

-- Ensure started_at is set for processing/completed/failed tasks
ALTER TABLE public.processing_queue 
ADD CONSTRAINT chk_processing_queue_started_consistency 
CHECK (
  (status = 'pending') OR 
  (status IN ('processing', 'completed', 'failed') AND started_at IS NOT NULL)
);

-- User profiles constraints
-- Ensure valid timezone format
ALTER TABLE public.user_profiles 
ADD CONSTRAINT chk_user_profiles_timezone_valid 
CHECK (timezone IS NULL OR LENGTH(timezone) > 0);

-- Ensure default block duration is reasonable
ALTER TABLE public.user_profiles 
ADD CONSTRAINT chk_user_profiles_block_duration_range 
CHECK (default_block_duration >= 15 AND default_block_duration <= 480); -- 15 minutes to 8 hours

-- Ensure counters are non-negative
ALTER TABLE public.user_profiles 
ADD CONSTRAINT chk_user_profiles_counters_positive 
CHECK (total_entries >= 0 AND total_scheduled >= 0);

-- Categories constraints
-- Ensure category name is not empty
ALTER TABLE public.categories 
ADD CONSTRAINT chk_categories_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);

-- Ensure valid color format (hex color)
ALTER TABLE public.categories 
ADD CONSTRAINT chk_categories_color_format 
CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Create optimized indexes for join operations
-- These indexes specifically optimize the common join patterns in the application

-- Index for entries to categories join (used in views and queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_category_join 
ON public.entries(COALESCE(user_category, ai_category)) 
WHERE COALESCE(user_category, ai_category) IS NOT NULL;

-- Index for processing_queue to entries join
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_entry_join 
ON public.processing_queue(entry_id, status);

-- Index for user_profiles to entries aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_aggregation 
ON public.entries(user_id, status, created_at) 
WHERE status IS NOT NULL;

-- Composite index for complex joins in dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_dashboard_join 
ON public.entries(user_id, status, COALESCE(user_category, ai_category), created_at DESC) 
WHERE status IN ('inbox', 'scheduled');

-- Create materialized view for optimized category statistics
-- This pre-computes category counts to avoid expensive joins
CREATE MATERIALIZED VIEW IF NOT EXISTS public.category_statistics AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    c.color,
    c.icon,
    COUNT(e.id) as entry_count,
    COUNT(e.id) FILTER (WHERE e.status = 'inbox') as inbox_count,
    COUNT(e.id) FILTER (WHERE e.status = 'scheduled') as scheduled_count,
    COUNT(e.id) FILTER (WHERE e.status = 'completed') as completed_count,
    AVG(e.estimated_read_time) as avg_read_time,
    MAX(e.updated_at) as last_entry_update
FROM public.categories c
LEFT JOIN public.entries e ON (c.name = e.user_category OR c.name = e.ai_category)
GROUP BY c.id, c.name, c.color, c.icon;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_category_statistics_name 
ON public.category_statistics(category_name);

CREATE INDEX IF NOT EXISTS idx_category_statistics_counts 
ON public.category_statistics(entry_count DESC, inbox_count DESC);

-- Create function to efficiently get user entries with category information
-- This function optimizes the common join between entries and categories
CREATE OR REPLACE FUNCTION public.get_user_entries_with_categories(
    p_user_id uuid,
    p_status text DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
) RETURNS TABLE (
    entry_id uuid,
    title text,
    content text,
    ai_summary text,
    category text,
    category_color text,
    category_icon text,
    status text,
    priority integer,
    created_at timestamptz,
    updated_at timestamptz,
    scheduled_for timestamptz,
    estimated_read_time integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as entry_id,
        e.title,
        e.content,
        e.ai_summary,
        COALESCE(e.user_category, e.ai_category) as category,
        c.color as category_color,
        c.icon as category_icon,
        e.status,
        e.priority,
        e.created_at,
        e.updated_at,
        e.scheduled_for,
        e.estimated_read_time
    FROM public.entries e
    LEFT JOIN public.categories c ON c.name = COALESCE(e.user_category, e.ai_category)
    WHERE e.user_id = p_user_id
    AND (p_status IS NULL OR e.status = p_status)
    ORDER BY e.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for efficient processing queue with entry details
CREATE OR REPLACE FUNCTION public.get_processing_queue_with_entries(
    p_user_id uuid DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_limit integer DEFAULT 50
) RETURNS TABLE (
    queue_id uuid,
    entry_id uuid,
    entry_title text,
    task_type text,
    status text,
    priority integer,
    created_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    processing_time_ms integer,
    error_message text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.id as queue_id,
        pq.entry_id,
        e.title as entry_title,
        pq.task_type,
        pq.status,
        pq.priority,
        pq.created_at,
        pq.started_at,
        pq.completed_at,
        pq.processing_time_ms,
        pq.error_message
    FROM public.processing_queue pq
    INNER JOIN public.entries e ON e.id = pq.entry_id
    WHERE (p_user_id IS NULL OR pq.user_id = p_user_id)
    AND (p_status IS NULL OR pq.status = p_status)
    ORDER BY pq.priority DESC, pq.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate referential integrity
CREATE OR REPLACE FUNCTION public.validate_data_integrity()
RETURNS TABLE (
    table_name text,
    issue_type text,
    issue_count bigint,
    description text
) AS $$
BEGIN
    -- Check for orphaned processing queue entries
    RETURN QUERY
    SELECT 
        'processing_queue'::text as table_name,
        'orphaned_entries'::text as issue_type,
        COUNT(*) as issue_count,
        'Processing queue entries without corresponding entries'::text as description
    FROM public.processing_queue pq
    LEFT JOIN public.entries e ON e.id = pq.entry_id
    WHERE e.id IS NULL
    HAVING COUNT(*) > 0;

    -- Check for entries without valid users
    RETURN QUERY
    SELECT 
        'entries'::text as table_name,
        'invalid_users'::text as issue_type,
        COUNT(*) as issue_count,
        'Entries referencing non-existent users'::text as description
    FROM public.entries e
    LEFT JOIN auth.users u ON u.id = e.user_id
    WHERE u.id IS NULL
    HAVING COUNT(*) > 0;

    -- Check for inconsistent status/timestamp combinations
    RETURN QUERY
    SELECT 
        'entries'::text as table_name,
        'status_timestamp_mismatch'::text as issue_type,
        COUNT(*) as issue_count,
        'Entries with completed status but no completed_at timestamp'::text as description
    FROM public.entries
    WHERE status = 'completed' AND completed_at IS NULL
    HAVING COUNT(*) > 0;

    -- Check for future scheduled dates in the past
    RETURN QUERY
    SELECT 
        'entries'::text as table_name,
        'past_scheduled_dates'::text as issue_type,
        COUNT(*) as issue_count,
        'Scheduled entries with dates in the past'::text as description
    FROM public.entries
    WHERE status = 'scheduled' AND scheduled_for < NOW()
    HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to fix common data integrity issues
CREATE OR REPLACE FUNCTION public.fix_data_integrity_issues()
RETURNS jsonb AS $$
DECLARE
    fixes_applied jsonb DEFAULT '{}';
    orphaned_count integer;
    past_scheduled_count integer;
BEGIN
    -- Fix orphaned processing queue entries
    DELETE FROM public.processing_queue
    WHERE entry_id NOT IN (SELECT id FROM public.entries);
    
    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    fixes_applied = jsonb_set(fixes_applied, '{orphaned_queue_entries}', to_jsonb(orphaned_count));

    -- Update past scheduled entries to inbox status
    UPDATE public.entries
    SET status = 'inbox', scheduled_for = NULL
    WHERE status = 'scheduled' AND scheduled_for < NOW();
    
    GET DIAGNOSTICS past_scheduled_count = ROW_COUNT;
    fixes_applied = jsonb_set(fixes_applied, '{past_scheduled_fixed}', to_jsonb(past_scheduled_count));

    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.category_statistics;
    
    fixes_applied = jsonb_set(fixes_applied, '{materialized_views_refreshed}', to_jsonb(true));

    RETURN fixes_applied;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.get_user_entries_with_categories(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_processing_queue_with_entries(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_data_integrity() TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_data_integrity_issues() TO service_role;

-- Grant permissions for materialized views
GRANT SELECT ON public.category_statistics TO authenticated;

-- Create trigger to automatically refresh category statistics
CREATE OR REPLACE FUNCTION refresh_category_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh asynchronously to avoid blocking the transaction
    PERFORM pg_notify('refresh_category_stats', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on entries changes that affect category statistics
CREATE TRIGGER refresh_category_stats_trigger
    AFTER INSERT OR UPDATE OF user_category, ai_category, status OR DELETE
    ON public.entries
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_category_statistics();

-- Create indexes specifically for constraint checking efficiency
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_constraint_checks 
ON public.entries(status, completed_at, scheduled_for) 
WHERE status IN ('completed', 'scheduled');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_constraint_checks 
ON public.processing_queue(status, started_at, completed_at) 
WHERE status IN ('processing', 'completed', 'failed');

-- Update table statistics for better query planning
ANALYZE public.entries;
ANALYZE public.processing_queue;
ANALYZE public.user_profiles;
ANALYZE public.categories;
ANALYZE public.category_statistics;

-- Create scheduled job to maintain data integrity (if using pg_cron)
-- This would typically be set up separately in production
/*
SELECT cron.schedule('integrity-check', '0 2 * * *', 'SELECT public.fix_data_integrity_issues();');
SELECT cron.schedule('refresh-stats', '*/30 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.category_statistics;');
*/
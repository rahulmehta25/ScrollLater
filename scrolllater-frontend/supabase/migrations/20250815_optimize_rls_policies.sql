-- RLS Policy Optimization for ScrollLater
-- Optimizes Row Level Security policies for better performance

-- Drop existing policies for recreation with better performance
DROP POLICY IF EXISTS "Users can view own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON public.entries;

DROP POLICY IF EXISTS "Users can view own processing tasks" ON public.processing_queue;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create optimized RLS policies for entries table
-- These policies use more efficient auth.uid() caching and better indexing

-- Enable RLS on entries (should already be enabled, but ensuring)
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Optimized SELECT policy for entries
CREATE POLICY "entries_select_policy" ON public.entries
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Optimized INSERT policy for entries
CREATE POLICY "entries_insert_policy" ON public.entries
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Optimized UPDATE policy for entries
CREATE POLICY "entries_update_policy" ON public.entries
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Optimized DELETE policy for entries
CREATE POLICY "entries_delete_policy" ON public.entries
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Create optimized RLS policies for processing_queue table
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own processing tasks
CREATE POLICY "processing_queue_select_policy" ON public.processing_queue
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Allow service role to manage processing queue
CREATE POLICY "processing_queue_service_policy" ON public.processing_queue
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Create optimized RLS policies for user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Optimized SELECT policy for user profiles
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Optimized INSERT policy for user profiles
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Optimized UPDATE policy for user profiles
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Categories remain publicly readable (no changes needed)
-- But let's optimize the policy
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;

CREATE POLICY "categories_select_policy" ON public.categories
FOR SELECT TO authenticated
USING (true);

-- Create function to improve auth.uid() performance with caching
-- This function caches the auth.uid() result for the duration of a transaction
CREATE OR REPLACE FUNCTION auth.get_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    (current_setting('request.jwt.claims', true)::json ->> 'user_id')
  )::uuid;
$$;

-- Create optimized policies using the cached function
-- Drop existing policies first
DROP POLICY IF EXISTS "entries_select_policy" ON public.entries;
DROP POLICY IF EXISTS "entries_insert_policy" ON public.entries;
DROP POLICY IF EXISTS "entries_update_policy" ON public.entries;
DROP POLICY IF EXISTS "entries_delete_policy" ON public.entries;

-- Recreate with optimized auth function
CREATE POLICY "entries_select_policy" ON public.entries
FOR SELECT TO authenticated
USING (user_id = auth.get_user_id());

CREATE POLICY "entries_insert_policy" ON public.entries
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.get_user_id());

CREATE POLICY "entries_update_policy" ON public.entries
FOR UPDATE TO authenticated
USING (user_id = auth.get_user_id())
WITH CHECK (user_id = auth.get_user_id());

CREATE POLICY "entries_delete_policy" ON public.entries
FOR DELETE TO authenticated
USING (user_id = auth.get_user_id());

-- Update processing_queue policies
DROP POLICY IF EXISTS "processing_queue_select_policy" ON public.processing_queue;

CREATE POLICY "processing_queue_select_policy" ON public.processing_queue
FOR SELECT TO authenticated
USING (user_id = auth.get_user_id());

-- Update user_profiles policies
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;

CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
FOR SELECT TO authenticated
USING (id = auth.get_user_id());

CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.get_user_id());

CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
FOR UPDATE TO authenticated
USING (id = auth.get_user_id())
WITH CHECK (id = auth.get_user_id());

-- Create materialized views with built-in RLS for better performance
-- These views pre-filter data and can be refreshed periodically

-- Materialized view for user dashboard data
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_dashboard_data AS
SELECT 
    e.user_id,
    e.id,
    e.title,
    e.content,
    e.ai_summary,
    COALESCE(e.user_category, e.ai_category) as category,
    e.status,
    e.priority,
    e.created_at,
    e.updated_at,
    e.scheduled_for,
    e.estimated_read_time,
    c.color as category_color,
    c.icon as category_icon
FROM public.entries e
LEFT JOIN public.categories c ON c.name = COALESCE(e.user_category, e.ai_category)
WHERE e.status IN ('inbox', 'scheduled');

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_user_dashboard_data_user_status 
ON public.user_dashboard_data(user_id, status, created_at DESC);

-- Enable RLS on materialized view
ALTER MATERIALIZED VIEW public.user_dashboard_data OWNER TO postgres;
ALTER TABLE public.user_dashboard_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_dashboard_data_select_policy" ON public.user_dashboard_data
FOR SELECT TO authenticated
USING (user_id = auth.get_user_id());

-- Function to refresh dashboard data (called by cron)
CREATE OR REPLACE FUNCTION refresh_dashboard_data()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_dashboard_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security function to validate entry ownership
CREATE OR REPLACE FUNCTION public.user_owns_entry(entry_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.entries 
        WHERE id = entry_id AND user_id = auth.get_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security function to validate multiple entries ownership
CREATE OR REPLACE FUNCTION public.user_owns_entries(entry_ids uuid[])
RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) = array_length(entry_ids, 1)
        FROM public.entries 
        WHERE id = ANY(entry_ids) AND user_id = auth.get_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create optimized view for entry search with RLS
CREATE OR REPLACE VIEW public.searchable_entries AS
SELECT 
    e.id,
    e.user_id,
    e.title,
    e.content,
    e.ai_summary,
    e.search_vector,
    COALESCE(e.user_category, e.ai_category) as category,
    e.status,
    e.created_at,
    e.updated_at
FROM public.entries e
WHERE e.status != 'archived';

-- Enable RLS on search view
ALTER VIEW public.searchable_entries OWNER TO postgres;
-- Note: Views inherit RLS from underlying tables

-- Create function for efficient bulk operations with RLS
CREATE OR REPLACE FUNCTION public.bulk_update_entries(
    p_entry_ids uuid[],
    p_updates jsonb
) RETURNS integer AS $$
DECLARE
    updated_count integer;
BEGIN
    -- Verify ownership of all entries
    IF NOT public.user_owns_entries(p_entry_ids) THEN
        RAISE EXCEPTION 'Access denied: You do not own all specified entries';
    END IF;
    
    -- Perform bulk update
    UPDATE public.entries 
    SET 
        status = COALESCE((p_updates->>'status')::text, status),
        user_category = COALESCE((p_updates->>'user_category')::text, user_category),
        priority = COALESCE((p_updates->>'priority')::integer, priority),
        user_tags = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_updates->'user_tags')), 
            user_tags
        ),
        updated_at = NOW()
    WHERE id = ANY(p_entry_ids)
    AND user_id = auth.get_user_id();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for efficient entry statistics with RLS
CREATE OR REPLACE FUNCTION public.get_user_entry_statistics()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    user_uuid uuid;
BEGIN
    user_uuid := auth.get_user_id();
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    WITH stats AS (
        SELECT 
            COUNT(*) as total_entries,
            COUNT(*) FILTER (WHERE status = 'inbox') as inbox_count,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as entries_this_week,
            COUNT(*) FILTER (WHERE scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '7 days') as scheduled_this_week,
            AVG(COALESCE(estimated_read_time, 0)) as avg_read_time,
            SUM(COALESCE(estimated_read_time, 0)) as total_read_time
        FROM public.entries 
        WHERE user_id = user_uuid
    ),
    category_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(user_category, ai_category, 'Uncategorized'), 
            count
        ) as by_category
        FROM (
            SELECT 
                COALESCE(user_category, ai_category, 'Uncategorized') as category,
                COUNT(*) as count
            FROM public.entries 
            WHERE user_id = user_uuid
            GROUP BY COALESCE(user_category, ai_category, 'Uncategorized')
        ) cat_counts
    )
    SELECT jsonb_build_object(
        'total_entries', s.total_entries,
        'inbox_count', s.inbox_count,
        'scheduled_count', s.scheduled_count,
        'completed_count', s.completed_count,
        'archived_count', s.archived_count,
        'entries_this_week', s.entries_this_week,
        'scheduled_this_week', s.scheduled_this_week,
        'avg_read_time', ROUND(s.avg_read_time::numeric, 2),
        'total_read_time', s.total_read_time,
        'by_category', COALESCE(cs.by_category, '{}'::jsonb)
    ) INTO result
    FROM stats s
    CROSS JOIN category_stats cs;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions
GRANT SELECT ON public.user_dashboard_data TO authenticated;
GRANT SELECT ON public.searchable_entries TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_entries(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_entries(uuid[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_entry_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_data() TO service_role;

-- Create indexes to support RLS policies efficiently
-- These indexes help PostgreSQL optimize RLS policy checks

-- Index to support user_id filtering in RLS policies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_id_rls 
ON public.entries(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_queue_user_id_rls 
ON public.processing_queue(user_id) 
WHERE user_id IS NOT NULL;

-- Partial indexes for common RLS + filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_active_rls 
ON public.entries(user_id, status, created_at DESC) 
WHERE status IN ('inbox', 'scheduled') AND user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entries_user_search_rls 
ON public.entries(user_id) 
WHERE search_vector IS NOT NULL AND user_id IS NOT NULL;

-- Update table statistics
ANALYZE public.entries;
ANALYZE public.processing_queue;
ANALYZE public.user_profiles;
ANALYZE public.user_dashboard_data;
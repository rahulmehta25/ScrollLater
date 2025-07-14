-- Full Database Schema for ScrollLater

-- Drop existing tables if they exist, for a clean slate
DROP TABLE IF EXISTS public.processing_queue CASCADE;
DROP TABLE IF EXISTS public.entry_summaries CASCADE;
DROP TABLE IF EXISTS public.user_dashboard_stats CASCADE;
DROP TABLE IF EXISTS public.entries CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- 1. user_profiles table
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    default_calendar_id TEXT,
    preferred_scheduling_times JSONB DEFAULT '[]',
    default_block_duration INTEGER DEFAULT 30,
    auto_schedule_enabled BOOLEAN DEFAULT false,
    google_calendar_connected BOOLEAN DEFAULT false,
    google_refresh_token TEXT,
    apple_shortcut_token TEXT,
    total_entries INTEGER DEFAULT 0,
    total_scheduled INTEGER DEFAULT 0
);

-- RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. categories table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_system BOOLEAN DEFAULT true
);

-- RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (true);

-- Insert default categories
INSERT INTO public.categories (name, description, color, icon, is_system) VALUES
    ('Read Later', 'Articles, blog posts, and content to read', '#3B82F6', '📖', true),
    ('Build', 'Development tools, tutorials, and project ideas', '#10B981', '🔨', true),
    ('Explore', 'Interesting tools, websites, and discoveries', '#8B5CF6', '🔍', true),
    ('Todo', 'Tasks and action items to complete', '#F59E0B', '✅', true),
    ('Schedule', 'Events and time-sensitive items', '#EF4444', '📅', true),
    ('Creative', 'Design inspiration and creative resources', '#EC4899', '🎨', true),
    ('Learning', 'Educational content and courses', '#06B6D4', '🎓', true),
    ('Business', 'Professional and business-related content', '#84CC16', '💼', true),
    ('Personal', 'Personal interests and hobbies', '#F97316', '👤', true);

-- 3. entries table
CREATE TABLE public.entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    url TEXT,
    title TEXT,
    content TEXT NOT NULL,
    original_input TEXT NOT NULL,
    ai_summary TEXT,
    ai_category TEXT,
    ai_tags TEXT[] DEFAULT '{}',
    ai_confidence_score DECIMAL(3,2),
    ai_schedule_suggestions JSONB, -- For smart scheduling
    user_category TEXT,
    user_tags TEXT[] DEFAULT '{}',
    user_notes TEXT,
    priority INTEGER DEFAULT 3,
    status TEXT DEFAULT 'inbox' CHECK (status IN ('inbox', 'scheduled', 'completed', 'archived')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    calendar_event_id TEXT,
    calendar_event_url TEXT,
    source TEXT DEFAULT 'web',
    metadata JSONB DEFAULT '{}',
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            COALESCE(title, '') || ' ' ||
            COALESCE(content, '') || ' ' ||
            COALESCE(ai_summary, '') || ' ' ||
            COALESCE(user_notes, '')
        )
    ) STORED
);

-- RLS for entries
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own entries" ON public.entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.entries FOR DELETE USING (auth.uid() = user_id);

-- Indexes for entries
CREATE INDEX idx_entries_user_id ON public.entries(user_id);
CREATE INDEX idx_entries_status ON public.entries(status);
CREATE INDEX idx_entries_scheduled_for ON public.entries(scheduled_for);
CREATE INDEX idx_entries_created_at ON public.entries(created_at DESC);
CREATE INDEX idx_entries_search ON public.entries USING GIN(search_vector);
CREATE INDEX idx_entries_ai_category ON public.entries(ai_category);
CREATE INDEX idx_entries_user_category ON public.entries(user_category);

-- 4. processing_queue table
CREATE TABLE public.processing_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    task_type TEXT NOT NULL CHECK (task_type IN ('summarize', 'categorize', 'schedule_suggest')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    ai_model_used TEXT,
    processing_time_ms INTEGER,
    tokens_used INTEGER
);

-- RLS for processing_queue
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own processing tasks" ON public.processing_queue FOR SELECT USING (auth.uid() = user_id);

-- Indexes for processing_queue
CREATE INDEX idx_processing_queue_status ON public.processing_queue(status);
CREATE INDEX idx_processing_queue_created_at ON public.processing_queue(created_at);
CREATE INDEX idx_processing_queue_entry_id ON public.processing_queue(entry_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON public.entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to queue AI processing for new entries
CREATE OR REPLACE FUNCTION public.queue_entry_processing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.processing_queue (entry_id, user_id, task_type, priority)
    VALUES (NEW.id, NEW.user_id, 'summarize', 5);
    
    INSERT INTO public.processing_queue (entry_id, user_id, task_type, priority)
    VALUES (NEW.id, NEW.user_id, 'categorize', 5);
    
    INSERT INTO public.processing_queue (entry_id, user_id, task_type, priority)
    VALUES (NEW.id, NEW.user_id, 'schedule_suggest', 3);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for entry processing
CREATE TRIGGER queue_entry_processing_trigger
    AFTER INSERT ON public.entries
    FOR EACH ROW EXECUTE FUNCTION public.queue_entry_processing();

-- Function to update user statistics
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.user_profiles SET total_entries = total_entries + 1 WHERE id = NEW.user_id;
        IF NEW.status = 'scheduled' THEN
            UPDATE public.user_profiles SET total_scheduled = total_scheduled + 1 WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
                UPDATE public.user_profiles SET total_scheduled = total_scheduled + 1 WHERE id = NEW.user_id;
            ELSIF OLD.status = 'scheduled' AND NEW.status != 'scheduled' THEN
                UPDATE public.user_profiles SET total_scheduled = total_scheduled - 1 WHERE id = NEW.user_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.user_profiles SET total_entries = total_entries - 1 WHERE id = OLD.user_id;
        IF OLD.status = 'scheduled' THEN
            UPDATE public.user_profiles SET total_scheduled = total_scheduled - 1 WHERE id = OLD.user_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for user stats
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.entries
    FOR EACH ROW EXECUTE FUNCTION public.update_user_stats();

-- View for entry summaries
CREATE OR REPLACE VIEW public.entry_summaries AS
SELECT 
    e.id,
    e.user_id,
    e.created_at,
    e.updated_at,
    e.title,
    e.url,
    SUBSTRING(e.content, 1, 200) || CASE WHEN LENGTH(e.content) > 200 THEN '...' ELSE '' END as content_preview,
    e.ai_summary,
    COALESCE(e.user_category, e.ai_category) as category,
    e.status,
    e.scheduled_for,
    e.priority,
    c.color as category_color,
    c.icon as category_icon,
    ARRAY_LENGTH(e.ai_tags, 1) + ARRAY_LENGTH(e.user_tags, 1) as tag_count
FROM public.entries e
LEFT JOIN public.categories c ON c.name = COALESCE(e.user_category, e.ai_category);

-- View for user dashboard stats
CREATE OR REPLACE VIEW public.user_dashboard_stats AS
SELECT 
    up.id as user_id,
    up.display_name,
    up.total_entries,
    up.total_scheduled,
    COUNT(CASE WHEN e.status = 'inbox' THEN 1 END) as inbox_count,
    COUNT(CASE WHEN e.status = 'scheduled' THEN 1 END) as scheduled_count,
    COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN e.status = 'archived' THEN 1 END) as archived_count,
    COUNT(CASE WHEN e.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as entries_this_week,
    COUNT(CASE WHEN e.scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as scheduled_this_week
FROM public.user_profiles up
LEFT JOIN public.entries e ON e.user_id = up.id
GROUP BY up.id, up.display_name, up.total_entries, up.total_scheduled;
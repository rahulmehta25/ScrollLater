-- Create AI processing queue table
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing details
    task_type TEXT NOT NULL CHECK (task_type IN ('summarize', 'categorize', 'schedule_suggest', 'batch_analyze')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Results and errors
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Model tracking
    model_used TEXT,
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- Unique constraint to prevent duplicate tasks
    CONSTRAINT unique_pending_task UNIQUE (entry_id, task_type, status)
);

-- Enable Row Level Security
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for processing queue
CREATE POLICY "Users can view own processing tasks" ON processing_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own processing tasks" ON processing_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update processing tasks" ON processing_queue
    FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_processing_queue_user_id ON processing_queue(user_id);
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_created_at ON processing_queue(created_at DESC);
CREATE INDEX idx_processing_queue_entry_id ON processing_queue(entry_id);
CREATE INDEX idx_processing_queue_pending ON processing_queue(status, priority DESC) WHERE status = 'pending';

-- Create function to enqueue AI processing tasks
CREATE OR REPLACE FUNCTION enqueue_ai_processing(
    p_entry_id UUID,
    p_user_id UUID,
    p_task_type TEXT,
    p_priority INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    -- Check if task already exists and is pending/processing
    SELECT id INTO v_queue_id
    FROM processing_queue
    WHERE entry_id = p_entry_id 
        AND task_type = p_task_type 
        AND status IN ('pending', 'processing')
    LIMIT 1;
    
    IF v_queue_id IS NOT NULL THEN
        RETURN v_queue_id;
    END IF;
    
    -- Insert new task
    INSERT INTO processing_queue (entry_id, user_id, task_type, priority)
    VALUES (p_entry_id, p_user_id, p_task_type, p_priority)
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get next pending task
CREATE OR REPLACE FUNCTION get_next_pending_task() 
RETURNS TABLE (
    id UUID,
    entry_id UUID,
    user_id UUID,
    task_type TEXT,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    UPDATE processing_queue
    SET status = 'processing',
        started_at = NOW()
    WHERE id = (
        SELECT id
        FROM processing_queue
        WHERE status = 'pending'
            AND retry_count < max_retries
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING processing_queue.id, 
              processing_queue.entry_id, 
              processing_queue.user_id, 
              processing_queue.task_type, 
              processing_queue.priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark task as completed
CREATE OR REPLACE FUNCTION complete_processing_task(
    p_task_id UUID,
    p_result JSONB,
    p_model_used TEXT DEFAULT NULL,
    p_tokens_used INTEGER DEFAULT NULL,
    p_processing_time_ms INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE processing_queue
    SET status = 'completed',
        completed_at = NOW(),
        result = p_result,
        model_used = p_model_used,
        tokens_used = p_tokens_used,
        processing_time_ms = p_processing_time_ms
    WHERE id = p_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark task as failed
CREATE OR REPLACE FUNCTION fail_processing_task(
    p_task_id UUID,
    p_error_message TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE processing_queue
    SET status = CASE 
            WHEN retry_count < max_retries THEN 'pending'
            ELSE 'failed'
        END,
        error_message = p_error_message,
        retry_count = retry_count + 1,
        completed_at = CASE 
            WHEN retry_count >= max_retries - 1 THEN NOW()
            ELSE NULL
        END
    WHERE id = p_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for processing queue statistics
CREATE OR REPLACE VIEW processing_queue_stats AS
SELECT 
    user_id,
    task_type,
    status,
    COUNT(*) as count,
    AVG(processing_time_ms) as avg_processing_time_ms,
    SUM(tokens_used) as total_tokens_used,
    COUNT(DISTINCT model_used) as models_used_count
FROM processing_queue
GROUP BY user_id, task_type, status;

-- Grant access to the view
GRANT SELECT ON processing_queue_stats TO authenticated;
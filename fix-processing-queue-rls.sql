-- Fix RLS policies for processing_queue table
-- The table currently only has SELECT policy but needs INSERT and UPDATE policies
-- for the database triggers and edge functions to work properly

-- Add INSERT policy for processing_queue
CREATE POLICY "Users can insert own processing tasks" ON public.processing_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for processing_queue  
CREATE POLICY "Users can update own processing tasks" ON public.processing_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- Also add DELETE policy for completeness
CREATE POLICY "Users can delete own processing tasks" ON public.processing_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'processing_queue' AND schemaname = 'public'; 
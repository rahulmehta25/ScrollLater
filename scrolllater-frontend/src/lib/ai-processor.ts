// src/lib/ai-processor.ts
import { createSupabaseClient } from './supabase'

/**
 * Triggers the AI summarization and categorization process for a given entry.
 * This function invokes the 'ai-summarize' Supabase Edge Function.
 * @param entryId - The ID of the entry to process.
 * @param content - The content of the entry to be summarized.
 * @param url - The optional URL associated with the entry.
 */
export const processEntryWithAI = async (entryId: string, content: string, url?: string) => {
  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User is not authenticated.');
  }

  const { data, error } = await supabase.functions.invoke('ai-summarize', {
    body: { entryId, content, url },
  });

  if (error) {
    console.error('Error invoking ai-summarize function:', error);
    throw error;
  }

  return data;
};

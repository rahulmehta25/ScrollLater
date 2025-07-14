// src/lib/smart-scheduler.ts
import { createSupabaseClient } from './supabase';

/**
 * Triggers the AI-powered scheduling suggestion process for an entry.
 * This function invokes the 'ai-schedule-suggest' Supabase Edge Function.
 * @param entryId - The ID of the entry for which to generate suggestions.
 */
export const getScheduleSuggestions = async (entryId: string) => {
  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User is not authenticated.');
  }

  const { data, error } = await supabase.functions.invoke('ai-schedule-suggest', {
    body: { entryId },
  });

  if (error) {
    console.error('Error invoking ai-schedule-suggest function:', error);
    throw error;
  }

  return data;
};

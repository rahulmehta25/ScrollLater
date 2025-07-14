// supabase/functions/ai-summarize/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '* ',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SummarizeRequest {
  entryId: string;
  content: string;
  url?: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    }
  }>;
  usage: {
    total_tokens: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the authorization header and verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { entryId, content, url }: SummarizeRequest = await req.json()

    // Prepare the prompt for AI summarization
    const prompt = `
    Please analyze the following content and provide:
    1. A concise title (max 60 characters)
    2. A brief summary (max 150 words)
    3. A category from: Read Later, Build, Explore, Todo, Schedule, Creative, Learning, Business, Personal
    4. 3-5 relevant tags
    5. A confidence score (0-1) for the categorization

    Content: ${content}
    ${url ? `URL: ${url}` : ''}

    Respond in JSON format:
    {
      "title": "Generated title",
      "summary": "Brief summary",
      "category": "Category name",
      "tags": ["tag1", "tag2", "tag3"],
      "confidence": 0.85
    }
    `;

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scrolllater.app', // Replace with your app's URL
        'X-Title': 'ScrollLater'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${await openRouterResponse.text()}`)
    }

    const aiResponse: OpenRouterResponse = await openRouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content

    if (!aiContent) {
      throw new Error('No content received from AI')
    }

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent)
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      parsedResponse = {
        title: content.substring(0, 60),
        summary: content.substring(0, 150),
        category: 'Explore',
        tags: ['uncategorized'],
        confidence: 0.5
      }
    }

    // Update the entry in the database
    const { error: updateError } = await supabaseClient
      .from('entries')
      .update({
        title: parsedResponse.title,
        ai_summary: parsedResponse.summary,
        ai_category: parsedResponse.category,
        ai_tags: parsedResponse.tags,
        ai_confidence_score: parsedResponse.confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`)
    }

    // Update processing queue
    await supabaseClient
      .from('processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: parsedResponse,
        ai_model_used: 'anthropic/claude-3-haiku',
        tokens_used: aiResponse.usage?.total_tokens || 0
      })
      .eq('entry_id', entryId)
      .eq('task_type', 'summarize')

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: parsedResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in ai-summarize function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

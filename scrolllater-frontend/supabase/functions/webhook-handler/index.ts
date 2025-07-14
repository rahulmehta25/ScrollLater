// supabase/functions/webhook-handler/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '* ',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookRequest {
  content: string;
  url?: string;
  source: string;
  userToken: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { content, url, source, userToken }: WebhookRequest = await req.json()

    // Validate required fields
    if (!content || !userToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content and userToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find user by shortcut token
    const { data: userProfile, error: userError } = await supabaseClient
      .from('user_profiles')
      .select('id')
      .eq('apple_shortcut_token', userToken)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new entry
    const { data: newEntry, error: insertError } = await supabaseClient
      .from('entries')
      .insert({
        user_id: userProfile.id,
        content: content,
        original_input: content,
        url: url || null,
        source: source || 'shortcut',
        status: 'inbox'
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create entry: ${insertError.message}`)
    }

    // The trigger on the 'entries' table will automatically queue this for processing

    return new Response(
      JSON.stringify({ 
        success: true, 
        entryId: newEntry.id,
        message: 'Entry created and queued for processing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in webhook-handler:', error)
    
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

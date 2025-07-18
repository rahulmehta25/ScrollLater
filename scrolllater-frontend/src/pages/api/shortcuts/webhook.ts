import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

interface ShortcutRequest {
  content: string
  url?: string
  source: string
  shortcutToken: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('DEBUG: API/shortcuts/webhook NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { content, url, source, shortcutToken }: ShortcutRequest = req.body

    // Validate required fields
    if (!content || !shortcutToken) {
      return res.status(400).json({ 
        error: 'Missing required fields: content and shortcutToken' 
      })
    }

    // Find user by shortcut token
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('apple_shortcut_token', shortcutToken)
      .single()

    if (userError || !userProfile) {
      return res.status(401).json({ error: 'Invalid shortcut token' })
    }

    // Create new entry
    const { data: newEntry, error: insertError } = await supabase
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
      console.error('Failed to create entry:', insertError)
      return res.status(500).json({ error: 'Failed to create entry' })
    }

    // Trigger AI analysis in the background
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          entryId: newEntry.id,
          content: content,
          url: url
        })
      })

      if (!aiResponse.ok) {
        console.error('AI analysis failed:', await aiResponse.text())
      }
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
      // Don't fail the webhook if AI analysis fails
    }

    return res.status(200).json({
      success: true,
      entryId: newEntry.id,
      message: 'Entry created successfully'
    })

  } catch (error) {
    console.error('Error in shortcuts webhook:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
} 
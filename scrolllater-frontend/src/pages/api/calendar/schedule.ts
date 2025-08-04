import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Use the regular Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Extract access token from cookies or headers
  const token = req.cookies['sb-access-token'] || req.headers['authorization']?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    entryId,
    title,
    description,
    startTime,
    duration
  } = req.body

  if (!entryId || !title || !startTime || !duration) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Get user from token
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Extract the user's access token from the incoming request
    const userToken = req.headers['authorization']?.replace('Bearer ', '');

    if (!userToken) {
      return res.status(401).json({ error: 'Unauthorized: No user token' });
    }

    // Call the Edge Function with the user's token
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calendar-integration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entryId,
        title,
        description,
        startTime,
        duration,
        userId: user.id
      })
    });

    const data = await response.json()
    if (!response.ok) {
      console.error('Edge Function calendar-integration error:', {
        status: response.status,
        body: data,
        entryId,
        title,
        description,
        startTime,
        duration,
        userId: user.id
      })
      return res.status(response.status).json({ error: data.error || 'Failed to schedule event', details: data })
    }

    return res.status(200).json({
      eventId: data.eventId,
      eventUrl: data.eventUrl
    })
  } catch (error) {
    console.error('API route /api/calendar/schedule unexpected error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' })
  }
} 
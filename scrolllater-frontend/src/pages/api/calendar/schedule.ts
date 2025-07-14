import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createPagesServerClient({ req, res })
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

  // Get user session
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Call the Supabase Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calendar-integration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entryId,
        title,
        description,
        startTime,
        duration
      })
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Failed to schedule event' })
    }

    return res.status(200).json({
      eventId: data.eventId,
      eventUrl: data.eventUrl
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 
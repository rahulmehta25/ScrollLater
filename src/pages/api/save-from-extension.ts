import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ExtensionSaveRequest {
  url: string
  title: string
  content?: string
  original_input?: string
  source?: string
  priority?: number
  user_notes?: string | null
  user_tags?: string[]
  metadata?: {
    favicon?: string
    image?: string
    author?: string
    publishedDate?: string
    readingTime?: number
    siteName?: string
    pageType?: string
  }
}

interface ApiResponse {
  success: boolean
  data?: {
    id: string
    title: string
    url: string
  }
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // CORS headers for extension
  const origin = req.headers.origin || '';
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || 'https://scrolllater.vercel.app'];
  if (allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Get authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization required' })
  }

  const token = authHeader.substring(7)

  try {
    // Create Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }

    const body: ExtensionSaveRequest = req.body

    // Validate required fields
    if (!body.url && !body.content) {
      return res.status(400).json({ success: false, error: 'URL or content is required' })
    }

    // Prepare entry data
    const entryData = {
      user_id: user.id,
      url: body.url || null,
      title: body.title || body.url || 'Untitled',
      content: body.content || body.title || body.url || '',
      original_input: body.original_input || body.url || body.content || '',
      source: body.source || 'browser_extension',
      priority: body.priority || 3,
      user_notes: body.user_notes || null,
      user_tags: body.user_tags || [],
      status: 'inbox' as const,
      metadata: {
        ...body.metadata,
        saved_from: 'browser_extension',
        saved_at: new Date().toISOString(),
      },
    }

    // Insert entry
    const { data: entry, error: insertError } = await supabase
      .from('entries')
      .insert(entryData)
      .select('id, title, url')
      .single()

    if (insertError) {
      console.error('Error inserting entry:', insertError)
      return res.status(500).json({ success: false, error: 'Failed to save entry' })
    }

    return res.status(201).json({
      success: true,
      data: {
        id: entry.id,
        title: entry.title,
        url: entry.url,
      },
    })
  } catch (error) {
    console.error('Extension save error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

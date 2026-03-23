import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
}

const PAGE_SIZE = 1000

const CSV_HEADERS = [
  'id', 'title', 'url', 'content', 'status', 'priority',
  'ai_category', 'user_category', 'ai_summary', 'user_notes',
  'scheduled_for', 'created_at', 'updated_at'
]

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = authHeader.substring(7)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { format = 'json' } = req.body || {}
  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({ error: 'Format must be "json" or "csv"' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const timestamp = new Date().toISOString().split('T')[0]
  const ext = format === 'csv' ? 'csv' : 'json'
  const contentType = format === 'csv' ? 'text/csv' : 'application/json'

  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="scrolllater-export-${timestamp}.${ext}"`)

  try {
    if (format === 'json') {
      res.write('[')
      let page = 0
      let hasMore = true
      let isFirst = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) { hasMore = false; break }

        for (const entry of data) {
          if (!isFirst) res.write(',')
          res.write(JSON.stringify(entry))
          isFirst = false
        }

        hasMore = data.length === PAGE_SIZE
        page++
      }

      res.write(']')
    } else {
      res.write(CSV_HEADERS.join(',') + '\n')
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) { hasMore = false; break }

        for (const entry of data) {
          const row = CSV_HEADERS.map(h => escapeCsvValue((entry as Record<string, unknown>)[h]))
          res.write(row.join(',') + '\n')
        }

        hasMore = data.length === PAGE_SIZE
        page++
      }
    }

    res.end()
  } catch (err) {
    console.error('Export error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    } else {
      res.end()
    }
  }
}

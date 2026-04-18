import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ImportResponse {
  imported?: number
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { feedUrl } = req.body

  if (!feedUrl) {
    return res.status(400).json({ error: 'Feed URL is required' })
  }

  // Get user from auth header
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Fetch and parse the feed
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'ScrollLater RSS Reader/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch feed' })
    }

    const xmlText = await response.text()
    const items = extractFeedItems(xmlText)

    if (items.length === 0) {
      return res.status(200).json({ imported: 0 })
    }

    // Get existing entries to avoid duplicates
    const urls = items.map(item => item.link).filter(Boolean)
    const { data: existingEntries } = await supabase
      .from('entries')
      .select('url')
      .eq('user_id', user.id)
      .in('url', urls)

    const existingUrls = new Set(existingEntries?.map(e => e.url) || [])

    // Filter out duplicates and prepare new entries
    const newEntries = items
      .filter(item => item.link && !existingUrls.has(item.link))
      .slice(0, 10) // Limit to 10 items per import
      .map(item => ({
        user_id: user.id,
        url: item.link,
        title: item.title,
        content: item.description || item.title,
        original_input: item.link,
        source: 'rss_feed',
        status: 'inbox' as const,
        metadata: {
          feed_url: feedUrl,
          pub_date: item.pubDate,
          imported_at: new Date().toISOString(),
        },
      }))

    if (newEntries.length === 0) {
      return res.status(200).json({ imported: 0 })
    }

    // Insert new entries
    const { error: insertError } = await supabase
      .from('entries')
      .insert(newEntries)

    if (insertError) {
      console.error('Failed to insert RSS entries:', insertError)
      return res.status(500).json({ error: 'Failed to import entries' })
    }

    return res.status(200).json({ imported: newEntries.length })
  } catch (error) {
    console.error('RSS import error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

interface FeedItem {
  title: string
  link: string
  description?: string
  pubDate?: string
}

function extractFeedItems(xmlString: string): FeedItem[] {
  const items: FeedItem[] = []

  // Try RSS format
  const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match

  while ((match = rssItemRegex.exec(xmlString)) !== null && items.length < 20) {
    const itemContent = match[1]
    items.push({
      title: extractTag(itemContent, 'title') || 'Untitled',
      link: extractTag(itemContent, 'link') || '',
      description: extractTag(itemContent, 'description'),
      pubDate: extractTag(itemContent, 'pubDate'),
    })
  }

  // Try Atom format if no RSS items found
  if (items.length === 0) {
    const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi

    while ((match = atomEntryRegex.exec(xmlString)) !== null && items.length < 20) {
      const entryContent = match[1]
      items.push({
        title: extractTag(entryContent, 'title') || 'Untitled',
        link: extractLinkHref(entryContent) || '',
        description: extractTag(entryContent, 'summary'),
        pubDate: extractTag(entryContent, 'published') || extractTag(entryContent, 'updated'),
      })
    }
  }

  return items
}

function extractTag(content: string, tag: string): string | undefined {
  const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return undefined

  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function extractLinkHref(content: string): string | undefined {
  // Try rel="alternate" first
  let match = content.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
  if (match) return match[1]

  // Fall back to any link
  match = content.match(/<link[^>]*href=["']([^"']+)["']/i)
  return match ? match[1] : undefined
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

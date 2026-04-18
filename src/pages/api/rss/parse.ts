import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

function isPrivateUrl(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return true
  // 10.x.x.x
  if (/^10\./.test(hostname)) return true
  // 172.16-31.x.x
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
  // 192.168.x.x
  if (/^192\.168\./.test(hostname)) return true
  // 169.254.x.x (link-local)
  if (/^169\.254\./.test(hostname)) return true
  return false
}

interface RSSParseResponse {
  title?: string
  description?: string
  link?: string
  image?: string
  items?: Array<{
    title: string
    link: string
    description?: string
    pubDate?: string
  }>
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RSSParseResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authenticate user
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    // Validate URL
    const feedUrl = new URL(url)

    // Reject private/internal URLs (SSRF protection)
    if (isPrivateUrl(feedUrl.hostname)) {
      return res.status(400).json({ error: 'Invalid feed URL' })
    }

    // Fetch the feed
    const response = await fetch(feedUrl.toString(), {
      headers: {
        'User-Agent': 'ScrollLater RSS Reader/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    })

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch feed' })
    }

    const xmlText = await response.text()

    // Parse the feed
    const feed = parseRSSFeed(xmlText)

    if (!feed) {
      return res.status(400).json({ error: 'Invalid RSS/Atom feed' })
    }

    return res.status(200).json(feed)
  } catch (error) {
    console.error('RSS parse error:', error)
    return res.status(400).json({ error: 'Failed to parse feed URL' })
  }
}

// Simple RSS/Atom parser
function parseRSSFeed(xmlString: string): RSSParseResponse | null {
  // Check if it's RSS
  const rssMatch = xmlString.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i)
  if (rssMatch) {
    return parseRSSChannel(rssMatch[1])
  }

  // Check if it's Atom
  const atomMatch = xmlString.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i)
  if (atomMatch) {
    return parseAtomFeed(atomMatch[0])
  }

  return null
}

function parseRSSChannel(channelContent: string): RSSParseResponse {
  const getTagContent = (content: string, tag: string): string | undefined => {
    const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return match ? cleanHtml(match[1]) : undefined
  }

  const title = getTagContent(channelContent, 'title')
  const description = getTagContent(channelContent, 'description')
  const link = getTagContent(channelContent, 'link')

  // Get image from various sources
  const imageMatch = channelContent.match(/<image[^>]*>[\s\S]*?<url>([^<]+)<\/url>/i)
  const image = imageMatch ? imageMatch[1].trim() : undefined

  // Parse items
  const items: RSSParseResponse['items'] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let itemMatch

  while ((itemMatch = itemRegex.exec(channelContent)) !== null && items.length < 20) {
    const itemContent = itemMatch[1]
    items.push({
      title: getTagContent(itemContent, 'title') || 'Untitled',
      link: getTagContent(itemContent, 'link') || '',
      description: getTagContent(itemContent, 'description'),
      pubDate: getTagContent(itemContent, 'pubDate'),
    })
  }

  return { title, description, link, image, items }
}

function parseAtomFeed(feedContent: string): RSSParseResponse {
  const getTagContent = (content: string, tag: string): string | undefined => {
    const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return match ? cleanHtml(match[1]) : undefined
  }

  const getLinkHref = (content: string, rel?: string): string | undefined => {
    const pattern = rel
      ? new RegExp(`<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']+)["']`, 'i')
      : new RegExp(`<link[^>]*href=["']([^"']+)["']`, 'i')
    const match = content.match(pattern)
    return match ? match[1] : undefined
  }

  const title = getTagContent(feedContent, 'title')
  const description = getTagContent(feedContent, 'subtitle')
  const link = getLinkHref(feedContent, 'alternate') || getLinkHref(feedContent)
  const image = getTagContent(feedContent, 'logo') || getTagContent(feedContent, 'icon')

  // Parse entries
  const items: RSSParseResponse['items'] = []
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
  let entryMatch

  while ((entryMatch = entryRegex.exec(feedContent)) !== null && items.length < 20) {
    const entryContent = entryMatch[1]
    items.push({
      title: getTagContent(entryContent, 'title') || 'Untitled',
      link: getLinkHref(entryContent, 'alternate') || getLinkHref(entryContent) || '',
      description: getTagContent(entryContent, 'summary'),
      pubDate: getTagContent(entryContent, 'published') || getTagContent(entryContent, 'updated'),
    })
  }

  return { title, description, link, image, items }
}

function cleanHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// RSS Feed Parser for ScrollLater

export interface RSSFeed {
  title: string
  description?: string
  link: string
  image?: string
  items: RSSItem[]
}

export interface RSSItem {
  title: string
  link: string
  description?: string
  content?: string
  pubDate?: string
  author?: string
  categories?: string[]
  guid?: string
  image?: string
}

// Parse RSS/Atom feed from XML string
export function parseRSSFeed(xmlString: string): RSSFeed | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Check for parse errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      console.error('XML parse error:', parseError.textContent)
      return null
    }

    // Detect feed type (RSS or Atom)
    const isAtom = doc.querySelector('feed') !== null
    const isRSS = doc.querySelector('rss') !== null || doc.querySelector('channel') !== null

    if (isAtom) {
      return parseAtomFeed(doc)
    } else if (isRSS) {
      return parseRSSv2Feed(doc)
    }

    return null
  } catch (error) {
    console.error('Failed to parse feed:', error)
    return null
  }
}

// Parse RSS 2.0 feed
function parseRSSv2Feed(doc: Document): RSSFeed {
  const channel = doc.querySelector('channel')
  if (!channel) throw new Error('Invalid RSS feed')

  const items: RSSItem[] = []
  const itemElements = channel.querySelectorAll('item')

  itemElements.forEach((item) => {
    const enclosure = item.querySelector('enclosure')
    const mediaContent = item.querySelector('media\\:content, content')

    items.push({
      title: getElementText(item, 'title') || 'Untitled',
      link: getElementText(item, 'link') || '',
      description: getElementText(item, 'description'),
      content: getElementText(item, 'content\\:encoded') || getElementText(item, 'content'),
      pubDate: getElementText(item, 'pubDate'),
      author: getElementText(item, 'author') || getElementText(item, 'dc\\:creator'),
      categories: Array.from(item.querySelectorAll('category')).map(c => c.textContent || ''),
      guid: getElementText(item, 'guid'),
      image: enclosure?.getAttribute('url') ?? mediaContent?.getAttribute('url') ?? undefined,
    })
  })

  return {
    title: getElementText(channel, 'title') || 'Untitled Feed',
    description: getElementText(channel, 'description'),
    link: getElementText(channel, 'link') || '',
    image: getElementText(channel, 'image url') || channel.querySelector('image')?.querySelector('url')?.textContent || undefined,
    items,
  }
}

// Parse Atom feed
function parseAtomFeed(doc: Document): RSSFeed {
  const feed = doc.querySelector('feed')
  if (!feed) throw new Error('Invalid Atom feed')

  const items: RSSItem[] = []
  const entryElements = feed.querySelectorAll('entry')

  entryElements.forEach((entry) => {
    const link = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link')

    items.push({
      title: getElementText(entry, 'title') || 'Untitled',
      link: link?.getAttribute('href') || '',
      description: getElementText(entry, 'summary'),
      content: getElementText(entry, 'content'),
      pubDate: getElementText(entry, 'published') || getElementText(entry, 'updated'),
      author: getElementText(entry, 'author name'),
      categories: Array.from(entry.querySelectorAll('category')).map(c => c.getAttribute('term') || ''),
      guid: getElementText(entry, 'id'),
    })
  })

  const feedLink = feed.querySelector('link[rel="alternate"]') || feed.querySelector('link')

  return {
    title: getElementText(feed, 'title') || 'Untitled Feed',
    description: getElementText(feed, 'subtitle'),
    link: feedLink?.getAttribute('href') || '',
    image: feed.querySelector('logo')?.textContent || feed.querySelector('icon')?.textContent || undefined,
    items,
  }
}

// Helper to get text content of an element
function getElementText(parent: Element, selector: string): string | undefined {
  const element = parent.querySelector(selector)
  return element?.textContent?.trim() || undefined
}

// Validate if a URL is a valid RSS feed URL
export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

// Extract feed URLs from a webpage (autodiscovery)
export function extractFeedUrls(html: string, baseUrl: string): string[] {
  const feeds: string[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Look for link elements with type="application/rss+xml" or "application/atom+xml"
  const feedLinks = doc.querySelectorAll(
    'link[type="application/rss+xml"], link[type="application/atom+xml"]'
  )

  feedLinks.forEach((link) => {
    const href = link.getAttribute('href')
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).toString()
        feeds.push(absoluteUrl)
      } catch {
        // Invalid URL, skip
      }
    }
  })

  return feeds
}

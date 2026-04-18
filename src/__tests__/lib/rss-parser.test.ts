import { describe, it, expect } from 'vitest'
import { parseRSSFeed, isValidFeedUrl, extractFeedUrls } from '@/lib/rss-parser'

// --- Fixtures ---

const RSS2_BASIC = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    <item>
      <title>Article One</title>
      <link>https://example.com/article-1</link>
      <description>Summary of article one</description>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <guid>https://example.com/article-1</guid>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/article-2</link>
      <description>Summary of article two</description>
    </item>
  </channel>
</rss>`

const RSS2_RICH = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Rich Feed</title>
    <link>https://richfeed.com</link>
    <description>Rich RSS feed</description>
    <image>
      <url>https://richfeed.com/logo.png</url>
      <title>Rich Feed</title>
    </image>
    <item>
      <title>Rich Article</title>
      <link>https://richfeed.com/rich-article</link>
      <description>Short description</description>
      <content:encoded><![CDATA[<p>Full HTML content here</p>]]></content:encoded>
      <pubDate>Tue, 02 Jan 2024 12:00:00 GMT</pubDate>
      <author>author@richfeed.com</author>
      <category>Technology</category>
      <category>News</category>
      <guid isPermaLink="true">https://richfeed.com/rich-article</guid>
      <enclosure url="https://richfeed.com/image.jpg" type="image/jpeg" length="12345"/>
    </item>
  </channel>
</rss>`

const RSS2_EMPTY_CHANNEL = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
    <link>https://empty.com</link>
    <description>No items here</description>
  </channel>
</rss>`

const ATOM_BASIC = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Test Feed</title>
  <subtitle>An Atom feed for testing</subtitle>
  <link rel="alternate" href="https://atom.example.com"/>
  <id>https://atom.example.com/feed</id>
  <updated>2024-01-01T00:00:00Z</updated>
  <entry>
    <title>Atom Entry One</title>
    <link rel="alternate" href="https://atom.example.com/entry-1"/>
    <id>https://atom.example.com/entry-1</id>
    <published>2024-01-01T10:00:00Z</published>
    <updated>2024-01-02T10:00:00Z</updated>
    <summary>Summary of atom entry one</summary>
    <content>Full content of atom entry one</content>
    <author>
      <name>Jane Doe</name>
    </author>
    <category term="Programming"/>
    <category term="Open Source"/>
  </entry>
  <entry>
    <title>Atom Entry Two</title>
    <link href="https://atom.example.com/entry-2"/>
    <id>https://atom.example.com/entry-2</id>
    <updated>2024-01-03T00:00:00Z</updated>
    <summary>Second entry summary</summary>
  </entry>
</feed>`

const ATOM_WITH_LOGO = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Logo Feed</title>
  <link href="https://logo.example.com"/>
  <logo>https://logo.example.com/logo.png</logo>
  <id>https://logo.example.com/feed</id>
</feed>`

const MALFORMED_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Bad Feed</title>
    <unclosed>`

const NOT_FEED_XML = `<?xml version="1.0"?>
<document>
  <section>Some document</section>
</document>`

// --- Tests ---

describe('parseRSSFeed', () => {
  describe('RSS 2.0', () => {
    it('parses a valid RSS 2.0 feed and returns feed metadata', () => {
      const feed = parseRSSFeed(RSS2_BASIC)
      expect(feed).not.toBeNull()
      expect(feed!.title).toBe('Test Feed')
      expect(feed!.link).toBe('https://example.com')
      expect(feed!.description).toBe('A test RSS feed')
    })

    it('returns the correct number of items', () => {
      const feed = parseRSSFeed(RSS2_BASIC)
      expect(feed!.items).toHaveLength(2)
    })

    it('extracts title, link, description, pubDate, and guid from items', () => {
      const feed = parseRSSFeed(RSS2_BASIC)
      const item = feed!.items[0]
      expect(item.title).toBe('Article One')
      expect(item.link).toBe('https://example.com/article-1')
      expect(item.description).toBe('Summary of article one')
      expect(item.pubDate).toBe('Mon, 01 Jan 2024 00:00:00 GMT')
      expect(item.guid).toBe('https://example.com/article-1')
    })

    it('falls back to "Untitled" for items without a title', () => {
      const xml = `<?xml version="1.0"?>
      <rss version="2.0"><channel><title>F</title><link>https://x.com</link>
        <item><link>https://x.com/1</link></item>
      </channel></rss>`
      const feed = parseRSSFeed(xml)
      expect(feed!.items[0].title).toBe('Untitled')
    })

    it('extracts content:encoded from items', () => {
      const feed = parseRSSFeed(RSS2_RICH)
      expect(feed!.items[0].content).toBe('<p>Full HTML content here</p>')
    })

    it('extracts categories as an array', () => {
      const feed = parseRSSFeed(RSS2_RICH)
      expect(feed!.items[0].categories).toEqual(['Technology', 'News'])
    })

    it('extracts enclosure URL as image', () => {
      const feed = parseRSSFeed(RSS2_RICH)
      expect(feed!.items[0].image).toBe('https://richfeed.com/image.jpg')
    })

    it('returns an empty items array for a channel with no items', () => {
      const feed = parseRSSFeed(RSS2_EMPTY_CHANNEL)
      expect(feed).not.toBeNull()
      expect(feed!.items).toHaveLength(0)
    })

    it('extracts channel image URL', () => {
      const feed = parseRSSFeed(RSS2_RICH)
      expect(feed!.image).toBe('https://richfeed.com/logo.png')
    })
  })

  describe('Atom', () => {
    it('parses a valid Atom feed and returns feed metadata', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      expect(feed).not.toBeNull()
      expect(feed!.title).toBe('Atom Test Feed')
      expect(feed!.description).toBe('An Atom feed for testing')
      expect(feed!.link).toBe('https://atom.example.com')
    })

    it('returns the correct number of entries', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      expect(feed!.items).toHaveLength(2)
    })

    it('extracts title, link, summary, content, published, and guid from entries', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      const entry = feed!.items[0]
      expect(entry.title).toBe('Atom Entry One')
      expect(entry.link).toBe('https://atom.example.com/entry-1')
      expect(entry.description).toBe('Summary of atom entry one')
      expect(entry.content).toBe('Full content of atom entry one')
      expect(entry.pubDate).toBe('2024-01-01T10:00:00Z')
      expect(entry.guid).toBe('https://atom.example.com/entry-1')
    })

    it('extracts author name from Atom entries', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      expect(feed!.items[0].author).toBe('Jane Doe')
    })

    it('extracts categories via the term attribute', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      expect(feed!.items[0].categories).toEqual(['Programming', 'Open Source'])
    })

    it('falls back to link[href] when rel="alternate" is absent', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      expect(feed!.items[1].link).toBe('https://atom.example.com/entry-2')
    })

    it('falls back to updated when published is absent', () => {
      const feed = parseRSSFeed(ATOM_BASIC)
      expect(feed!.items[1].pubDate).toBe('2024-01-03T00:00:00Z')
    })

    it('extracts logo as feed image', () => {
      const feed = parseRSSFeed(ATOM_WITH_LOGO)
      expect(feed!.image).toBe('https://logo.example.com/logo.png')
    })
  })

  describe('error handling', () => {
    it('returns null for malformed XML', () => {
      const feed = parseRSSFeed(MALFORMED_XML)
      expect(feed).toBeNull()
    })

    it('returns null for XML that is not RSS or Atom', () => {
      const feed = parseRSSFeed(NOT_FEED_XML)
      expect(feed).toBeNull()
    })

    it('returns null for an empty string', () => {
      const feed = parseRSSFeed('')
      expect(feed).toBeNull()
    })
  })
})

describe('isValidFeedUrl', () => {
  it('accepts http URLs', () => {
    expect(isValidFeedUrl('http://example.com/feed')).toBe(true)
  })

  it('accepts https URLs', () => {
    expect(isValidFeedUrl('https://example.com/feed.rss')).toBe(true)
  })

  it('accepts https URLs with paths and query strings', () => {
    expect(isValidFeedUrl('https://example.com/feed?format=rss&page=1')).toBe(true)
  })

  it('rejects ftp URLs', () => {
    expect(isValidFeedUrl('ftp://example.com/feed')).toBe(false)
  })

  it('rejects javascript: URIs', () => {
    expect(isValidFeedUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects data: URIs', () => {
    expect(isValidFeedUrl('data:text/html,<h1>hi</h1>')).toBe(false)
  })

  it('rejects plain strings that are not URLs', () => {
    expect(isValidFeedUrl('not a url')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidFeedUrl('')).toBe(false)
  })
})

describe('extractFeedUrls', () => {
  const BASE_URL = 'https://example.com'

  it('extracts RSS link elements from HTML', () => {
    const html = `<!DOCTYPE html><html><head>
      <link rel="alternate" type="application/rss+xml" href="/feed.rss" title="RSS Feed"/>
    </head><body></body></html>`
    const urls = extractFeedUrls(html, BASE_URL)
    expect(urls).toContain('https://example.com/feed.rss')
  })

  it('extracts Atom link elements from HTML', () => {
    const html = `<!DOCTYPE html><html><head>
      <link rel="alternate" type="application/atom+xml" href="/atom.xml" title="Atom Feed"/>
    </head><body></body></html>`
    const urls = extractFeedUrls(html, BASE_URL)
    expect(urls).toContain('https://example.com/atom.xml')
  })

  it('resolves absolute feed URLs unchanged', () => {
    const html = `<!DOCTYPE html><html><head>
      <link rel="alternate" type="application/rss+xml" href="https://feeds.example.com/rss"/>
    </head><body></body></html>`
    const urls = extractFeedUrls(html, BASE_URL)
    expect(urls).toContain('https://feeds.example.com/rss')
  })

  it('extracts multiple feed links', () => {
    const html = `<!DOCTYPE html><html><head>
      <link rel="alternate" type="application/rss+xml" href="/rss.xml"/>
      <link rel="alternate" type="application/atom+xml" href="/atom.xml"/>
    </head><body></body></html>`
    const urls = extractFeedUrls(html, BASE_URL)
    expect(urls).toHaveLength(2)
  })

  it('returns an empty array when no feed links are present', () => {
    const html = `<!DOCTYPE html><html><head><title>No feeds</title></head><body></body></html>`
    const urls = extractFeedUrls(html, BASE_URL)
    expect(urls).toHaveLength(0)
  })
})

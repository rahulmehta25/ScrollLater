import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { EntryDetailClient } from './EntryDetailClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Props {
  params: Promise<{ id: string }>
}

// Generate metadata for sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: entry } = await supabase
    .from('entries')
    .select('title, ai_summary, url')
    .eq('id', id)
    .single()

  if (!entry) {
    return {
      title: 'Entry Not Found - ScrollLater',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scrolllater.com'

  return {
    title: `${entry.title || 'Untitled'} - ScrollLater`,
    description: entry.ai_summary || 'Saved content on ScrollLater',
    openGraph: {
      title: entry.title || 'Saved Content',
      description: entry.ai_summary || 'View this saved content on ScrollLater',
      url: `${baseUrl}/entry/${id}`,
      siteName: 'ScrollLater',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: entry.title || 'Saved Content',
      description: entry.ai_summary || 'View this saved content on ScrollLater',
    },
  }
}

export default async function EntryPage({ params }: Props) {
  const { id } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    notFound()
  }

  return <EntryDetailClient entryId={id} />
}

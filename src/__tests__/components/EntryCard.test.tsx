import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EntryCard } from '@/components/dashboard/EntryCard'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
        error: null,
      }),
    },
  }),
}))

// Mock fetch
global.fetch = vi.fn()

const createMockEntry = (overrides = {}) => ({
  id: 'entry-1',
  user_id: 'user-1',
  content: 'This is test content for the entry card',
  original_input: 'Test input',
  url: 'https://example.com',
  title: 'Test Entry Title',
  ai_summary: 'This is an AI-generated summary',
  ai_category: 'Learning',
  user_category: null,
  ai_tags: ['test', 'learning'],
  user_tags: [],
  status: 'inbox' as const,
  priority: 3,
  scheduled_for: null,
  completed_at: null,
  calendar_event_id: null,
  calendar_event_url: null,
  ai_confidence_score: null,
  ai_schedule_suggestions: null,
  user_notes: null,
  metadata: null,
  search_vector: null as unknown,
  source: 'web',
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

describe('EntryCard', () => {
  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders entry title', () => {
    render(
      <EntryCard
        item={createMockEntry()}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Test Entry Title')).toBeInTheDocument()
  })

  it('renders "Untitled Entry" when no title', () => {
    render(
      <EntryCard
        item={createMockEntry({ title: null })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Untitled Entry')).toBeInTheDocument()
  })

  it('displays status badge', () => {
    render(
      <EntryCard
        item={createMockEntry({ status: 'scheduled' })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('scheduled')).toBeInTheDocument()
  })

  it('displays priority badge', () => {
    render(
      <EntryCard
        item={createMockEntry({ priority: 5 })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Priority: 5')).toBeInTheDocument()
  })

  it('displays category badge', () => {
    render(
      <EntryCard
        item={createMockEntry({ ai_category: 'Learning' })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Learning')).toBeInTheDocument()
  })

  it('renders AI summary or content', () => {
    render(
      <EntryCard
        item={createMockEntry()}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('This is an AI-generated summary')).toBeInTheDocument()
  })

  it('renders URL link when present', () => {
    render(
      <EntryCard
        item={createMockEntry()}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    const link = screen.getByText('Visit Link')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('does not render URL link when not present', () => {
    render(
      <EntryCard
        item={createMockEntry({ url: null })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.queryByText('Visit Link')).not.toBeInTheDocument()
  })

  it('renders schedule button for inbox items', () => {
    render(
      <EntryCard
        item={createMockEntry({ status: 'inbox' })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Schedule Manually')).toBeInTheDocument()
  })

  it('does not render schedule button for non-inbox items', () => {
    render(
      <EntryCard
        item={createMockEntry({ status: 'completed' })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.queryByText('Schedule Manually')).not.toBeInTheDocument()
  })

  it('displays scheduled time when present', () => {
    render(
      <EntryCard
        item={createMockEntry({
          status: 'scheduled',
          scheduled_for: '2024-01-20T14:00:00.000Z',
        })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText(/Scheduled for/)).toBeInTheDocument()
  })

  it('has menu button', () => {
    render(
      <EntryCard
        item={createMockEntry()}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    // Find menu button by its aria attributes
    const menuButton = document.querySelector('[aria-haspopup="menu"]')
    expect(menuButton).toBeInTheDocument()
  })

  it('opens schedule modal on button click', async () => {
    render(
      <EntryCard
        item={createMockEntry({ status: 'inbox' })}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    fireEvent.click(screen.getByText('Schedule Manually'))

    await waitFor(() => {
      expect(screen.getByText('Schedule Entry')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Time')).toBeInTheDocument()
      expect(screen.getByText('Duration (minutes)')).toBeInTheDocument()
    })
  })

  it('displays relative timestamps', () => {
    render(
      <EntryCard
        item={createMockEntry()}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText(/Added/)).toBeInTheDocument()
    expect(screen.getByText(/Updated/)).toBeInTheDocument()
  })
})

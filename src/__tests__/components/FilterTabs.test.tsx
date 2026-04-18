import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterTabs } from '@/components/dashboard/FilterTabs'

// Mock entry type matching Database entries Row
const createMockEntries = (statuses: string[]) => {
  return statuses.map((status, index) => ({
    id: `entry-${index}`,
    user_id: 'user-1',
    content: `Entry ${index}`,
    original_input: `Entry ${index}`,
    url: null,
    title: null,
    ai_summary: null,
    ai_category: null,
    ai_tags: [] as string[],
    ai_confidence_score: null,
    ai_schedule_suggestions: null,
    user_category: null,
    user_tags: [] as string[],
    user_notes: null,
    priority: 0,
    status: status as 'inbox' | 'scheduled' | 'completed' | 'archived',
    scheduled_for: null,
    completed_at: null,
    calendar_event_id: null,
    calendar_event_url: null,
    source: 'manual',
    metadata: null,
    search_vector: null as unknown,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

describe('FilterTabs', () => {
  it('renders all filter tabs', () => {
    const mockOnFilterChange = vi.fn()
    render(
      <FilterTabs
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        entries={[]}
      />
    )

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Inbox')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('displays correct counts for each tab', () => {
    const entries = createMockEntries([
      'inbox',
      'inbox',
      'scheduled',
      'completed',
      'completed',
      'completed',
      'archived',
    ])

    render(
      <FilterTabs
        activeFilter="all"
        onFilterChange={vi.fn()}
        entries={entries}
      />
    )

    // Find counts in badges
    const allButton = screen.getByRole('button', { name: /All/i })
    expect(allButton).toHaveTextContent('7')

    const inboxButton = screen.getByRole('button', { name: /Inbox/i })
    expect(inboxButton).toHaveTextContent('2')

    const scheduledButton = screen.getByRole('button', { name: /Scheduled/i })
    expect(scheduledButton).toHaveTextContent('1')

    const completedButton = screen.getByRole('button', { name: /Completed/i })
    expect(completedButton).toHaveTextContent('3')

    const archivedButton = screen.getByRole('button', { name: /Archived/i })
    expect(archivedButton).toHaveTextContent('1')
  })

  it('calls onFilterChange when tab is clicked', () => {
    const mockOnFilterChange = vi.fn()
    render(
      <FilterTabs
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        entries={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Inbox/i }))
    expect(mockOnFilterChange).toHaveBeenCalledWith('inbox')

    fireEvent.click(screen.getByRole('button', { name: /Scheduled/i }))
    expect(mockOnFilterChange).toHaveBeenCalledWith('scheduled')
  })

  it('highlights the active filter tab', () => {
    render(
      <FilterTabs
        activeFilter="inbox"
        onFilterChange={vi.fn()}
        entries={[]}
      />
    )

    const inboxButton = screen.getByRole('button', { name: /Inbox/i })
    expect(inboxButton).toHaveClass('border-blue-500')
    expect(inboxButton).toHaveClass('text-blue-600')
  })

  it('handles empty entries array', () => {
    render(
      <FilterTabs
        activeFilter="all"
        onFilterChange={vi.fn()}
        entries={[]}
      />
    )

    const allButton = screen.getByRole('button', { name: /All/i })
    expect(allButton).toHaveTextContent('0')
  })
})

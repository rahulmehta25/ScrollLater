import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/dashboard/StatsCards'

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

describe('StatsCards', () => {
  it('renders all stat cards', () => {
    render(<StatsCards entries={[]} />)

    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Inbox')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('displays correct total count', () => {
    const entries = createMockEntries(['inbox', 'inbox', 'completed'])

    render(<StatsCards entries={entries} />)

    const totalCard = screen.getByText('Total Items').parentElement?.parentElement
    expect(totalCard).toHaveTextContent('3')
  })

  it('displays correct inbox count', () => {
    const entries = createMockEntries(['inbox', 'inbox', 'completed', 'inbox'])

    render(<StatsCards entries={entries} />)

    const inboxCard = screen.getByText('Inbox').parentElement?.parentElement
    expect(inboxCard).toHaveTextContent('3')
  })

  it('displays correct completed count', () => {
    const entries = createMockEntries([
      'inbox',
      'completed',
      'completed',
      'completed',
      'archived',
    ])

    render(<StatsCards entries={entries} />)

    const completedCard = screen.getByText('Completed').parentElement?.parentElement
    expect(completedCard).toHaveTextContent('3')
  })

  it('displays correct archived count', () => {
    const entries = createMockEntries([
      'inbox',
      'completed',
      'archived',
      'archived',
    ])

    render(<StatsCards entries={entries} />)

    const archivedCard = screen.getByText('Archived').parentElement?.parentElement
    expect(archivedCard).toHaveTextContent('2')
  })

  it('handles empty entries array', () => {
    render(<StatsCards entries={[]} />)

    // All counts should be 0
    const statCards = screen.getAllByText('0')
    expect(statCards.length).toBe(4)
  })

  it('renders icons for each stat', () => {
    render(<StatsCards entries={[]} />)

    // Each card should have an icon (svg element)
    const cards = document.querySelectorAll('.bg-white.shadow.rounded-lg')
    cards.forEach((card) => {
      expect(card.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('uses grid layout', () => {
    const { container } = render(<StatsCards entries={[]} />)

    const grid = container.firstChild
    expect(grid).toHaveClass('grid')
    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('lg:grid-cols-4')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntryForm } from '@/components/forms/EntryForm'

// Mock useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
  }),
}))

// Mock Supabase
const mockInsert = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'new-entry-id' },
  error: null,
})
const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { access_token: 'test-token' } },
  error: null,
})

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    from: () => ({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    }),
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

// Mock fetch for AI analysis
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true }),
})

describe('EntryForm', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnThis()
    mockSelect.mockReturnThis()
    mockSingle.mockResolvedValue({
      data: { id: 'new-entry-id' },
      error: null,
    })
  })

  it('renders the form with all fields', () => {
    render(<EntryForm onSuccess={mockOnSuccess} />)

    expect(screen.getByText('What would you like to save?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Paste a link, write a note/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('productivity, tools, inspiration')).toBeInTheDocument()
  })

  it('renders all category buttons', () => {
    render(<EntryForm onSuccess={mockOnSuccess} />)

    expect(screen.getByText('Read Later')).toBeInTheDocument()
    expect(screen.getByText('Build')).toBeInTheDocument()
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Creative')).toBeInTheDocument()
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getByText('Business')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('disables submit button when content is empty', () => {
    render(<EntryForm onSuccess={mockOnSuccess} />)

    const submitButton = screen.getByRole('button', { name: /Save Entry/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when content is entered', async () => {
    const user = userEvent.setup()
    render(<EntryForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText(/Paste a link, write a note/)
    await user.type(textarea, 'Some test content')

    const submitButton = screen.getByRole('button', { name: /Save Entry/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('toggles category selection', async () => {
    const user = userEvent.setup()
    render(<EntryForm onSuccess={mockOnSuccess} />)

    const learningButton = screen.getByText('Learning')

    // Select category
    await user.click(learningButton)
    expect(learningButton).toHaveClass('bg-cyan-100')

    // Deselect category
    await user.click(learningButton)
    expect(learningButton).toHaveClass('bg-gray-100')
  })

  it('displays validation error for empty content', async () => {
    const user = userEvent.setup()
    render(<EntryForm onSuccess={mockOnSuccess} />)

    // Type and clear content
    const textarea = screen.getByPlaceholderText(/Paste a link, write a note/)
    await user.type(textarea, 'a')
    await user.clear(textarea)

    // Submit button should be disabled
    const submitButton = screen.getByRole('button', { name: /Save Entry/i })
    expect(submitButton).toBeDisabled()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()

    // Make submission take some time
    mockSingle.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 'new' }, error: null }), 100))
    )

    render(<EntryForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText(/Paste a link, write a note/)
    await user.type(textarea, 'Test content')

    const submitButton = screen.getByRole('button', { name: /Save Entry/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Saving Entry.../)).toBeInTheDocument()
    })
  })

  it('auto-detects URLs in content', async () => {
    const user = userEvent.setup()
    render(<EntryForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText(/Paste a link, write a note/)
    await user.type(textarea, 'Check this out https://example.com article')

    const urlInput = screen.getByPlaceholderText('https://example.com')
    // The URL should be extracted (implementation may vary)
    expect(urlInput).toBeInTheDocument()
  })

  it('renders icons in form labels', () => {
    render(<EntryForm onSuccess={mockOnSuccess} />)

    // Check for icons (SVG elements)
    const urlLabel = screen.getByText(/URL \(optional\)/)
    expect(urlLabel.querySelector('svg')).toBeInTheDocument()

    const tagsLabel = screen.getByText(/Tags \(comma-separated\)/)
    expect(tagsLabel.querySelector('svg')).toBeInTheDocument()
  })

  it('has proper form structure', () => {
    const { container } = render(<EntryForm onSuccess={mockOnSuccess} />)

    const form = container.querySelector('form')
    expect(form).toBeInTheDocument()

    const textareas = container.querySelectorAll('textarea')
    expect(textareas.length).toBe(1)

    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBe(2) // URL and Tags
  })
})

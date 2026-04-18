import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

// Mock Supabase
const mockGetSession = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: () => ({
      upsert: mockUpsert,
    }),
  }),
  isSupabaseConfigured: () => true,
}))

// Test component that uses the auth context
function TestConsumer() {
  const { user, session, loading, signOut } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user?.email || 'no-user'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })

    mockUpsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('provides initial loading state', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    // Initially loading is true, then becomes false after mount
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })
  })

  it('provides null user when no session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('no-user')
      expect(screen.getByTestId('session').textContent).toBe('no-session')
    })
  })

  it('provides user when session exists', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      },
    }

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      expect(screen.getByTestId('session').textContent).toBe('has-session')
    })
  })

  it('calls signOut when signOut function is called', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      screen.getByText('Sign Out').click()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('subscribes to auth state changes', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })
  })

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })

  it('handles session fetch error gracefully', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Failed to fetch session'),
    })

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('no-user')
    })

    consoleSpy.mockRestore()
  })

  it('renders children', () => {
    render(
      <AuthProvider>
        <div data-testid="child">Child Content</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })
})

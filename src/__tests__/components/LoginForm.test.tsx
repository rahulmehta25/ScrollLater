import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '@/components/auth/LoginForm'

// Mock Supabase
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOAuth.mockResolvedValue({ error: null })
  })

  it('renders sign in heading', () => {
    render(<LoginForm />)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Choose your preferred sign-in method')).toBeInTheDocument()
  })

  it('renders Google sign in button', () => {
    render(<LoginForm />)

    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('renders GitHub sign in button', () => {
    render(<LoginForm />)

    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
  })

  it('renders terms text', () => {
    render(<LoginForm />)

    expect(
      screen.getByText(/By signing in, you agree to our Terms of Service and Privacy Policy/)
    ).toBeInTheDocument()
  })

  it('calls signInWithOAuth with google provider', async () => {
    render(<LoginForm />)

    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/api/auth/callback'),
        }),
      })
    })
  })

  it('calls signInWithOAuth with github provider', async () => {
    render(<LoginForm />)

    fireEvent.click(screen.getByText('Continue with GitHub'))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/api/auth/callback'),
        }),
      })
    })
  })

  it('shows loading state during sign in', async () => {
    // Delay the mock to see loading state
    mockSignInWithOAuth.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<LoginForm />)

    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(screen.getAllByText('Signing in...').length).toBeGreaterThan(0)
    })
  })

  it('displays error message on sign in failure', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: new Error('Auth failed') })

    render(<LoginForm />)

    fireEvent.click(screen.getByText('Continue with Google'))

    await waitFor(() => {
      expect(screen.getByText('Failed to sign in. Please try again.')).toBeInTheDocument()
    })
  })

  it('disables buttons during loading', async () => {
    mockSignInWithOAuth.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<LoginForm />)

    const googleButton = screen.getByText('Continue with Google').closest('button')
    const githubButton = screen.getByText('Continue with GitHub').closest('button')

    fireEvent.click(googleButton!)

    await waitFor(() => {
      expect(googleButton).toBeDisabled()
      expect(githubButton).toBeDisabled()
    })
  })

  it('has Google icon in button', () => {
    render(<LoginForm />)

    const googleButton = screen.getByText('Continue with Google').closest('button')
    expect(googleButton?.querySelector('svg')).toBeInTheDocument()
  })

  it('has GitHub icon in button', () => {
    render(<LoginForm />)

    const githubButton = screen.getByText('Continue with GitHub').closest('button')
    expect(githubButton?.querySelector('svg')).toBeInTheDocument()
  })
})

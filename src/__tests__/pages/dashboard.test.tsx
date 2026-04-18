import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock useAuth
const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock Dashboard component
vi.mock('@/components/dashboard/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard Component</div>,
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(<DashboardPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('redirects to home when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('renders Dashboard component when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
    })

    render(<DashboardPage />)

    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    expect(screen.getByText('Dashboard Component')).toBeInTheDocument()
  })

  it('returns null when not loading but no user (before redirect)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    })

    const { container } = render(<DashboardPage />)

    // Component should render nothing (null) before redirect happens
    expect(container.firstChild).toBeNull()
  })

  it('does not redirect when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(<DashboardPage />)

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not redirect when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
    })

    render(<DashboardPage />)

    expect(mockPush).not.toHaveBeenCalled()
  })
})

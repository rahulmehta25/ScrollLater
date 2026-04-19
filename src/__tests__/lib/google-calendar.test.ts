import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the factory references are resolved before module evaluation
const mocks = vi.hoisted(() => {
  const mockEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  const mockGetSession = vi.fn()
  const mockInvoke = vi.fn()

  return { mockGetSession, mockUpdate, mockEq, mockInvoke }
})

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    auth: {
      getSession: mocks.mockGetSession,
    },
    from: () => ({
      update: mocks.mockUpdate,
    }),
    functions: {
      invoke: mocks.mockInvoke,
    },
  }),
}))

// Import after mocks are configured
import { googleCalendar } from '@/lib/google-calendar'

describe('googleCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockEq.mockResolvedValue({ error: null })
    mocks.mockUpdate.mockReturnValue({ eq: mocks.mockEq })

    // Provide a writable window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        origin: 'https://app.scrolllater.com',
        href: 'https://app.scrolllater.com/dashboard',
      },
    })

    sessionStorage.clear()
  })

  describe('signIn', () => {
    it('stores a google_oauth_state value in sessionStorage', async () => {
      await googleCalendar.signIn()
      const state = sessionStorage.getItem('google_oauth_state')
      expect(state).not.toBeNull()
      expect(state!.length).toBeGreaterThan(0)
    })

    it('redirects to the Google OAuth endpoint', async () => {
      await googleCalendar.signIn()
      expect((window.location as { href: string }).href).toMatch(
        /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/
      )
    })

    it('includes required OAuth params in the redirect URL', async () => {
      await googleCalendar.signIn()
      const href = (window.location as { href: string }).href
      const url = new URL(href)
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar')
      expect(url.searchParams.get('access_type')).toBe('offline')
      expect(url.searchParams.get('prompt')).toBe('consent')
    })

    it('includes the correct redirect_uri pointing to the callback route', async () => {
      await googleCalendar.signIn()
      const href = (window.location as { href: string }).href
      const url = new URL(href)
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://app.scrolllater.com/api/auth/google-callback'
      )
    })

    it('embeds the state value from sessionStorage into the OAuth URL', async () => {
      await googleCalendar.signIn()
      const state = sessionStorage.getItem('google_oauth_state')
      const href = (window.location as { href: string }).href
      const url = new URL(href)
      expect(url.searchParams.get('state')).toBe(state)
    })
  })

  describe('signOut', () => {
    it('updates the user profile to disconnect Google Calendar when session exists', async () => {
      mocks.mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-abc' } } },
      })

      await googleCalendar.signOut()

      expect(mocks.mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          google_calendar_connected: false,
          google_refresh_token: null,
        })
      )
      expect(mocks.mockEq).toHaveBeenCalledWith('id', 'user-abc')
    })

    it('does not call update when there is no active session', async () => {
      mocks.mockGetSession.mockResolvedValue({
        data: { session: null },
      })

      await googleCalendar.signOut()

      expect(mocks.mockUpdate).not.toHaveBeenCalled()
    })

    it('does not throw when getSession rejects', async () => {
      mocks.mockGetSession.mockRejectedValue(new Error('network error'))

      await expect(googleCalendar.signOut()).resolves.toBeUndefined()
    })
  })

  describe('createEvent', () => {
    it('invokes the calendar-integration edge function with the correct payload', async () => {
      mocks.mockInvoke.mockResolvedValue({ error: null })

      await googleCalendar.createEvent(
        'entry-123',
        'Read this article',
        'Interesting piece about AI',
        '2024-06-15T10:00:00Z',
        30
      )

      expect(mocks.mockInvoke).toHaveBeenCalledWith('calendar-integration', {
        body: {
          entryId: 'entry-123',
          title: 'Read this article',
          description: 'Interesting piece about AI',
          startTime: '2024-06-15T10:00:00Z',
          duration: 30,
        },
      })
    })

    it('throws when the edge function returns an error', async () => {
      const edgeError = new Error('Edge function failed')
      mocks.mockInvoke.mockResolvedValue({ error: edgeError })

      await expect(
        googleCalendar.createEvent('entry-1', 'Title', 'Desc', '2024-01-01T09:00:00Z', 15)
      ).rejects.toThrow('Edge function failed')
    })

    it('does not throw when the edge function succeeds', async () => {
      mocks.mockInvoke.mockResolvedValue({ error: null })

      await expect(
        googleCalendar.createEvent('entry-2', 'Title', 'Desc', '2024-01-01T09:00:00Z', 60)
      ).resolves.toBeUndefined()
    })
  })
})

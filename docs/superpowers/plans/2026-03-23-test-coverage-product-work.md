# Test Coverage + Product Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire notification toggles to backend, extract page.tsx into components, add streaming export, then achieve 80%+ test coverage across the entire codebase.

**Architecture:** Product work first (notification wiring, component extraction, streaming export endpoint), then bottom-up test coverage (libs -> services -> API routes -> hooks -> middleware -> components). Tests mock Supabase and external APIs at the boundary using the existing mock infrastructure.

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5.9, Vitest, Testing Library, Supabase

**Spec:** `docs/superpowers/specs/2026-03-23-test-coverage-product-work-design.md`

---

## Phase 1: Product Work

### Task 1: Wire notification toggles to backend

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Read the profile page and understand the current NotificationToggle**

Read `src/app/profile/page.tsx`. The `NotificationToggle` component (lines ~433-471) uses local state and calls `updateUserPreference()` which upserts to a `user_preferences` table that does not exist in the schema. The fix: replace this with calls to `updateUserProfile()` from `src/services/api.ts` targeting the real DB columns `notification_email`, `notification_weekly_digest`, `notification_ai_insights` on `user_profiles`.

- [ ] **Step 2: Refactor NotificationToggle to use profile state**

Replace the `NotificationToggle` component and its `updateUserPreference` helper. Make sure `Toggle` is imported from `@/components/ui/Toggle` and `Loader2`/`Check` from `lucide-react`. The new approach:

```tsx
function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  saving,
  saved,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  saving?: boolean
  saved?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        {saved && !saving && <Check className="w-3 h-3 text-green-500" />}
        <Toggle checked={checked} onChange={onChange} size="sm" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire the three notification toggles to profile state**

In the notification preferences section (around lines 288-312), replace hardcoded `defaultChecked` with profile values and add inline save handlers with a "saved" indicator that fades after 2 seconds:

```tsx
const [savingField, setSavingField] = useState<string | null>(null)
const [savedField, setSavedField] = useState<string | null>(null)

const handleNotificationToggle = async (field: string, value: boolean) => {
  if (!user) return
  setSavingField(field)
  // Optimistic update
  setProfile(prev => prev ? { ...prev, [field]: value } : prev)
  const result = await updateUserProfile(user.id, { [field]: value })
  setSavingField(null)
  if (result.error) {
    // Revert on failure
    setProfile(prev => prev ? { ...prev, [field]: !value } : prev)
  } else {
    setSavedField(field)
    setTimeout(() => setSavedField(null), 2000)
  }
}

// In JSX:
<NotificationToggle
  label="Email notifications"
  description="Receive email reminders for scheduled items"
  checked={profile?.notification_email ?? true}
  onChange={(checked) => handleNotificationToggle('notification_email', checked)}
  saving={savingField === 'notification_email'}
  saved={savedField === 'notification_email'}
/>
<NotificationToggle
  label="Weekly digest"
  description="Get a weekly summary of your saved content"
  checked={profile?.notification_weekly_digest ?? true}
  onChange={(checked) => handleNotificationToggle('notification_weekly_digest', checked)}
  saving={savingField === 'notification_weekly_digest'}
  saved={savedField === 'notification_weekly_digest'}
/>
<NotificationToggle
  label="AI insights"
  description="Receive AI-powered content recommendations"
  checked={profile?.notification_ai_insights ?? false}
  onChange={(checked) => handleNotificationToggle('notification_ai_insights', checked)}
  saving={savingField === 'notification_ai_insights'}
  saved={savedField === 'notification_ai_insights'}
/>
```

- [ ] **Step 4: Remove the old updateUserPreference helper**

Delete the `updateUserPreference` function (lines ~418-431) that references the non-existent `user_preferences` table.

- [ ] **Step 5: Verify typecheck and build**

Run: `npm run typecheck && npm run build 2>&1 | tail -5`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: wire notification toggles to user_profiles backend"
```

---

### Task 2: Split page.tsx into components

**Files:**
- Create: `src/components/home/types.ts`
- Create: `src/components/home/TypeBadge.tsx`
- Create: `src/components/home/ContentCard.tsx`
- Create: `src/components/home/ContentCardGrid.tsx`
- Create: `src/components/home/SchedulePanel.tsx`
- Create: `src/components/home/DigestPanel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read page.tsx and identify shared types**

Read `src/app/page.tsx`. Identify the `DemoItem` type (or whatever type the demo data items use) and `ContentType`. These will go into `types.ts`.

- [ ] **Step 2: Create types.ts**

Create `src/components/home/types.ts` with the shared types used across the extracted components. Import the demo data types from `@/lib/demo-data` and re-export what's needed.

- [ ] **Step 3: Create TypeBadge.tsx**

Extract `TypeIcon` (lines ~56-64) and `TypeLabel` (lines ~66-84) into `src/components/home/TypeBadge.tsx`. Both are small functions that map content type to icon/badge. Export both as named exports.

- [ ] **Step 4: Create ContentCard.tsx**

Extract the list-view `ContentCard` component (lines ~105-172) into `src/components/home/ContentCard.tsx`. Import `TypeBadge` components. Props: `{ item: DemoItem; onClick?: () => void }`.

- [ ] **Step 5: Create ContentCardGrid.tsx**

Extract the grid-view `ContentCardGrid` component (lines ~174-212) into `src/components/home/ContentCardGrid.tsx`. Same pattern as ContentCard.

- [ ] **Step 6: Create SchedulePanel.tsx**

Extract `SchedulePanel` (lines ~214-332) into `src/components/home/SchedulePanel.tsx`. This component manages its own week navigation state. Props: `{ items: DemoItem[] }`.

- [ ] **Step 7: Create DigestPanel.tsx**

Extract `DigestPanel` (lines ~334-414) into `src/components/home/DigestPanel.tsx`. Props: `{ items: DemoItem[] }`.

- [ ] **Step 8: Update page.tsx to import extracted components**

Replace inline component definitions with imports from `@/components/home/`. The Home component (~lines 416-698) stays in `page.tsx` with imports. Verify all props are passed correctly.

- [ ] **Step 9: Verify typecheck, build, and test**

Run: `npm run typecheck && npm run build 2>&1 | tail -5 && npm run test 2>&1 | tail -5`
Expected: all pass, no behavior change

- [ ] **Step 10: Commit**

```bash
git add src/components/home/ src/app/page.tsx
git commit -m "refactor: extract 6 inline components from page.tsx into src/components/home/"
```

---

### Task 3: Add export streaming endpoint

**Files:**
- Create: `src/pages/api/entries/export.ts`
- Modify: `src/services/api.ts`

- [ ] **Step 1: Create the streaming export API route**

Create `src/pages/api/entries/export.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
}

const PAGE_SIZE = 1000

const CSV_HEADERS = [
  'id', 'title', 'url', 'content', 'status', 'priority',
  'ai_category', 'user_category', 'ai_summary', 'user_notes',
  'scheduled_for', 'created_at', 'updated_at'
]

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = authHeader.substring(7)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { format = 'json' } = req.body || {}
  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({ error: 'Format must be "json" or "csv"' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const timestamp = new Date().toISOString().split('T')[0]
  const ext = format === 'csv' ? 'csv' : 'json'
  const contentType = format === 'csv' ? 'text/csv' : 'application/json'

  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="scrolllater-export-${timestamp}.${ext}"`)

  try {
    if (format === 'json') {
      res.write('[')
      let page = 0
      let hasMore = true
      let isFirst = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) { hasMore = false; break }

        for (const entry of data) {
          if (!isFirst) res.write(',')
          res.write(JSON.stringify(entry))
          isFirst = false
        }

        hasMore = data.length === PAGE_SIZE
        page++
      }

      res.write(']')
    } else {
      res.write(CSV_HEADERS.join(',') + '\n')
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) { hasMore = false; break }

        for (const entry of data) {
          const row = CSV_HEADERS.map(h => escapeCsvValue((entry as Record<string, unknown>)[h]))
          res.write(row.join(',') + '\n')
        }

        hasMore = data.length === PAGE_SIZE
        page++
      }
    }

    res.end()
  } catch (err) {
    console.error('Export error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    } else {
      res.end()
    }
  }
}
```

- [ ] **Step 2: Update client-side exportEntries**

In `src/services/api.ts`, replace the `exportEntries` function:

```typescript
export async function exportEntries(
  userId: string,
  format: ExportFormat
): Promise<ApiResult<string>> {
  try {
    const supabase = createSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return failure('Not authenticated', 'AUTH_ERROR')
    }

    const response = await fetch('/api/entries/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ format }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Export failed' }))
      return failure(err.error || 'Export failed', 'EXPORT_ERROR')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '')
      || `scrolllater-export.${format === 'csv' ? 'csv' : 'json'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return success('Export downloaded successfully')
  } catch (err) {
    if (err instanceof ApiError) return failure(err.message, err.code)
    return failure('Failed to export entries', 'EXPORT_ERROR')
  }
}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck && npm run build 2>&1 | tail -5`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/entries/export.ts src/services/api.ts
git commit -m "feat: add streaming export endpoint, replace in-memory export"
```

---

## Phase 2: Test Coverage

### Task 4: Update vitest coverage config

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Remove coverage exclusions for testable directories**

Read `vitest.config.ts`. In the `coverage.exclude` array, remove these entries so they count toward coverage:
- `'src/pages/**'`
- `'src/services/**'`
- `'src/hooks/**'`
- `'src/components/pwa/**'`
- `'src/components/ui/**'`

Keep exclusions for: `node_modules`, `.next`, `src/__tests__/**`, `**/*.d.ts`, `**/*.config.*`, `**/types/**`, `src/app/**`, `supabase/**`, `e2e/**`. Note: `src/app/**` stays excluded since App Router pages/layouts are harder to unit test and are better covered by E2E tests.

- [ ] **Step 2: Verify tests still pass**

Run: `npm run test`
Expected: all 143 tests pass

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: update coverage config to include all source directories"
```

---

### Task 5: Library tests - auth.ts

**Files:**
- Create: `src/__tests__/lib/auth.test.ts`
- Test: `src/lib/auth.ts` (270 lines)

- [ ] **Step 1: Write auth tests**

Create `src/__tests__/lib/auth.test.ts`. Mock `@/lib/supabase` using the existing pattern from `src/__tests__/mocks/supabase.ts`. Test every exported function:

- `signUpWithEmail`: success returns user, duplicate email returns error, weak password returns error, invalid email returns validation error
- `signInWithEmail`: success returns session, wrong password returns error, unregistered email returns error
- `signInWithMagicLink`: success, invalid email
- `signInWithOAuth`: constructs Google/GitHub provider URLs
- `resetPassword`: success, invalid email
- `updatePassword`: success, error
- `getSession`: returns session when active, returns null when none
- `getUser`: returns user when authenticated, returns null when not
- `signOut`: success clears session, error handling
- `validateEmail`: valid emails pass, invalid fail, edge cases (empty, no @, no domain)
- `validatePassword`: checks minimum length, returns appropriate messages

Each test should mock the Supabase auth method return value and verify the function returns the correct result shape.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/lib/auth.test.ts`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/auth.test.ts
git commit -m "test: add comprehensive auth.ts test coverage"
```

---

### Task 6: Library tests - offline.ts

**Files:**
- Create: `src/__tests__/lib/offline.test.ts`
- Test: `src/lib/offline.ts` (285 lines)

- [ ] **Step 1: Write offline tests**

Mock `localStorage` and `navigator.onLine`. Test every exported function:

- `queueOfflineAction`: adds action with ID and timestamp, persists to localStorage
- `getOfflineQueue`: reads queue, handles empty localStorage, handles corrupt JSON
- `removeFromQueue`: removes specific action by ID
- `syncOfflineQueue`: processes pending actions via fetch, increments retries on failure, filters actions exceeding 3 retries (verifies the bug fix from audit), saves the modified queue directly (not re-read from localStorage)
- `cacheEntries`/`getCachedEntries`: write entries to cache, read back correctly
- `clearOfflineData`: removes all offline keys from localStorage
- `isOnline`: returns `navigator.onLine` value
- `applyOptimisticCreate`: adds entry to state array
- `applyOptimisticUpdate`: updates entry in state array
- `applyOptimisticDelete`: removes entry from state array
- `rollbackOptimisticUpdate`: restores previous entry state
- `setupOfflineSync`: registers online/offline event listeners
- `getLastSyncTime`/`getSyncStatus`: returns sync metadata

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/lib/offline.test.ts`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/offline.test.ts
git commit -m "test: add comprehensive offline.ts test coverage"
```

---

### Task 7: Library tests - errors.ts

**Files:**
- Create: `src/__tests__/lib/errors.test.ts`
- Test: `src/lib/errors.ts` (343 lines)

- [ ] **Step 1: Write error tests**

Test every exported function/class:

- `AppError`: constructor sets code, message, details; extends Error; has correct name
- `ErrorCode`: all constant values exist and are strings
- `parsePostgrestError`: maps common Postgres error codes (23505 duplicate, 23503 FK violation, 42P01 undefined table) to AppError with user-friendly messages
- `parseError`: handles Error instances, AppError instances, string errors, unknown types
- `isRetryable`: returns true for network/timeout errors, false for auth/validation
- `withRetry`: retries on retryable errors up to max attempts, stops immediately on non-retryable
- `logError`: calls console.error with formatted output
- `errorToToast`: converts AppError to `{ title, description, variant }` object
- `handleApiResponse`: wraps successful responses, catches and transforms errors

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/lib/errors.test.ts`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/errors.test.ts
git commit -m "test: add comprehensive errors.ts test coverage"
```

---

### Task 8: Library tests - rss-parser.ts, google-calendar.ts, push-notifications.ts

**Files:**
- Create: `src/__tests__/lib/rss-parser.test.ts`
- Create: `src/__tests__/lib/google-calendar.test.ts`
- Create: `src/__tests__/lib/push-notifications.test.ts`

- [ ] **Step 1: Write rss-parser tests**

Test `parseRSSFeed` and `isValidFeedUrl`:
- Valid RSS 2.0 XML string parses to RSSFeed object with correct title, items
- Valid Atom XML string parses correctly
- Malformed XML returns null
- Missing required fields handled gracefully
- `isValidFeedUrl`: accepts http/https, rejects ftp, javascript, data URIs
- `extractFeedUrls`: extracts feed URLs from HTML string (link tags with type="application/rss+xml")

Use inline XML strings as test fixtures. Mock `DOMParser` if not available in jsdom (it should be).

- [ ] **Step 2: Write google-calendar tests**

Mock `window.location.assign` and `sessionStorage`. Test the `googleCalendar` class instance:
- `signIn()`: constructs OAuth URL with correct scopes and redirect URI, stores state in sessionStorage
- `signOut()`: clears calendar connection state
- `createEvent()`: invokes Supabase edge function with correct payload, handles success/error

- [ ] **Step 3: Write push-notifications tests**

Mock `navigator.serviceWorker`, `Notification`, `PushManager`. Test:
- `isPushSupported`: returns true when APIs present, false otherwise
- `getNotificationPermission`: returns current permission string
- `requestNotificationPermission`: returns 'granted'/'denied' based on mock
- `subscribeToPush`: creates PushSubscription with VAPID key
- `unsubscribeFromPush`: calls unsubscribe on existing subscription
- `isSubscribedToPush`: checks if subscription exists
- `showLocalNotification`: creates Notification with correct title/options
- `scheduleNotification`: sets timeout, callback fires notification

- [ ] **Step 4: Run all three test files**

Run: `npx vitest run src/__tests__/lib/rss-parser.test.ts src/__tests__/lib/google-calendar.test.ts src/__tests__/lib/push-notifications.test.ts`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/lib/rss-parser.test.ts src/__tests__/lib/google-calendar.test.ts src/__tests__/lib/push-notifications.test.ts
git commit -m "test: add rss-parser, google-calendar, push-notifications tests"
```

---

### Task 9: Service layer test - api.ts

**Files:**
- Create: `src/__tests__/services/api.test.ts`
- Test: `src/services/api.ts` (505 lines)

- [ ] **Step 1: Write service layer tests**

Create `src/__tests__/services/api.test.ts`. Mock `@/lib/supabase` to return a mock Supabase client. Test every exported function:

- `getUserProfile`: mock `.from('user_profiles').select('*').eq().single()` chain; test success returns profile, not found returns error, DB error returns error
- `updateUserProfile`: mock `.from('user_profiles').update().eq().select().single()`; test success with partial updates, error
- `createUserProfile`: mock `.from('user_profiles').insert().select().single()`; success, duplicate
- `createEntry`: success with all fields, error
- `getEntries`: success with various filters (status, search term), empty result, pagination
- `getEntry`: success, not found
- `updateEntry`: success, error
- `deleteEntry`: success, error
- `bulkUpdateEntries`: success with multiple IDs, error
- `bulkDeleteEntries`: success, error
- `getDashboardStats`: test the `user_dashboard_stats` view path (success), fallback path, error
- `getCategories`: success returns category list, error
- `exportEntries`: test that it calls fetch to the export endpoint (mock global fetch)
- `ApiError`: construction with message and code
- Internal `checkSupabase`: verify it throws when client not available

Each test should set up mock return values for the Supabase chain and verify the function returns the correct `ApiResult<T>` shape.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/services/api.test.ts`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/services/api.test.ts
git commit -m "test: add comprehensive api.ts service layer tests"
```

---

### Task 10: API route tests - AI endpoints

**Files:**
- Create: `src/__tests__/api/ai-analyze.test.ts`
- Create: `src/__tests__/api/ai-schedule-suggest.test.ts`

- [ ] **Step 1: Create API route test helpers**

For testing Next.js Pages Router API routes, create mock `req`/`res` objects:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

function createMockReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'POST',
    headers: {},
    body: {},
    query: {},
    ...overrides,
  } as NextApiRequest
}

function createMockRes(): NextApiResponse & { _status: number; _json: unknown; _headers: Record<string, string> } {
  const res = {
    _status: 200,
    _json: null,
    _headers: {} as Record<string, string>,
    status(code: number) { res._status = code; return res },
    json(data: unknown) { res._json = data; return res },
    setHeader(key: string, value: string) { res._headers[key] = value; return res },
    end() { return res },
    write() { return res },
  }
  return res as any
}
```

Put this in `src/__tests__/helpers/api-test-utils.ts` for reuse across API tests.

- [ ] **Step 2: Write ai-analyze tests**

Mock `@supabase/supabase-js` createClient and global `fetch`. Test the handler from `src/pages/api/ai/analyze.ts`:
- 405 on GET request
- 401 without Authorization header
- 401 with invalid token (getUser returns error)
- 403 when entry's user_id doesn't match authenticated user
- 200 success: mock OpenRouter fetch response, verify entry is updated with AI results
- 500 when OpenRouter fetch fails

- [ ] **Step 3: Write ai-schedule-suggest tests**

Same pattern. Test:
- POST only
- Auth required
- Success: mock OpenRouter response with valid schedule suggestions
- Error: malformed AI response handled gracefully

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/api/`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/helpers/ src/__tests__/api/ai-analyze.test.ts src/__tests__/api/ai-schedule-suggest.test.ts
git commit -m "test: add AI endpoint tests with auth and ownership verification"
```

---

### Task 11a: API route tests - auth callbacks

**Files:**
- Create: `src/__tests__/api/auth-callback.test.ts`
- Create: `src/__tests__/api/google-callback.test.ts`

- [ ] **Step 1: Write auth-callback tests**

Test `src/pages/api/auth/callback.ts`:
- Redirects to /dashboard on success
- Open redirect prevention: `next=https://evil.com` defaults to /dashboard
- Open redirect prevention: `next=//evil.com` defaults to /dashboard
- Valid relative redirect `next=/profile` is preserved
- Error on missing code parameter

- [ ] **Step 2: Write google-callback tests**

Test `src/pages/api/auth/google-callback.ts`:
- Exchanges code for tokens via Google OAuth
- Stores refresh token in user_profiles
- Redirects to settings page on success
- Handles missing code parameter
- Handles token exchange failure

- [ ] **Step 3: Run and commit**

Run: `npx vitest run src/__tests__/api/auth-callback.test.ts src/__tests__/api/google-callback.test.ts`

```bash
git add src/__tests__/api/auth-callback.test.ts src/__tests__/api/google-callback.test.ts
git commit -m "test: add auth callback API route tests"
```

---

### Task 11b: API route tests - RSS and push

**Files:**
- Create: `src/__tests__/api/rss.test.ts`
- Create: `src/__tests__/api/push.test.ts`

- [ ] **Step 1: Write RSS tests**

Test `src/pages/api/rss/parse.ts` and `import.ts`:
- parse: 401 without auth, SSRF blocks localhost/169.254.x.x/10.x.x.x/192.168.x.x, success with valid feed URL (mock fetch)
- import: 401 without auth, success creates entries from feed items

- [ ] **Step 2: Write push tests**

Test subscribe and unsubscribe:
- Both require auth
- Subscribe stores subscription data in DB
- Unsubscribe removes subscription

- [ ] **Step 3: Run and commit**

Run: `npx vitest run src/__tests__/api/rss.test.ts src/__tests__/api/push.test.ts`

```bash
git add src/__tests__/api/rss.test.ts src/__tests__/api/push.test.ts
git commit -m "test: add RSS and push API route tests"
```

---

### Task 11c: API route tests - extension, shortcuts, calendar, export

**Files:**
- Create: `src/__tests__/api/save-from-extension.test.ts`
- Create: `src/__tests__/api/shortcuts-webhook.test.ts`
- Create: `src/__tests__/api/calendar-schedule.test.ts`
- Create: `src/__tests__/api/entries-export.test.ts`

- [ ] **Step 1: Write extension and shortcuts tests**

- `save-from-extension`: CORS headers set from allowlist (not wildcard), OPTIONS returns correct preflight, auth required, creates entry
- `shortcuts-webhook`: token auth via shortcutToken body field, uses service role key, creates entry, rejects invalid token

- [ ] **Step 2: Write calendar and export tests**

- `calendar-schedule`: auth required, invokes edge function, error handling
- `entries-export`: auth required, CSV format returns correct headers, JSON format returns array, pagination works (mock multiple pages), empty result returns empty array/CSV headers only

- [ ] **Step 3: Run and commit**

Run: `npx vitest run src/__tests__/api/`

```bash
git add src/__tests__/api/save-from-extension.test.ts src/__tests__/api/shortcuts-webhook.test.ts src/__tests__/api/calendar-schedule.test.ts src/__tests__/api/entries-export.test.ts
git commit -m "test: add extension, shortcuts, calendar, export API route tests"
```

---

### Task 12: Hook tests - useOfflineSync and useOfflineEntries

**Files:**
- Create: `src/__tests__/hooks/useOfflineSync.test.ts`
- Test: `src/hooks/useOfflineSync.ts` (276 lines)

- [ ] **Step 1: Write hook tests**

Use `renderHook` from `@testing-library/react`. Mock `@/lib/supabase`, `@/lib/offline`, `@/contexts/AuthContext`. The file exports two hooks:

**`useOfflineSync` (lines ~36-101):** Test:
- `syncState`: reflects current sync status
- `triggerSync`: calls syncOfflineQueue
- `hasPendingChanges`: true when offline queue is non-empty
- Online/offline event listeners registered and cleaned up

**`useOfflineEntries` (lines ~103-276):** Test:
- Initial state: loads entries from cache when offline
- `create`: adds entry optimistically, calls API, updates state on success
- `create` failure: reverts optimistic update on API error
- `update`: updates entry optimistically, calls API
- `delete`: removes entry optimistically, calls API
- Multiple rapid operations: cache stays consistent

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/hooks/useOfflineSync.test.ts`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/hooks/useOfflineSync.test.ts
git commit -m "test: add useOfflineSync hook tests"
```

---

### Task 13: Middleware test

**Files:**
- Create: `src/__tests__/middleware.test.ts`
- Test: `src/middleware.ts` (102 lines)

- [ ] **Step 1: Write middleware tests**

Mock `@supabase/ssr` createServerClient. Test the middleware function:

- Unauthenticated user accessing /dashboard -> redirect to /login
- Unauthenticated user accessing /profile -> redirect to /login
- Unauthenticated user accessing / -> pass through
- Authenticated user accessing /login -> redirect to /dashboard
- Authenticated user accessing /signup -> redirect to /dashboard
- Authenticated user accessing /dashboard -> pass through
- Static asset requests -> bypass middleware
- Uses getUser() (verify mock is called, not getSession)

Create mock `NextRequest` and verify `NextResponse.redirect` is called with correct URLs.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/middleware.test.ts`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/middleware.test.ts
git commit -m "test: add middleware route protection tests"
```

---

### Task 14: Component tests - Navigation

**Files:**
- Create: `src/__tests__/components/Sidebar.test.tsx`
- Create: `src/__tests__/components/BottomNav.test.tsx`
- Create: `src/__tests__/components/MobileHeader.test.tsx`

- [ ] **Step 1: Write navigation component tests**

Mock `next/navigation` (usePathname, useRouter). Mock `@/contexts/AuthContext`.

- `Sidebar`: renders nav links (Dashboard, Calendar, Settings, Profile), highlights active link based on pathname, renders user info
- `BottomNav`: renders mobile navigation tabs, marks active tab
- `MobileHeader`: renders logo/title, hamburger menu button, toggles mobile menu

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/__tests__/components/Sidebar.test.tsx src/__tests__/components/BottomNav.test.tsx src/__tests__/components/MobileHeader.test.tsx`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/components/Sidebar.test.tsx src/__tests__/components/BottomNav.test.tsx src/__tests__/components/MobileHeader.test.tsx
git commit -m "test: add navigation component tests"
```

---

### Task 15: Component tests - Features

**Files:**
- Create: `src/__tests__/components/CalendarView.test.tsx`
- Create: `src/__tests__/components/QuickAddModal.test.tsx`
- Create: `src/__tests__/components/Onboarding.test.tsx`

- [ ] **Step 1: Write feature component tests**

- `CalendarView`: renders calendar grid, selects date on click, displays entries for selected date
- `QuickAddModal`: opens on trigger, URL input field works, form submission calls onSubmit, closes on cancel/backdrop
- `Onboarding`: renders first step, advances through steps, completes flow

Mock any Supabase calls and auth context as needed.

- [ ] **Step 2: Run and commit**

Run: `npx vitest run src/__tests__/components/CalendarView.test.tsx src/__tests__/components/QuickAddModal.test.tsx src/__tests__/components/Onboarding.test.tsx`

```bash
git add src/__tests__/components/CalendarView.test.tsx src/__tests__/components/QuickAddModal.test.tsx src/__tests__/components/Onboarding.test.tsx
git commit -m "test: add feature component tests"
```

---

### Task 16: Component tests - Settings

**Files:**
- Create: `src/__tests__/components/NotificationSettings.test.tsx`
- Create: `src/__tests__/components/RSSFeedManager.test.tsx`
- Create: `src/__tests__/components/ShortcutSetup.test.tsx`
- Create: `src/__tests__/components/CalendarConnection.test.tsx`

- [ ] **Step 1: Write settings component tests**

- `NotificationSettings`: renders toggle controls, toggles change state
- `RSSFeedManager`: renders feed list, add feed form, remove feed button functionality
- `ShortcutSetup`: displays token (masked), copy button copies to clipboard, regenerate creates new token
- `CalendarConnection`: shows connect button when disconnected, shows disconnect when connected, constructs OAuth URL

Mock Supabase client and clipboard API.

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/__tests__/components/NotificationSettings.test.tsx src/__tests__/components/RSSFeedManager.test.tsx src/__tests__/components/ShortcutSetup.test.tsx src/__tests__/components/CalendarConnection.test.tsx
git add src/__tests__/components/
git commit -m "test: add settings component tests"
```

---

### Task 17: Component tests - UI components

**Files:**
- Create: `src/__tests__/components/CommandPalette.test.tsx`
- Create: `src/__tests__/components/Modal.test.tsx`
- Create: `src/__tests__/components/Toast.test.tsx`
- Create: `src/__tests__/components/ScrollProgress.test.tsx`
- Create: `src/__tests__/components/OfflineIndicator.test.tsx`
- Create: `src/__tests__/components/EmptyState.test.tsx`
- Create: `src/__tests__/components/Skeleton.test.tsx`

- [ ] **Step 1: Write UI component tests**

These are mostly presentational. Test rendering and key interactions:
- `CommandPalette`: opens with keyboard shortcut (Cmd+K), renders search input, filters results, executes action on selection, closes on Escape
- `Modal`: renders when open, closes on backdrop click, closes on Escape, renders children
- `Toast`: renders message, auto-dismisses after timeout, manual dismiss works
- `ScrollProgress`: renders progress bar, updates width based on scroll position
- `OfflineIndicator`: shows when navigator.onLine is false, hides when true
- `EmptyState`: renders title, description, and action button
- `Skeleton`: renders with correct dimensions and animation class

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/__tests__/components/CommandPalette.test.tsx src/__tests__/components/Modal.test.tsx src/__tests__/components/Toast.test.tsx src/__tests__/components/ScrollProgress.test.tsx src/__tests__/components/OfflineIndicator.test.tsx src/__tests__/components/EmptyState.test.tsx src/__tests__/components/Skeleton.test.tsx
git add src/__tests__/components/
git commit -m "test: add UI component tests"
```

---

### Task 18: Component tests - PWA and Sharing

**Files:**
- Create: `src/__tests__/components/ServiceWorkerRegistration.test.tsx`
- Create: `src/__tests__/components/InstallPrompt.test.tsx`
- Create: `src/__tests__/components/ShareSheet.test.tsx`

- [ ] **Step 1: Write PWA and sharing tests**

- `ServiceWorkerRegistration`: mock `navigator.serviceWorker.register`, verify registration called, interval created for updates, cleanup on unmount clears interval
- `InstallPrompt`: mock `beforeinstallprompt` event, shows install button when event fires, calls `prompt()` on click, hides after install
- `ShareSheet`: renders share options (copy link, Twitter, email), copy button copies URL to clipboard, native share calls `navigator.share` when available

- [ ] **Step 2: Run and commit**

```bash
npx vitest run src/__tests__/components/ServiceWorkerRegistration.test.tsx src/__tests__/components/InstallPrompt.test.tsx src/__tests__/components/ShareSheet.test.tsx
git add src/__tests__/components/
git commit -m "test: add PWA and sharing component tests"
```

---

### Task 19: Coverage verification and cleanup

**Files:**
- Modify: `vitest.config.ts` (if needed)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: all tests pass (should be 300+ tests now)

- [ ] **Step 2: Run coverage report**

Run: `npm run test:coverage 2>&1 | tail -30`
Check the summary line for overall coverage percentage. Target: 80%+

- [ ] **Step 3: Identify coverage gaps**

If below 80%, check the coverage report for uncovered files/lines:
Run: `npm run test:coverage -- --reporter=text 2>&1 | grep -E "^[^|]*(0|[1-7][0-9])\.[0-9]+%" | head -20`

Add targeted tests for any files below 50% coverage.

- [ ] **Step 4: Fix any remaining gaps and re-run**

Write additional tests for uncovered branches/lines identified in step 3.

- [ ] **Step 5: Final verification**

Run: `npm run typecheck && npm run test && npm run build 2>&1 | tail -5`
Expected: typecheck clean, all tests pass, build succeeds

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: achieve 80%+ test coverage across codebase"
```

# Test Coverage + Product Work Design Spec

**Date:** 2026-03-23
**Scope:** Full test coverage push (80%+ target) + 3 product work items
**Stack:** Next.js 15.5, React 19, TypeScript 5.9, Vitest, Testing Library, Supabase

---

## Product Work

### 1. Notification Toggles (Wire to Backend)

**Current state:** Profile page (`src/app/profile/page.tsx`) renders three `NotificationToggle` components with local `useState` only. Changes are lost on reload. Current code references a `user_preferences` table via `updateUserPreference()` but this table is not in the schema.

**DB columns (already exist on `user_profiles`):** `notification_email`, `notification_weekly_digest`, `notification_ai_insights`.

**Changes:**
- Remove `updateUserPreference()` references (non-existent table)
- Load current notification preferences from the user profile (already fetched on mount via `loadProfile`)
- Pass profile values as `defaultChecked` instead of hardcoded booleans
- On toggle change, call `updateUserProfile(user.id, { [field]: checked })` from `src/services/api.ts`
- Add subtle save indicator (brief "Saved" text or checkmark that fades)
- Handle optimistic update: toggle immediately, revert on API error

**Files modified:**
- `src/app/profile/page.tsx` -- wire NotificationToggle to profile state and updateUserProfile

### 2. Split page.tsx (Extract Inline Components)

**Current state:** `src/app/page.tsx` is 698 lines with 7 inline components.

**Extraction plan:**
- `src/components/home/TypeBadge.tsx` -- TypeIcon + TypeLabel (small, combined)
- `src/components/home/ContentCard.tsx` -- list view card
- `src/components/home/ContentCardGrid.tsx` -- grid view card
- `src/components/home/SchedulePanel.tsx` -- right sidebar schedule view
- `src/components/home/DigestPanel.tsx` -- right sidebar AI digest
- `src/components/home/types.ts` -- shared types (DemoEntry, etc.)
- `src/app/page.tsx` -- keeps Home orchestrator (~280 lines), imports from above

**Rules:**
- No behavior changes, pure extraction
- Props typed explicitly (no `any`)
- Each extracted component is a named export
- Shared types go in `types.ts`

### 3. Export Streaming

**Current state:** `exportEntries()` in `src/services/api.ts` calls `getEntries(userId, { limit: 10000 })`, builds entire JSON/CSV string in memory, creates a Blob.

**New design:**
- New API route: `POST /api/entries/export` (new directory `src/pages/api/entries/`)
  - Accepts `{ format: 'json' | 'csv' }` in body
  - Auth via Bearer token (consistent with other API routes)
  - Streams response using paginated Supabase queries (1000 rows per page)
  - Sets appropriate Content-Type and Content-Disposition headers
  - For CSV: streams header row, then data rows per page
  - For JSON: streams as JSON array with chunked writes
- Client-side `exportEntries()` updated to call the API route and trigger browser download
- Body size limit config: `{ bodyParser: { sizeLimit: '1mb' } }`

**Files created:**
- `src/pages/api/entries/export.ts`

**Files modified:**
- `src/services/api.ts` -- update `exportEntries()` to use streaming endpoint

---

## Test Coverage Plan

**Target:** 80%+ line coverage
**Framework:** Vitest + Testing Library + jsdom
**Principles:**
- Test behavior, not implementation
- Mock at the boundary (Supabase client, fetch, navigator APIs)
- Every test file: happy path, error path, edge cases
- No snapshot tests
- Use existing mock infrastructure in `src/__tests__/mocks/supabase.ts`

**Coverage config:** Update `vitest.config.ts` to remove exclusions for `src/pages/**`, `src/services/**`, `src/hooks/**`, `src/components/pwa/**`, `src/components/ui/**` so these files count toward the 80% target.

### Test File Inventory

#### Library Tests (src/__tests__/lib/)

**`auth.test.ts`** -- `src/lib/auth.ts` (270 lines)
- signUpWithEmail: success, duplicate email, weak password, validation failure
- signInWithEmail: success, wrong password, unregistered email
- signInWithMagicLink: success, invalid email
- signInWithOAuth: Google, GitHub provider construction
- resetPassword: success, invalid email
- updatePassword: success, error
- getSession: returns session, returns null
- getUser: returns user, returns null
- signOut: success, error handling
- validateEmail: valid, invalid, edge cases
- validatePassword: strength checks, edge cases
- Auth error messages tested indirectly through public function error returns

**`offline.test.ts`** -- `src/lib/offline.ts` (285 lines)
- queueOfflineAction: adds action, persists to localStorage
- getOfflineQueue: reads from localStorage, handles empty/corrupt data
- removeFromQueue: removes by ID
- syncOfflineQueue: processes queue, increments retries on failure, filters out max-retried actions, saves modified queue (verifies bug fix)
- cacheEntries/getCachedEntries: read/write cycle
- clearOfflineData: clears all offline state
- isOnline: navigator.onLine check
- applyOptimisticCreate/Update/Delete: state transformations
- rollbackOptimisticUpdate: restores previous state
- setupOfflineSync: registers online/offline event listeners
- getLastSyncTime/getSyncStatus: sync state queries

**`errors.test.ts`** -- `src/lib/errors.ts` (343 lines)
- AppError: construction with code/message/details, extends Error
- ErrorCode: constant values exist and are strings
- parsePostgrestError: maps Postgres error codes to AppError
- parseError: handles Error, AppError, string, unknown inputs
- isRetryable: identifies retryable error codes
- withRetry: retries on retryable errors, stops on non-retryable
- logError: logs with appropriate severity
- errorToToast: converts errors to toast-friendly format
- handleApiResponse: wraps API responses with error handling

**`rss-parser.test.ts`** -- `src/lib/rss-parser.ts` (161 lines)
- parseRSSFeed: valid RSS 2.0, valid Atom, malformed XML returns null
- RSS item extraction: title, link, description, content:encoded, pubDate, categories, guid, image
- Atom entry extraction: same fields mapped from Atom schema
- isValidFeedUrl: http/https only, rejects other protocols
- Edge cases: empty feed, missing required fields

**`google-calendar.test.ts`** -- `src/lib/google-calendar.ts` (85 lines)
- GoogleCalendar class: signIn() constructs OAuth URL with correct scopes, redirect URI, state
- signOut: clears calendar state
- Mock window.location, sessionStorage

**`push-notifications.test.ts`** -- `src/lib/push-notifications.ts` (165 lines)
- isPushSupported: checks navigator.serviceWorker and PushManager
- getNotificationPermission: returns current permission state
- requestNotificationPermission: granted, denied, not supported
- subscribeToPush: creates subscription, returns endpoint + keys
- unsubscribeFromPush: removes subscription
- isSubscribedToPush: checks current subscription
- showLocalNotification: constructs Notification with correct options
- scheduleNotification: sets timeout, returns timer ID
- Mock navigator.serviceWorker, Notification API, PushManager

#### Service Tests (src/__tests__/services/)

**`api.test.ts`** -- `src/services/api.ts` (505 lines)
- getUserProfile: success, not found, error
- updateUserProfile: success, partial update, error
- createUserProfile: success, duplicate
- createEntry: success, validation, error
- getEntries: success with filters (status, category, search), pagination, empty result
- getEntry: success, not found
- updateEntry: success, error
- deleteEntry: success, error
- bulkUpdateEntries: success, partial failure
- bulkDeleteEntries: success, error
- getDashboardStats: view success, fallback computation, error
- exportEntries: triggers download via new streaming endpoint
- ApiError class: construction, properties
- checkSupabase: throws when client unavailable

#### API Route Tests (src/__tests__/api/)

**`ai-analyze.test.ts`** -- `src/pages/api/ai/analyze.ts`
- POST only (405 on GET)
- 401 without Bearer token
- 401 with invalid token
- 403 when user doesn't own entry
- 200 success: verifies OpenRouter called, entry updated
- 500 on OpenRouter failure
- Body size limit enforced

**`ai-schedule-suggest.test.ts`** -- `src/pages/api/ai/schedule-suggest.ts`
- POST only
- Auth required
- Prompt construction includes user content (sanitized)
- Response parsing: valid suggestions, malformed AI response
- Error handling

**`auth-callback.test.ts`** -- `src/pages/api/auth/callback.ts`
- Code exchange success, redirect to /dashboard
- Open redirect prevention: rejects absolute URLs, protocol-relative URLs
- Valid relative redirect preserved
- Error handling on code exchange failure

**`rss.test.ts`** -- `src/pages/api/rss/parse.ts` + `import.ts`
- parse: auth required, SSRF blocking (localhost, 169.254.x.x, 10.x.x.x, 192.168.x.x), valid feed parsing
- import: auth required, feed fetch + entry creation, duplicate handling

**`push.test.ts`** -- `src/pages/api/push/subscribe.ts` + `unsubscribe.ts`
- subscribe: auth required, stores subscription data
- unsubscribe: auth required, removes subscription

**`save-from-extension.test.ts`** -- `src/pages/api/save-from-extension.ts`
- CORS headers (allowlist, not wildcard)
- OPTIONS preflight
- Auth required
- Entry creation from extension payload

**`shortcuts-webhook.test.ts`** -- `src/pages/api/shortcuts/webhook.ts`
- Token auth (shortcutToken in body)
- Entry creation
- Invalid/missing token rejected
- Uses service role key

**`calendar-schedule.test.ts`** -- `src/pages/api/calendar/schedule.ts`
- Auth required
- Edge function invocation
- Error handling

**`entries-export.test.ts`** -- `src/pages/api/entries/export.ts` (new)
- Auth required
- CSV streaming with correct headers
- JSON streaming
- Pagination (multiple pages)
- Empty result

#### Hook Tests (src/__tests__/hooks/)

**`useOfflineSync.test.ts`** -- `src/hooks/useOfflineSync.ts` (276 lines)
- Initial load from cache
- Create entry: optimistic update, API success, API failure rollback
- Update entry: optimistic update, sync
- Delete entry: optimistic removal, sync
- Online/offline transitions trigger sync
- Cache consistency after rapid operations

#### Middleware Test (src/__tests__/)

**`middleware.test.ts`** -- `src/middleware.ts` (102 lines)
- Protected routes (/dashboard, /settings, /profile) redirect to /login when unauthenticated
- Public routes (/, /login, /signup) pass through
- Auth-only routes (/login, /signup) redirect to /dashboard when authenticated
- Static assets bypass middleware
- Uses getUser() not getSession()

#### Component Tests (src/__tests__/components/)

**Navigation:**
- `Sidebar.test.tsx` -- renders nav links, active state, collapse behavior
- `BottomNav.test.tsx` -- renders mobile nav, active tab
- `MobileHeader.test.tsx` -- renders header, menu toggle

**Features:**
- `CalendarView.test.tsx` -- date selection, entry display by date
- `QuickAddModal.test.tsx` -- modal open/close, URL input, form submission
- `Onboarding.test.tsx` -- step progression, completion

**Settings:**
- `NotificationSettings.test.tsx` -- toggle rendering, state changes
- `RSSFeedManager.test.tsx` -- feed list, add feed, remove feed
- `ShortcutSetup.test.tsx` -- token display, copy, regenerate
- `CalendarConnection.test.tsx` -- connect/disconnect flow, OAuth URL

**UI:**
- `CommandPalette.test.tsx` -- open/close, search, action execution
- `Modal.test.tsx` -- open/close, backdrop click, escape key
- `Toast.test.tsx` -- show/dismiss, auto-dismiss timer
- `ScrollProgress.test.tsx` -- scroll position tracking
- `OfflineIndicator.test.tsx` -- online/offline display
- `EmptyState.test.tsx` -- renders message and action
- `Skeleton.test.tsx` -- renders placeholder UI

**PWA:**
- `ServiceWorkerRegistration.test.tsx` -- registration, update interval, cleanup
- `InstallPrompt.test.tsx` -- beforeinstallprompt handling, install button

**Sharing:**
- `ShareSheet.test.tsx` -- native share, copy link, share options

---

## Execution Order

1. Product work (creates/modifies code before we test it):
   a. Wire notification toggles
   b. Split page.tsx into components
   c. Add export streaming endpoint + update client

2. Test coverage (bottom-up):
   a. Library tests (auth, offline, errors, rss-parser, google-calendar, push-notifications)
   b. Service layer test (api.ts)
   c. API route tests (all endpoints)
   d. Hook tests (useOfflineSync)
   e. Middleware test
   f. Component tests (navigation, features, settings, UI, PWA, sharing)
   g. Update vitest.config.ts coverage exclusions
   h. Verify 80%+ coverage with `npm run test:coverage`

# ScrollLater Architecture Review

**Date:** 2026-03-13
**Scope:** scrolllater-frontend/, browser-extension/
**Framework:** Next.js 15 (App Router) + Supabase + PWA

---

## Executive Summary

ScrollLater is a well-architected content curation platform with comprehensive PWA support, offline-first design, and multi-channel entry points (web, browser extension, Apple Shortcuts, share targets). The codebase demonstrates solid separation of concerns and type safety. Key areas requiring attention include rate limiting, pagination, and request validation.

---

## 1. Next.js Structure & Routing

### App Router Configuration
**Rating:** Low (Good Pattern)

- **Root Layout:** `src/app/layout.tsx:1-77`
  - AuthProvider, ToastProvider, OfflineIndicator wrapping
  - PWA metadata with manifest reference
  - Vercel Analytics integrated
  - ServiceWorkerRegistration & InstallPrompt at root level

### Page Structure
| Route | Purpose | File |
|-------|---------|------|
| `/` | Landing page | `src/app/page.tsx` |
| `/dashboard` | Main content hub | `src/app/dashboard/page.tsx` |
| `/dashboard/settings` | Settings with AI, RSS, calendar | `src/app/dashboard/settings/page.tsx` |
| `/entry/[id]` | Dynamic entry detail | `src/app/entry/[id]/page.tsx` |
| `/login`, `/signup` | Auth pages | `src/app/login/`, `src/app/signup/` |
| `/forgot-password`, `/reset-password` | Password recovery | `src/app/forgot-password/`, `src/app/reset-password/` |
| `/profile` | User profile + export | `src/app/profile/page.tsx` |
| `/offline` | Offline fallback | `src/app/offline/page.tsx` |
| `/share-target` | PWA share target | `src/app/share-target/page.tsx` |

### API Routes (Pages API)
**Location:** `src/pages/api/`

| Endpoint | Purpose |
|----------|---------|
| `/auth/callback.ts` | OAuth code exchange |
| `/auth/google-callback.ts` | Google Calendar OAuth |
| `/ai/analyze.ts` | Content AI analysis |
| `/ai/schedule-suggest.ts` | AI scheduling suggestions |
| `/calendar/schedule.ts` | Calendar event creation |
| `/push/subscribe.ts`, `/push/unsubscribe.ts` | Push notification management |
| `/rss/parse.ts`, `/rss/import.ts` | RSS feed handling |
| `/shortcuts/webhook.ts` | Apple Shortcuts integration |
| `/save-from-extension.ts` | Browser extension API |

### Middleware
**File:** `src/middleware.ts:1-102`

- Server-side session validation using Supabase SSR
- Protected routes: `/dashboard`, `/settings`, `/profile`
- Auth routes redirect to dashboard if authenticated
- Full cookie handler for session persistence
- Matcher excludes static assets, images, API routes

**Rating:** Low (Good Implementation)

---

## 2. Supabase Integration

### Client Architecture
**File:** `src/lib/supabase.ts` (78 lines)

Three client types with proper separation:

| Client | Purpose | Security |
|--------|---------|----------|
| `createSupabaseClient()` | Browser client | RLS enforced |
| `createServerSupabaseClient()` | Server components | Cookie-based auth |
| `createSupabaseServiceClient()` | Privileged operations | Service role key |

- Configuration validation via `isSupabaseConfigured()`
- Mock client fallback for unconfigured environments

### Database Schema
**File:** `src/lib/database.types.ts` (357 lines)

**Tables:**
- `user_profiles` - User metadata, tokens, preferences, stats
- `entries` - Main content with AI analysis fields
- `categories` - System & user categories
- `processing_queue` - AI task queue with retry tracking
- `rate_limits` - Rate limiting table (unused)

**Views:**
- `entry_summaries` - Denormalized for dashboard
- `user_dashboard_stats` - Aggregated statistics

**Entry Schema Highlights:**
```typescript
// AI fields
ai_summary, ai_category, ai_tags, ai_confidence_score, ai_schedule_suggestions
// User fields
user_category, user_tags, user_notes
// Status: inbox | scheduled | completed | archived
```

**Rating:** Low (Well Designed)

---

## 3. State Management

### AuthContext
**File:** `src/contexts/AuthContext.tsx` (232 lines)

| Feature | Implementation | Line |
|---------|---------------|------|
| Session auto-refresh | 60-second interval | 162 |
| Hydration mismatch prevention | Mounted state check | 27-30 |
| Auto profile creation | `ensureUserProfile()` | 32-52 |
| Shortcut token generation | `'sl_' + UUID` | 43 |
| Auth state listener | `onAuthStateChange` | 131 |
| Auto signout on failure | Refresh token check | 76 |

### API Service Layer
**File:** `src/services/api.ts` (492 lines)

- Typed wrapper around Supabase queries
- Discriminated union result type: `{ data: T, error: null } | { data: null, error: ApiError }`
- CRUD for user_profiles, entries, categories
- Dashboard stats aggregation
- JSON/CSV export

**Rating:** Low (Good Pattern)

---

## 4. PWA Implementation

### Manifest
**File:** `public/manifest.json` (112 lines)

| Feature | Configuration |
|---------|--------------|
| Display | `standalone` |
| Start URL | `/dashboard` |
| Icons | 8 SVG sizes (72-512px) + maskable |
| Shortcuts | Quick Save, View Inbox, Scheduled |
| Share Target | Accepts title, text, url |
| Edge Side Panel | 400px preferred width |
| Launch Handler | `navigate-existing` |

### Service Worker
**File:** `public/sw-custom.js` (257 lines)

**Caching Strategies:**
| Resource | Strategy |
|----------|----------|
| Navigation | Network-first with offline fallback |
| API calls | Network-only with cached fallback |
| Static assets | Stale-while-revalidate |

**Features:**
- Precaches critical assets on install
- Background sync for offline entries (IndexedDB)
- Push notification handling with click actions
- `SKIP_WAITING` message for update prompt

### ServiceWorkerRegistration
**File:** `src/components/pwa/ServiceWorkerRegistration.tsx` (83 lines)

- Registers `/sw-custom.js` with scope `/`
- Detects updates via `updatefound` event
- Hourly update checks (line 35-37)
- Auto-reload on controller change

### Push Notifications
**File:** `src/lib/push-notifications.ts` (170 lines)

- VAPID key conversion
- Subscribe/unsubscribe with PushManager
- Local notification fallback
- Scheduled notifications via setTimeout

**Rating:** Low (Comprehensive PWA)

---

## 5. Component Architecture

### Directory Structure
```
src/components/
├── auth/           # LoginForm
├── dashboard/      # Dashboard, EntryCard, FilterTabs, SearchBar, SmartScheduler, StatsCards
├── forms/          # EntryForm
├── features/       # CalendarView, Onboarding, QuickAddModal
├── navigation/     # BottomNav, MobileHeader, Sidebar
├── pwa/            # InstallPrompt, ServiceWorkerRegistration
├── settings/       # CalendarConnection, NotificationSettings, RSSFeedManager, ShortcutSetup
├── sharing/        # ShareSheet
├── test/           # AITestComponent
└── ui/             # Button, Card, Input, Modal, CommandPalette, Toast, etc.
```

### Dashboard Pattern
**File:** `src/components/dashboard/Dashboard.tsx`

- 'use client' component
- Real-time subscription via `supabase.channel` (lines 75-94)
- Entry filtering by status & search
- Refetch on user change

### UI Component Library
- Tailwind + Radix UI primitives
- Toast system with provider pattern
- Command palette with keyboard navigation

**Rating:** Low (Clean Organization)

---

## 6. Browser Extension

### Manifest
**File:** `browser-extension/manifest.json` (79 lines)

- Manifest V3
- Permissions: activeTab, storage, contextMenus, notifications
- Host permissions: scrolllater.com, localhost:3000
- Commands: `Ctrl+Shift+S` (popup), `Alt+S` (quick save)

### Background Service Worker
**File:** `browser-extension/src/background/background.js` (186 lines)

**Context Menu Items:**
1. Save page
2. Save link
3. Save selection
4. Save image

**Communication:**
- Sends `GET_PAGE_METADATA` to content script
- Handles `SAVE_CONTENT`, `GET_AUTH_STATUS`, `SET_AUTH`, `LOGOUT`
- Uses Chrome Storage: `authToken`, `apiUrl`, `user`, `recentSaveCount`

**API Integration:**
- Endpoint: `POST /api/save-from-extension`
- Bearer token authentication
- Metadata: favicon, image, author, publishedDate, readingTime, siteName, pageType

### Finding: Hardcoded API URL
**Severity:** Medium
**File:** `browser-extension/src/background/background.js:3`
**Issue:** `API_BASE_URL` hardcoded; should support dynamic configuration
**Fix:** Use Chrome Storage for URL configuration

---

## 7. Offline & Sync Architecture

### Offline Queue
**File:** `src/lib/offline.ts` (288 lines)

**Storage Keys:**
- `scrolllater_offline_queue` - Pending actions
- `scrolllater_entries_cache_{userId}` - Cached entries
- `scrolllater_last_sync` - Last sync timestamp

**Features:**
| Feature | Implementation |
|---------|---------------|
| Action types | Create, update, delete |
| Retry logic | Max 3 attempts |
| Optimistic updates | `applyOptimisticCreate/Update/Delete` |
| Rollback | `rollbackOptimisticUpdate()` |
| Sync trigger | Window `online` event |

### Service Worker Sync
- IndexedDB: `scrolllater-offline` with `pending-entries`
- Background sync tag: `sync-entries`
- Fallback retry mechanism (sw-custom.js:128-147)

**Rating:** Low (Robust Offline Support)

---

## 8. AI Features

### AIProcessor
**File:** `src/lib/ai-processor.ts` (255 lines)

| Feature | Detail |
|---------|--------|
| Provider | OpenRouter.ai |
| Model | Claude 3 Haiku |
| Temperature | 0.3 |
| Output | title, summary, category, tags, confidence, sentiment, urgency, readTime |

**Fallback:** Simple text-based analysis when AI fails (lines 172-191)

### Smart Scheduler
**File:** `src/lib/smart-scheduler.ts`

- Invokes Supabase Edge Function `ai-schedule-suggest`
- Time slot scoring: duration, preferences, category optimal times, conflicts, user patterns

---

## 9. Authentication Flow

### Auth Library
**File:** `src/lib/auth.ts`

| Function | Purpose | Lines |
|----------|---------|-------|
| `signUpWithEmail()` | Email/password signup | 22-61 |
| `signInWithEmail()` | Email/password login | 63-82 |
| `signInWithMagicLink()` | Passwordless login | 84-105 |
| `signInWithOAuth()` | Google/GitHub OAuth | 107-128 |
| `resetPassword()` | Password reset email | 130-148 |
| `updatePassword()` | New password set | 150-168 |

### Session Management
- Auto-refresh every 60s in AuthContext
- 5-minute warning before expiration (lines 113-121)
- Auto-signout on refresh failure

---

## 10. Critical Issues

### 10.1 No Pagination on Entry Fetch
**Severity:** Critical
**File:** `src/components/dashboard/Dashboard.tsx:37-41`
**Issue:** Dashboard fetches all entries without pagination
**Impact:** Performance degradation at scale
**Fix:** Implement cursor-based pagination with limit

### 10.2 Rate Limits Table Unused
**Severity:** Critical
**File:** `src/lib/database.types.ts` (rate_limits table exists)
**Issue:** Rate limiting infrastructure exists but no implementation
**Impact:** AI cost overruns, abuse potential
**Fix:** Implement rate limiting middleware using existing table

### 10.3 Service Role Key Usage Pattern
**Severity:** Critical
**File:** `src/pages/api/ai/analyze.ts:19-20`
**Issue:** Service role key used without user context validation
**Impact:** Authorization bypass potential
**Fix:** Validate user ownership before operations

---

## 11. High Priority Issues

### 11.1 Missing Request Validation
**Severity:** High
**Files:** All API routes in `src/pages/api/`
**Issue:** No JSON schema validation library (e.g., Zod)
**Fix:** Add `safeParse()` validation on all endpoints

### 11.2 Service Worker Cache Versioning
**Severity:** High
**File:** `public/sw-custom.js:2`
**Issue:** Cache name `scrolllater-v1` hardcoded
**Fix:** Version cache by build hash or date

### 11.3 RSS Parser Robustness
**Severity:** High
**File:** `src/pages/api/rss/parse.ts:82-84`
**Issue:** Regex-based XML parsing, prone to edge cases
**Fix:** Use proper XML parser (fast-xml-parser, xml2js)

### 11.4 Google Calendar Edge Function Dependency
**Severity:** High
**File:** `src/pages/api/calendar/schedule.ts`
**Issue:** External Edge Function dependency without visible implementation
**Fix:** Document or include Edge Function code

---

## 12. Medium Priority Issues

### 12.1 Email Validation
**Severity:** Medium
**File:** `src/lib/auth.ts:246`
**Issue:** Simple regex doesn't handle RFC 5322 edge cases
**Fix:** Use `email-validator` library

### 12.2 Offline Queue Cleanup
**Severity:** Medium
**File:** `src/lib/offline.ts`
**Issue:** Failed entries stay in queue indefinitely
**Fix:** Add TTL or periodic cleanup

### 12.3 Demo Data Remnants
**Severity:** Medium
**Files:** `demo-data.ts`, `demo-data.test.ts`
**Issue:** Demo mode code should be gated or removed
**Fix:** Archive or feature-flag demo code

### 12.4 No Audit Logging
**Severity:** Medium
**Issue:** No tracking of user actions for compliance/debugging
**Fix:** Add audit table with database triggers

### 12.5 Sensitive Debug Logging
**Severity:** Medium
**Files:** `src/pages/api/auth/google-callback.ts:83-87`, `src/pages/api/ai/analyze.ts:11-13`
**Issue:** API key info logged in production
**Fix:** Remove or gate behind `NODE_ENV === 'development'`

---

## 13. Low Priority Issues

### 13.1 Browser Extension URL Configuration
**Severity:** Low
**File:** `browser-extension/src/background/background.js:3`
**Issue:** Hardcoded API URL
**Fix:** Use Chrome Storage for configuration

### 13.2 Missing .env.example
**Severity:** Low
**Issue:** No tracked template for developers
**Fix:** Create `.env.example` with placeholder values

---

## 14. Testing Infrastructure

### Framework
| Tool | Purpose |
|------|---------|
| Vitest | Unit tests with UI |
| Playwright | E2E tests |
| Testing Library | Component tests |

### Test Coverage
```
src/__tests__/
├── components/     # 7 component tests
├── lib/            # 6 library tests
├── pages/          # 1 page test
├── mocks/          # Supabase mock
└── setup.tsx       # Test setup
```

**E2E:** `e2e/` directory with Playwright config

---

## 15. Architecture Strengths

1. **Clean Separation** - Supabase client, auth context, API service layer are well-isolated
2. **Offline-First** - Comprehensive queue with optimistic updates
3. **PWA Complete** - Manifest, service worker, push, install prompts
4. **Type Safety** - Full TypeScript with Supabase types, discriminated unions
5. **Real-time** - Supabase subscriptions for live updates
6. **Multi-Channel** - Web, extension, Shortcuts, share targets
7. **Error Handling** - Fallback AI, retry logic with exponential backoff

---

## 16. Prioritized Action Plan

### Immediate (This Sprint)
1. **Implement pagination** on dashboard entry fetch
2. **Add rate limiting** using existing `rate_limits` table
3. **Add request validation** with Zod on all API routes
4. **Remove sensitive logging** from production

### Short-term (Next 2 Sprints)
5. **Version service worker cache** by build hash
6. **Replace regex XML parser** with proper library
7. **Add user ownership validation** in service role operations
8. **Document or include** Edge Function code

### Medium-term (Next Quarter)
9. **Add audit logging** table and triggers
10. **Implement offline queue cleanup** with TTL
11. **Add .env.example** for developer onboarding
12. **Review and remove** demo data code

---

*Report generated by automated codebase analysis*

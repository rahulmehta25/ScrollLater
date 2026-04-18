# ScrollLater Security Audit

**Date:** 2026-03-13
**Scope:** scrolllater-frontend/, browser-extension/
**Total Findings:** 23 vulnerabilities

---

## Executive Summary

This security audit identified **23 vulnerabilities** across the ScrollLater codebase:

| Severity | Count |
|----------|-------|
| Critical | 6 |
| High | 7 |
| Medium | 6 |
| Low | 4 |

Key areas of concern: CORS misconfiguration, open redirects, prompt injection, missing authorization checks, and sensitive data logging.

---

## Critical Vulnerabilities

### C1. Open CORS Policy on Extension API
**Severity:** CRITICAL
**File:** `src/pages/api/save-from-extension.ts:41-42`

**Vulnerable Code:**
```typescript
res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
```

**Impact:** Any website can make requests on behalf of authenticated users. Combined with bearer token authentication, enables cross-site request forgery and unauthorized data exfiltration.

**Fix:**
```typescript
const allowedOrigins = [
  'chrome-extension://YOUR_EXTENSION_ID',
  'moz-extension://YOUR_EXTENSION_ID',
  process.env.NEXT_PUBLIC_APP_URL
];
const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

---

### C2. Unvalidated Redirect in Auth Callback
**Severity:** CRITICAL
**File:** `src/pages/api/auth/callback.ts:65`

**Vulnerable Code:**
```typescript
const redirectTo = next ? decodeURIComponent(next as string) : '/dashboard'
return res.redirect(redirectTo)
```

**Impact:** Open redirect allows phishing attacks and session hijacking. Attacker can craft URL like `?next=https://evil.com` to redirect users after login.

**Fix:**
```typescript
const ALLOWED_REDIRECTS = ['/dashboard', '/settings', '/profile'];
const redirectTo = next && ALLOWED_REDIRECTS.some(r =>
  decodeURIComponent(next as string).startsWith(r)
) ? decodeURIComponent(next as string) : '/dashboard';
```

---

### C3. Sensitive Data Logging in Production
**Severity:** CRITICAL
**File:** `src/pages/api/ai/analyze.ts:11-13`

**Vulnerable Code:**
```typescript
console.log('DEBUG: OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('DEBUG: OPENROUTER_API_KEY length:', process.env.OPENROUTER_API_KEY?.length || 0);
console.log('DEBUG: OPENROUTER_API_KEY prefix:', process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...');
```

**Additional Location:** `src/pages/api/auth/google-callback.ts:83-84` logs `GOOGLE_CLIENT_ID`

**Impact:** API key enumeration, information disclosure in server logs.

**Fix:** Remove all debug logging of sensitive values:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('DEBUG: API key configured:', !!process.env.OPENROUTER_API_KEY);
}
```

---

### C4. Prompt Injection in AI Schedule Suggest
**Severity:** CRITICAL
**File:** `src/pages/api/ai/schedule-suggest.ts:110`

**Vulnerable Code:**
```typescript
${entries.map((entry, index) =>
  `${index + 1}. ${entry.content.substring(0, 100)}... (Category: ${entry.category}, Urgency: ${entry.urgency})`
).join('\n')}
```

**Impact:** User-controlled `entry.content` is directly interpolated into AI prompts. Attacker can craft content with prompt injection payloads to manipulate AI behavior.

**Fix:**
```typescript
// Sanitize user content before AI prompt
function sanitizeForPrompt(text: string): string {
  return text
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .substring(0, 100);
}

// Use structured data format
const entriesJson = JSON.stringify(entries.map(e => ({
  index: e.index,
  content: sanitizeForPrompt(e.content),
  category: e.category,
  urgency: e.urgency
})));
```

---

### C5. Prompt Injection in AI Processor
**Severity:** CRITICAL
**File:** `src/lib/ai-processor.ts:73`

**Vulnerable Code:**
```typescript
Content: "${content}"
```

**Impact:** User content embedded in quotes without escaping allows quote-based injection attacks.

**Fix:**
```typescript
Content: ${JSON.stringify(content)}
```

---

### C6. ReDoS Vulnerability in RSS Parsing
**Severity:** CRITICAL
**File:** `src/pages/api/rss/parse.ts:82, 114, 120`

**Vulnerable Code:**
```typescript
const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
```

**Impact:** Complex regex patterns with `[\s\S]*?` on untrusted XML content can cause catastrophic backtracking, leading to Denial of Service.

**Fix:**
```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true
});
const result = parser.parse(xmlContent);
```

---

## High Vulnerabilities

### H1. Unvalidated Redirect in Google OAuth
**Severity:** HIGH
**File:** `src/pages/api/auth/google-callback.ts:198`

**Vulnerable Code:**
```typescript
res.redirect(`/dashboard/settings?calendar=error&message=${encodeURIComponent(errorMessage)}`);
```

**Impact:** Error messages from catch blocks are URL-encoded and displayed, potentially enabling reflected XSS.

**Fix:**
```typescript
const safeMessage = errorMessage
  .replace(/[<>'"]/g, '')
  .substring(0, 100);
res.redirect(`/dashboard/settings?calendar=error&code=${errorCode}`);
// Display error messages from a predefined map, not URL params
```

---

### H2. Missing State Parameter Validation in OAuth
**Severity:** HIGH
**File:** `src/pages/api/auth/google-callback.ts:33-37`

**Vulnerable Code:**
```typescript
const { code, state } = req.query;
if (!code || !state) {
  return res.status(400).json({ error: 'Missing code or state parameter' });
}
```

**Impact:** State parameter checked for existence but not validated against stored CSRF token. Enables CSRF on OAuth flow and session fixation.

**Fix:**
```typescript
const storedState = req.cookies['oauth_state'];
if (!state || state !== storedState) {
  return res.status(400).json({ error: 'Invalid state parameter' });
}
// Clear the cookie
res.setHeader('Set-Cookie', 'oauth_state=; Max-Age=0; Path=/');
```

---

### H3. Weak Shortcut Token Validation
**Severity:** HIGH
**File:** `src/pages/api/shortcuts/webhook.ts:24-42`

**Issue:** Webhook accepts `shortcutToken` without rate limiting, token rotation, or expiration. Token format (`sl_` + 24 chars) could be brute-forced.

**Token Generation:** `src/contexts/AuthContext.tsx:43`
```typescript
apple_shortcut_token: 'sl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)
```

**Fix:**
```typescript
// Add rate limiting
const rateLimit = await checkRateLimit(req.ip, 'shortcuts_webhook', 10, 60);
if (!rateLimit.allowed) {
  return res.status(429).json({ error: 'Too many requests' });
}

// Add token expiration
if (user.shortcut_token_expires_at && new Date(user.shortcut_token_expires_at) < new Date()) {
  return res.status(401).json({ error: 'Token expired' });
}
```

---

### H4. Missing Authorization in AI Analyze
**Severity:** HIGH
**File:** `src/pages/api/ai/analyze.ts:36-45`

**Vulnerable Code:**
```typescript
// Fetch the entry (no RLS restriction with service role)
const { data: entry, error: entryError } = await supabase
  .from('entries')
  .select('id, user_id')
  .eq('id', entryId)
  .single()
```

**Impact:** API uses service role credentials and doesn't verify user owns the entry. Attacker can analyze any user's entries.

**Fix:**
```typescript
// Verify user owns the entry
const authHeader = req.headers.authorization;
const token = authHeader?.replace('Bearer ', '');
const { data: { user } } = await supabase.auth.getUser(token);

if (entry.user_id !== user?.id) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

### H5. Extension API Missing Ownership Verification
**Severity:** HIGH
**File:** `src/pages/api/save-from-extension.ts:64-76`

**Issue:** While token is verified, no validation that saved content belongs to authenticated user. Attacker with valid token can potentially access other users' entries.

**Fix:** Always verify `entry.user_id === authenticatedUser.id` before database mutations.

---

### H6. Service Role Key Pattern Risk
**Severity:** HIGH
**File:** `src/pages/api/shortcuts/webhook.ts:69`

**Code:**
```typescript
'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
```

**Issue:** Service role key used for user operations bypasses RLS. If exposed, grants unlimited database access.

**Fix:** Use user tokens instead of service role for user-initiated operations where possible.

---

### H7. XXE Risk in RSS Parsing
**Severity:** HIGH
**File:** `src/pages/api/rss/parse.ts:55`, `src/pages/api/rss/import.ts:118-176`

**Issue:** Regex-based XML parsing could process external entity declarations if not properly filtered.

**Fix:** Use proper XML parser with XXE protection:
```typescript
import { XMLParser } from 'fast-xml-parser';
const parser = new XMLParser({
  processEntities: false,
  htmlEntities: true
});
```

---

## Medium Vulnerabilities

### M1. Weak Token Generation
**Severity:** MEDIUM
**File:** `src/contexts/AuthContext.tsx:43`

**Code:**
```typescript
apple_shortcut_token: 'sl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)
```

**Issue:** 24-character tokens derived from UUID not cryptographically strong enough.

**Fix:**
```typescript
import { randomBytes } from 'crypto';
apple_shortcut_token: 'sl_' + randomBytes(32).toString('hex')
```

---

### M2. Missing Rate Limiting on Auth Endpoints
**Severity:** MEDIUM
**Files:** Auth-related API endpoints

**Issue:** No rate limiting on password reset, sign-up, or sign-in endpoints.

**Fix:** Implement rate limiting per IP/email using existing `rate_limits` table.

---

### M3. Browser Extension Token Storage
**Severity:** MEDIUM
**File:** `browser-extension/src/background/background.js:110, 160, 165-168`

**Code:**
```typescript
const { authToken, apiUrl } = await chrome.storage.local.get(['authToken', 'apiUrl']);
```

**Issue:** Auth tokens in `chrome.storage.local` accessible to other extensions.

**Fix:**
```typescript
// Use session storage with encryption
await chrome.storage.session.set({
  authToken: await encryptToken(token)
});
```

---

### M4. Content Script Data Collection
**Severity:** MEDIUM
**File:** `browser-extension/src/content/content.js:17-40`

**Issue:** Content script collects page content (up to 5000 chars) including potentially sensitive information without filtering.

**Fix:** Implement domain blocklist and content filtering for sensitive pages.

---

### M5. Missing Origin Validation in Extension
**Severity:** MEDIUM
**File:** `browser-extension/src/background/background.js:153`

**Code:**
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
```

**Issue:** Message handler doesn't validate sender origin. Malicious scripts could impersonate the extension.

**Fix:**
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!sender.url || !sender.url.startsWith('chrome-extension://')) {
    return;
  }
  // Process message
});
```

---

### M6. No CSRF Protection on API Routes
**Severity:** MEDIUM
**Files:** All POST endpoints in `src/pages/api/`

**Issue:** API routes lack CSRF tokens, relying only on auth tokens.

**Fix:** Implement double-submit cookie pattern or add CSRF middleware.

---

## Low Vulnerabilities

### L1. Missing HTTPS Enforcement
**Severity:** LOW
**File:** `browser-extension/src/background/background.js:3`

**Code:**
```typescript
const API_BASE_URL = 'https://scrolllater.com';
```

**Issue:** No enforcement or warning if URL changed to HTTP.

**Fix:**
```typescript
if (!apiUrl.startsWith('https://')) {
  throw new Error('HTTPS required');
}
```

---

### L2. Account Enumeration in Auth
**Severity:** LOW
**File:** `src/lib/auth.ts:252-269`

**Issue:** Error messages can distinguish between "user exists" and "invalid credentials".

**Fix:** Use identical error messages for all user-not-found and password-invalid scenarios.

---

### L3. Missing HSTS Headers
**Severity:** LOW
**Files:** Environment configuration

**Issue:** No evidence of HSTS headers or httpOnly cookie flags.

**Fix:** Configure in `next.config.js`:
```javascript
headers: () => [
  {
    source: '/:path*',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
    ]
  }
]
```

---

### L4. Stale Session Display in Extension
**Severity:** LOW
**File:** `browser-extension/src/popup/popup.js:80-89`

**Issue:** User info displayed from storage without validating token freshness.

**Fix:** Validate token before displaying user info.

---

## Summary by Category

### Authentication & Authorization
| ID | Severity | Issue |
|----|----------|-------|
| C2 | Critical | Unvalidated redirect |
| H2 | High | Missing OAuth state validation |
| H3 | High | Weak shortcut token |
| H4 | High | Missing authorization in AI analyze |
| H5 | High | Extension API ownership bypass |
| M1 | Medium | Weak token generation |
| M2 | Medium | No rate limiting on auth |
| L2 | Low | Account enumeration |

### Input Validation & Injection
| ID | Severity | Issue |
|----|----------|-------|
| C4 | Critical | Prompt injection (schedule-suggest) |
| C5 | Critical | Prompt injection (ai-processor) |
| C6 | Critical | ReDoS in RSS parsing |
| H7 | High | XXE risk in RSS parsing |

### Data Exposure
| ID | Severity | Issue |
|----|----------|-------|
| C3 | Critical | Sensitive logging |
| H6 | High | Service role key pattern |
| M3 | Medium | Extension token storage |
| M4 | Medium | Content script data collection |

### Cross-Origin & Transport
| ID | Severity | Issue |
|----|----------|-------|
| C1 | Critical | Open CORS policy |
| H1 | High | Reflected XSS via error |
| M5 | Medium | Missing extension origin validation |
| M6 | Medium | No CSRF protection |
| L1 | Low | Missing HTTPS enforcement |
| L3 | Low | Missing HSTS headers |

---

## Prioritized Remediation Plan

### Immediate (Critical - Fix This Week)

1. **C1 - CORS Misconfiguration**
   - File: `src/pages/api/save-from-extension.ts`
   - Action: Restrict to extension origins only
   - Effort: 30 minutes

2. **C2 - Open Redirect**
   - File: `src/pages/api/auth/callback.ts`
   - Action: Whitelist allowed redirect destinations
   - Effort: 30 minutes

3. **C3 - Sensitive Logging**
   - Files: `analyze.ts`, `google-callback.ts`
   - Action: Remove or gate behind development mode
   - Effort: 15 minutes

4. **C4, C5 - Prompt Injection**
   - Files: `schedule-suggest.ts`, `ai-processor.ts`
   - Action: Sanitize user input, use JSON encoding
   - Effort: 1 hour

5. **C6 - ReDoS**
   - File: `src/pages/api/rss/parse.ts`
   - Action: Replace regex with XML parser library
   - Effort: 2 hours

### Short-term (High - Fix This Sprint)

6. **H2 - OAuth State Validation**
   - File: `google-callback.ts`
   - Action: Validate state against stored CSRF token
   - Effort: 1 hour

7. **H3 - Shortcut Token Security**
   - Files: `webhook.ts`, `AuthContext.tsx`
   - Action: Add rate limiting and expiration
   - Effort: 2 hours

8. **H4, H5 - Authorization Checks**
   - Files: `analyze.ts`, `save-from-extension.ts`
   - Action: Verify user ownership before operations
   - Effort: 1 hour

9. **H7 - XXE Protection**
   - Files: RSS parsing endpoints
   - Action: Use secure XML parser
   - Effort: Included in C6

### Medium-term (Medium - Fix Next Sprint)

10. **M1 - Stronger Tokens**
    - Action: Use 32-byte cryptographic randomness
    - Effort: 30 minutes

11. **M2 - Rate Limiting**
    - Action: Implement using existing rate_limits table
    - Effort: 3 hours

12. **M3-M5 - Extension Security**
    - Action: Encrypted storage, origin validation
    - Effort: 2 hours

13. **M6 - CSRF Protection**
    - Action: Add double-submit cookie pattern
    - Effort: 2 hours

### Long-term (Low - Backlog)

14. **L1-L4 - Security Hardening**
    - Action: HTTPS enforcement, HSTS, error messages
    - Effort: 2 hours

---

## Testing Recommendations

### Security Testing Checklist

- [ ] CORS: Verify requests from unauthorized origins are blocked
- [ ] Redirects: Test with external URLs in redirect params
- [ ] OAuth: Test state parameter manipulation
- [ ] Rate limiting: Verify brute force protection
- [ ] Authorization: Test accessing other users' entries
- [ ] Prompt injection: Test with malicious content payloads
- [ ] ReDoS: Test with crafted XML payloads
- [ ] Extension: Test message spoofing from malicious pages

### Automated Security Tools

1. **SAST:** Run `npm audit`, `snyk test`
2. **DAST:** Run OWASP ZAP against staging
3. **Dependency scanning:** Enable Dependabot/Renovate
4. **Secret scanning:** Enable GitHub secret scanning

---

*Report generated by automated security analysis*

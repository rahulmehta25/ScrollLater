# CLAUDE.md — ScrollLater

## Stack
Next.js 15.5 + React 19 + TypeScript 5.9 + Tailwind CSS + Supabase + PWA. Browser extension companion. Deployed on Vercel with analytics.

## Commands
```bash
npm run dev           # Dev server
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint
npm run typecheck     # TypeScript type check
npm run test          # Unit tests (Vitest)
npm run test:coverage # Unit tests with coverage
npm run test:ui       # Vitest UI
npm run test:e2e      # E2E tests (Playwright)
npm run test:e2e:ui   # Playwright UI mode
```

## Project Structure
```
├── browser-extension/   # Chrome extension companion
├── e2e/                 # Playwright E2E tests
├── docs/                # Documentation
├── public/              # Static assets
└── src/                 # Next.js app (App Router)
```

## Testing
- **Unit:** Vitest
- **E2E:** Playwright (multi-browser + mobile device testing)
- Run `npm run typecheck && npm run test` before committing

## Key Patterns
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **Analytics:** Vercel Analytics
- **PWA:** Service worker for offline support

## Deployment
- Platform: Vercel
- Database: Supabase

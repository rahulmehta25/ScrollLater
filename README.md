# ScrollLater

A read-it-later PWA that actually reads things to you. Save articles from anywhere on iOS, Android, or the web. Each morning, ScrollLater generates a 90-second audio briefing of everything you saved yesterday, narrated in an NPR-style voice.

## The one-thing-it-does-well

Most read-it-later apps become graveyards. Pocket, Instapaper, even the native iOS Reading List. You save, you never return. ScrollLater makes the return automatic. The briefing shows up every morning at 7am local time. You listen, you decide what to dive into. Saves decay less.

## Tech

- Next.js 15 App Router, React Server Components, TypeScript
- Supabase SSR for auth, Postgres + pgvector for saves and embeddings
- Supabase Edge Functions (11) for the briefing pipeline, smart categorization, and scheduled ingestion
- Vercel Blob for cleaned article HTML
- ElevenLabs Conversational AI for the narrator (agent `agent_2001kpfrb0zrektav0a1vrtpjhsj`)
- OpenAI text-embedding-3-small for semantic search
- @mozilla/readability + jsdom + DOMPurify for clean extraction
- PostHog for analytics
- Apple Shortcuts and a Chrome extension for cross-device save
- PWA with offline-first service worker and push notifications

## How it works

1. Save an article (share sheet, extension, shortcut, or paste)
2. `/api/save` fetches, sanitizes, embeds, stores. Runs in under 3s
3. Hourly cron picks up users whose 7am local time matches the current UTC hour
4. Edge function summarizes yesterday's saves into a 90 to 150 word script
5. ElevenLabs generates audio from the tuned agent
6. Push notification lands, audio autoplays on tap

## Run it locally

```bash
git clone https://github.com/rahulmehta25/scrolllater
cd scrolllater
npm install
cp .env.example .env.local
# add Supabase + OpenAI + ElevenLabs + Vercel Blob keys
supabase start
npm run db:migrate
npm run dev
```

## Screenshots

![Home with saved articles and briefing player](docs/screenshots/home.png)
![iOS share sheet save](docs/screenshots/save.png)
![Briefing playback](docs/screenshots/briefing.png)
![Semantic search](docs/screenshots/search.png)

## Architecture

See [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) for the full deep-dive and [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for the posture review.

## Live

- App: [scrolllater.vercel.app](https://scrolllater.vercel.app)
- Chrome extension: local load from `browser-extension/` (Web Store listing pending)

MIT licensed.

# Production Environment Variables Template

Copy these variables to your Vercel project settings or `.env.production` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Integration (OpenRouter)
NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=ScrollLater
NODE_ENV=production

# Optional: Error Tracking (Sentry)
# NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## GitHub Secrets Required for CI/CD

Add these secrets to your GitHub repository settings:

- `VERCEL_TOKEN` - Your Vercel deployment token
- `ORG_ID` - Your Vercel organization ID
- `PROJECT_ID` - Your Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `NEXT_PUBLIC_OPENROUTER_API_KEY` - OpenRouter API key
- `NEXT_PUBLIC_APP_URL` - Production app URL 
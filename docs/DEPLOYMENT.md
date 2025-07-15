# 🚀 ScrollLater Production Deployment Guide

This guide provides step-by-step instructions for deploying ScrollLater to production on Vercel.

## 📋 Prerequisites

- ✅ ScrollLater codebase ready (Phases 1-4 complete)
- ✅ Supabase project configured
- ✅ Google Cloud Console project with OAuth credentials
- ✅ OpenRouter API key
- ✅ Vercel account

## 🔧 Environment Variables Setup

### 1. Supabase Configuration

```bash
# Supabase Project Settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Google OAuth Configuration

```bash
# Google Cloud Console OAuth 2.0
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. AI Integration

```bash
# OpenRouter API
NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key
```

### 4. App Configuration

```bash
# App Settings
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=ScrollLater
NODE_ENV=production
```

## 🚀 Vercel Deployment Steps

### Step 1: Connect Repository

1. **Login to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub account

2. **Import Project**
   - Click "New Project"
   - Import from GitHub: `rahulmehta25/ScrollLater`
   - Select `scrolllater-frontend` directory

### Step 2: Configure Build Settings

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "rootDirectory": "scrolllater-frontend"
}
```

### Step 3: Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

1. **Add all environment variables** from the list above
2. **Set production values** (not development URLs)
3. **Verify all variables** are properly configured

### Step 4: Configure Domains

1. **Custom Domain** (Optional)
   - Add your custom domain in Vercel
   - Update DNS records as instructed
   - Update `NEXT_PUBLIC_APP_URL` to match

2. **Update OAuth Redirect URIs**
   - Google Cloud Console: Add production domain
   - Supabase Auth: Update redirect URLs

### Step 5: Deploy

1. **Trigger Deployment**
   - Push to main branch or manually deploy
   - Monitor build logs for any issues

2. **Verify Deployment**
   - Check all pages load correctly
   - Test authentication flow
   - Verify AI features work
   - Test calendar integration

## 🔒 Security Configuration

### 1. Supabase Production Settings

```sql
-- Enable enhanced security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Review and update RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 2. Google Cloud Security

- Enable API quotas and monitoring
- Set up billing alerts
- Configure OAuth consent screen for production

### 3. Environment Variable Security

- Use Vercel's encrypted environment variables
- Never commit secrets to repository
- Rotate API keys regularly

## 📊 Monitoring & Analytics

### 1. Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. Error Tracking

```bash
npm install @sentry/nextjs
```

### 3. Performance Monitoring

- Enable Vercel Speed Insights
- Monitor Core Web Vitals
- Set up performance budgets

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: scrolllater-frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd scrolllater-frontend
          npm ci
      
      - name: Run tests
        run: |
          cd scrolllater-frontend
          npm run lint
          npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./scrolllater-frontend
```

## 🧪 Post-Deployment Testing

### 1. Functional Testing

- [ ] User registration and login
- [ ] Entry creation and AI processing
- [ ] Google Calendar integration
- [ ] iOS Shortcuts webhook
- [ ] Real-time updates
- [ ] Mobile responsiveness

### 2. Performance Testing

- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] PWA offline functionality
- [ ] Image optimization

### 3. Security Testing

- [ ] Authentication flows
- [ ] API endpoint security
- [ ] Data encryption
- [ ] CORS configuration

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify TypeScript compilation
   - Review dependency conflicts

2. **Authentication Issues**
   - Verify OAuth redirect URIs
   - Check Supabase configuration
   - Review CORS settings

3. **AI Integration Failures**
   - Verify OpenRouter API key
   - Check rate limits
   - Review edge function logs

4. **Calendar Integration Issues**
   - Verify Google OAuth credentials
   - Check API quotas
   - Review calendar permissions

## 📈 Production Optimization

### 1. Performance

- Enable Vercel Edge Functions
- Implement caching strategies
- Optimize bundle size
- Use CDN for static assets

### 2. Scalability

- Monitor database performance
- Implement connection pooling
- Set up auto-scaling
- Configure load balancing

### 3. Reliability

- Set up health checks
- Implement retry logic
- Configure backup strategies
- Monitor error rates

## 🔄 Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review security patches
- [ ] Monitor performance metrics
- [ ] Backup database weekly
- [ ] Review error logs daily

### Monitoring Alerts

- High error rates
- Slow response times
- API quota limits
- Database connection issues
- Authentication failures

---

## ✅ Deployment Checklist

- [ ] Environment variables configured
- [ ] OAuth redirect URIs updated
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates verified
- [ ] Performance monitoring enabled
- [ ] Error tracking configured
- [ ] Backup strategy implemented
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Documentation updated

---

**Deployment Status:** Ready for Production 🚀
**Last Updated:** January 27, 2025
**Next Review:** February 27, 2025 
# OAuth Authentication Debug Guide

## Issues Identified and Fixed

### 1. **URL Mismatch in Environment Variables**
**Problem**: Environment variables had inconsistent URLs between local and production
**Root Cause**: Multiple domains and inconsistent redirect URIs
**Fix**: 
- Updated `.env.production` to use consistent `https://scroll-later.vercel.app` domain
- Updated `GOOGLE_REDIRECT_URI` from `scrolllater-frontend.vercel.app` to `scroll-later.vercel.app`

### 2. **CORS Middleware Blocking OAuth Callbacks**
**Problem**: Middleware CORS settings were too restrictive for OAuth flows
**Root Cause**: OAuth callbacks from external providers were being blocked
**Fix**:
- Added both production domains to allowed origins
- Special handling for `/api/auth/` routes to allow OAuth callbacks
- Added support for requests without origin header (OAuth providers)

### 3. **Edge Runtime Compatibility Issues**
**Problem**: Auth callback route was using Edge runtime which has limitations
**Root Cause**: Supabase auth functions may not work properly in Edge runtime
**Fix**:
- Changed auth callback route to use Node.js runtime instead of Edge
- Updated `vercel.json` to specify `nodejs20.x` runtime for auth routes

### 4. **Inadequate Error Handling and Logging**
**Problem**: OAuth failures had minimal debugging information
**Root Cause**: Limited error handling and logging in callback route
**Fix**:
- Enhanced error logging in callback route
- Added support for OAuth provider error parameters
- Improved error messages with specific failure reasons

### 5. **Client-side Redirect URL Logic**
**Problem**: LoginForm was inconsistent in determining redirect URLs
**Root Cause**: Environment-dependent URL resolution was unreliable
**Fix**:
- Improved client-side detection of local vs production environment
- Better fallback logic for redirect URL determination

## Required OAuth Provider Configuration

### Google OAuth Setup
You need to configure these redirect URIs in your Google Cloud Console:

**Local Development:**
- `http://localhost:3001/api/auth/callback`
- `http://localhost:3000/api/auth/callback` (fallback)

**Production:**
- `https://scroll-later.vercel.app/api/auth/callback`

### Supabase Configuration
Ensure these settings in your Supabase dashboard:

**Site URL:** `https://scroll-later.vercel.app`

**Additional Redirect URLs:**
- `http://localhost:3001/**` (for local development)
- `https://scroll-later.vercel.app/**` (for production)

## Debug Tools

### 1. OAuth Debug Page
Visit `/debug-oauth` to see:
- Current environment configuration
- Authentication status
- Client setup verification
- Live OAuth flow testing

### 2. Console Logging
Check browser console and Vercel logs for:
- OAuth initiation logs
- Callback processing logs
- Error details and stack traces

### 3. Network Tab
Monitor network requests for:
- OAuth redirect requests
- Callback URL calls
- Cookie setting/reading

## Common Issues and Solutions

### Issue: "Invalid redirect URI" from Google
**Solution**: Verify the redirect URI in Google Console exactly matches what's being sent

### Issue: "Token exchange failed" from Supabase
**Solution**: 
- Check Supabase site URL configuration
- Verify environment variables are set correctly in Vercel
- Ensure the auth callback route is accessible

### Issue: CORS errors in browser console
**Solution**: Check middleware configuration allows the current domain

### Issue: 404 on auth callback
**Solution**: 
- Verify the callback route file exists at `src/app/api/auth/callback/route.ts`
- Check Vercel deployment includes the route
- Confirm middleware isn't blocking the request

## Environment Variables Checklist

### Required in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL=https://scroll-later.vercel.app`

### Local Development (.env.local):
- Same as above but with `NEXT_PUBLIC_APP_URL=http://localhost:3001`
- `GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback`

## Testing OAuth Flow

1. Visit `/debug-oauth` page
2. Click "Test Google OAuth" button
3. Complete OAuth flow
4. Check console logs for detailed information
5. Verify successful redirect to dashboard

## Deployment Checklist

1. ✅ Environment variables set in Vercel
2. ✅ Google OAuth redirect URIs configured
3. ✅ Supabase site URL and redirect URLs configured
4. ✅ Auth callback route uses Node.js runtime
5. ✅ Middleware allows auth routes
6. ✅ DNS and domain configuration correct
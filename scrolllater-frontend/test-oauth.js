// OAuth Configuration Test Script
const https = require('https');

console.log('=== OAuth Configuration Test ===\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'NOT SET');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
console.log('   NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'NOT SET');

// Test production callback
console.log('\n2. Testing Production Callback:');
https.get('https://scroll-later.vercel.app/api/auth/callback', (res) => {
  console.log('   Status:', res.statusCode);
  console.log('   Expected: 405 (Method Not Allowed without OAuth code)');
});

console.log('\n3. OAuth Flow Requirements:');
console.log('   ✓ Supabase Dashboard:');
console.log('     - Add to Redirect URLs: https://scroll-later.vercel.app/api/auth/callback');
console.log('     - Add to Redirect URLs: http://localhost:3001/api/auth/callback');
console.log('\n   ✓ Google Cloud Console:');
console.log('     - Add to Authorized JavaScript origins: https://scroll-later.vercel.app');
console.log('     - Add to Authorized JavaScript origins: http://localhost:3001');
console.log('     - Add to Authorized redirect URIs: [your-supabase-url]/auth/v1/callback');
console.log('\n   ✓ Vercel Dashboard:');
console.log('     - Set all environment variables from .env.local');
console.log('     - Ensure NEXT_PUBLIC_APP_URL = https://scroll-later.vercel.app');

console.log('\n4. Common OAuth Issues:');
console.log('   - 401 Error: Usually means redirect URI mismatch');
console.log('   - auth_failed: OAuth provider configuration issue');
console.log('   - Token exchange failure: Check Supabase project settings');
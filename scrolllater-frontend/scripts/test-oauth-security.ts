#!/usr/bin/env node
/**
 * OAuth Security Configuration Test Script
 * Tests the OAuth flow and identifies security configuration issues
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

// Load environment variables manually
const envPath = resolve(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY!

console.log('=== OAuth Security Configuration Test ===\n')

// Test 1: Verify environment variables
console.log('1. Environment Variables Check:')
console.log('   - Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
console.log('   - Anon Key:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
console.log('   - Service Key:', supabaseServiceKey ? '✓ Set' : '✗ Missing')
console.log()

// Test 2: Verify JWT token structure
console.log('2. JWT Token Analysis:')
if (supabaseAnonKey) {
  try {
    const [header, payload] = supabaseAnonKey.split('.').slice(0, 2)
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64').toString())
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString())
    
    console.log('   Anon Key Header:', decodedHeader)
    console.log('   Anon Key Payload:')
    console.log('     - Role:', decodedPayload.role)
    console.log('     - Issued At:', new Date(decodedPayload.iat * 1000).toISOString())
    console.log('     - Expires:', new Date(decodedPayload.exp * 1000).toISOString())
    console.log('     - Project Ref:', decodedPayload.ref)
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (decodedPayload.exp < now) {
      console.log('   ⚠️  WARNING: Anon key is EXPIRED!')
    } else {
      console.log('   ✓ Anon key is valid')
    }
  } catch (error) {
    console.log('   ✗ Failed to decode JWT:', error)
  }
}
console.log()

// Test 3: Test Supabase client connectivity
console.log('3. Supabase Client Connectivity:')
const anonClient = createClient(supabaseUrl, supabaseAnonKey)
const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function testConnectivity() {
  try {
    // Test anon client
    console.log('   Testing anon client...')
    const { data: anonData, error: anonError } = await anonClient
      .from('categories')
      .select('count(*)', { count: 'exact', head: true })
    
    if (anonError) {
      console.log('   ✗ Anon client error:', anonError.message)
    } else {
      console.log('   ✓ Anon client connected successfully')
    }
    
    // Test service client
    console.log('   Testing service client...')
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('categories')
      .select('count(*)', { count: 'exact', head: true })
    
    if (serviceError) {
      console.log('   ✗ Service client error:', serviceError.message)
    } else {
      console.log('   ✓ Service client connected successfully')
    }
  } catch (error) {
    console.log('   ✗ Connection test failed:', error)
  }
}

// Test 4: OAuth Provider Configuration
console.log('4. OAuth Provider Settings:')
async function testOAuthProviders() {
  try {
    // Check Google OAuth configuration
    console.log('   Google OAuth:')
    console.log('     - Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing')
    console.log('     - Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set (server-side)' : '✗ Missing')
    console.log('     - Redirect URI:', process.env.GOOGLE_REDIRECT_URI || 'Using default')
    
    // Test OAuth URL generation
    const redirectUrl = 'http://localhost:3001/api/auth/callback'
    console.log('\n   Testing OAuth URL generation:')
    console.log('     - Redirect URL:', redirectUrl)
    
    // Generate OAuth URL using anon client
    const { data: oauthData, error: oauthError } = await anonClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true
      }
    })
    
    if (oauthError) {
      console.log('     ✗ OAuth URL generation failed:', oauthError.message)
    } else if (oauthData?.url) {
      console.log('     ✓ OAuth URL generated successfully')
      const oauthUrl = new URL(oauthData.url)
      console.log('     - OAuth endpoint:', oauthUrl.origin + oauthUrl.pathname)
      console.log('     - State parameter:', oauthUrl.searchParams.get('state') ? '✓ Present' : '✗ Missing')
      console.log('     - PKCE enabled:', oauthUrl.searchParams.get('code_challenge') ? '✓ Yes' : '✗ No')
    }
  } catch (error) {
    console.log('   ✗ OAuth test failed:', error)
  }
}

// Test 5: CORS and Security Headers
console.log('\n5. CORS Configuration Check:')
async function testCORS() {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3001',
        'Referer': 'http://localhost:3001/'
      }
    })
    
    console.log('   Auth Health Check:')
    console.log('     - Status:', response.status)
    console.log('     - CORS Headers:')
    console.log('       - Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin') || 'Not set')
    console.log('       - Access-Control-Allow-Credentials:', response.headers.get('access-control-allow-credentials') || 'Not set')
    
    // Test token endpoint
    console.log('\n   Token Endpoint Test:')
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,apikey,authorization'
      }
    })
    
    console.log('     - Preflight Status:', tokenResponse.status)
    console.log('     - Allowed Methods:', tokenResponse.headers.get('access-control-allow-methods') || 'Not set')
    console.log('     - Allowed Headers:', tokenResponse.headers.get('access-control-allow-headers') || 'Not set')
  } catch (error) {
    console.log('   ✗ CORS test failed:', error)
  }
}

// Test 6: RLS Policies Impact
console.log('\n6. RLS Policies Check:')
async function testRLSPolicies() {
  try {
    // Test with anon client (no auth)
    console.log('   Testing without authentication:')
    const { data: publicData, error: publicError } = await anonClient
      .from('categories')
      .select('*')
      .limit(1)
    
    if (publicError) {
      console.log('     ✗ Public access error:', publicError.message)
    } else {
      console.log('     ✓ Public categories accessible')
    }
    
    // Test user-specific table
    const { data: entriesData, error: entriesError } = await anonClient
      .from('entries')
      .select('*')
      .limit(1)
    
    if (entriesError) {
      console.log('     ✓ Entries properly protected (expected error):', entriesError.message)
    } else {
      console.log('     ⚠️  WARNING: Entries accessible without auth!')
    }
  } catch (error) {
    console.log('   ✗ RLS test failed:', error)
  }
}

// Run all tests
async function runTests() {
  await testConnectivity()
  console.log()
  await testOAuthProviders()
  await testCORS()
  await testRLSPolicies()
  
  console.log('\n=== Security Audit Summary ===')
  console.log('\nPotential issues causing 401 error:')
  console.log('1. Check if OAuth providers are properly configured in Supabase Dashboard')
  console.log('2. Verify redirect URLs match exactly (including protocol and port)')
  console.log('3. Ensure PKCE is properly configured for the OAuth flow')
  console.log('4. Check if the Supabase project has OAuth enabled')
  console.log('5. Verify API keys are not expired or revoked')
  console.log('\nRecommended actions:')
  console.log('- Log into Supabase Dashboard and check Auth > Providers > Google settings')
  console.log('- Ensure redirect URL is added to authorized URLs')
  console.log('- Check Auth > URL Configuration for site URL and redirect URLs')
  console.log('- Verify Google OAuth consent screen is properly configured')
}

runTests().catch(console.error)
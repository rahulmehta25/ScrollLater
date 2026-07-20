// Supabase configuration validator with security checks
import { createBrowserClient } from '@supabase/ssr'

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Validates Supabase configuration for security issues
 * @throws Error if configuration is invalid
 */
export function validateSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check required variables exist
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please check your .env.local file contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  // Validate URL format
  const urlPattern = /^https:\/\/[a-z0-9]+\.supabase\.co$/;
  if (!urlPattern.test(url)) {
    throw new Error(
      `Invalid Supabase URL format: ${url}. Expected format: https://[project-ref].supabase.co`
    );
  }

  // Validate JWT structure (basic check)
  const jwtPattern = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  if (!jwtPattern.test(anonKey)) {
    throw new Error(
      'Invalid Supabase anon key format. Please check your API key from Supabase dashboard.'
    );
  }

  // Extract project reference from URL and JWT
  const urlRef = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  
  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(anonKey.split('.')[1]));
    const jwtRef = payload.ref;
    
    // Verify project reference matches
    if (urlRef !== jwtRef) {
      throw new Error(
        `Supabase configuration mismatch: URL project (${urlRef}) doesn't match API key project (${jwtRef}). Please ensure you're using matching URL and API keys from the same Supabase project.`
      );
    }

    // Check if JWT is expired
    const exp = payload.exp;
    if (exp && exp * 1000 < Date.now()) {
      throw new Error(
        'Supabase API key has expired. Please regenerate your API keys in Supabase dashboard.'
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('mismatch')) {
      throw e;
    }
    throw new Error(
      'Failed to validate Supabase API key. Please check your configuration.'
    );
  }

  // Validate service role key if provided (server-side only)
  if (serviceRoleKey && typeof window === 'undefined') {
    if (!jwtPattern.test(serviceRoleKey)) {
      throw new Error(
        'Invalid Supabase service role key format. Please check your API key from Supabase dashboard.'
      );
    }
  }

  return {
    url,
    anonKey,
    serviceRoleKey
  };
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const config = validateSupabaseConfig();
    const client = createBrowserClient(config.url, config.anonKey);
    
    // Test basic auth functionality
    const { error } = await client.auth.getSession();
    
    if (error && error.message !== 'Auth session missing!') {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase configuration error:', error);
    return false;
  }
}
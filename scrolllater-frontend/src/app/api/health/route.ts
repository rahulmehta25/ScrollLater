import { NextResponse } from 'next/server';
import { validateSupabaseConfig } from '@/lib/supabase-validator';

export async function GET() {
  const checks = {
    supabase: false,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    errors: [] as string[]
  };

  try {
    // Validate Supabase configuration
    validateSupabaseConfig();
    checks.supabase = true;
  } catch (error) {
    checks.errors.push(error instanceof Error ? error.message : 'Supabase configuration invalid');
  }

  const status = checks.supabase ? 200 : 503;
  
  return NextResponse.json(checks, { status });
}
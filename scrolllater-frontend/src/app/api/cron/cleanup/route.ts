import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server-optimized'
import { cache } from '@/lib/cache'

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cron job to clean up old data and optimize performance
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();
    const results = {
      processedTasks: 0,
      deletedSessions: 0,
      optimizedTables: [],
      cacheCleared: false,
      errors: []
    };

    // 1. Clean up old completed/failed processing tasks (older than 7 days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: deletedTasks, error } = await supabase
        .from('processing_queue')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('completed_at', sevenDaysAgo.toISOString())
        .select('id');

      if (error) throw error;
      results.processedTasks = deletedTasks?.length || 0;
    } catch (error) {
      results.errors.push(`Failed to clean processing queue: ${error}`);
    }

    // 2. Clean up old sessions (older than 30 days)
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: deletedSessions, error } = await supabase
        .from('auth.sessions')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .select('id');

      if (error) throw error;
      results.deletedSessions = deletedSessions?.length || 0;
    } catch (error) {
      // Session cleanup might fail due to permissions, which is OK
      results.errors.push(`Session cleanup skipped: ${error}`);
    }

    // 3. Update database statistics for query optimization
    try {
      // This helps PostgreSQL optimize query plans
      const tables = ['entries', 'processing_queue', 'user_profiles'];
      
      for (const table of tables) {
        await supabase.rpc('analyze_table', { table_name: table });
        results.optimizedTables.push(table);
      }
    } catch (error) {
      results.errors.push(`Failed to optimize tables: ${error}`);
    }

    // 4. Clear expired cache entries
    try {
      // Clear old cache entries (this is handled by Redis TTL, but we can force cleanup)
      await cache.invalidate('session:*');
      results.cacheCleared = true;
    } catch (error) {
      results.errors.push(`Failed to clear cache: ${error}`);
    }

    // 5. Archive old entries (optional - move to cold storage)
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Count old entries that could be archived
      const { count } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', sixMonthsAgo.toISOString())
        .eq('archived', false);

      if (count && count > 0) {
        // Mark entries as archived (you could move them to a different table)
        await supabase
          .from('entries')
          .update({ archived: true })
          .lt('created_at', sixMonthsAgo.toISOString())
          .eq('archived', false);
        
        results.archivedEntries = count;
      }
    } catch (error) {
      results.errors.push(`Failed to archive old entries: ${error}`);
    }

    // Log cleanup results
    console.log('Cleanup job completed:', results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Cleanup cron job error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
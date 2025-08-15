import { NextRequest, NextResponse } from 'next/server'
import { getAIQueueManager, initializeAIQueueManager } from '@/lib/ai-queue-manager'

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cron job to process AI queue
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize or get the queue manager
    const queueManager = process.env.OPENROUTER_API_KEY 
      ? getAIQueueManager(process.env.OPENROUTER_API_KEY)
      : initializeAIQueueManager(process.env.OPENROUTER_API_KEY!);

    // Process pending tasks
    // Note: The queue manager handles its own batching and processing
    queueManager.startProcessing(0); // Process immediately, no interval since this is a cron job

    // Get current stats
    const stats = await queueManager.getStats();

    // Stop processing after this run (since it's a cron job)
    setTimeout(() => {
      queueManager.stopProcessing();
    }, 50000); // Stop after 50 seconds to leave buffer before timeout

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        avgProcessingTime: `${stats.avgProcessingTime}ms`
      }
    });

  } catch (error) {
    console.error('Process queue cron job error:', error);
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
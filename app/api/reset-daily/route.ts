import { NextResponse } from 'next/server';
import { createAllModels } from '@/lib/models';
import { PaperTradingEngine } from '@/lib/tradingEngine';

// This endpoint can be called by a cron job to reset models daily
// For Vercel, you can set up a cron job in vercel.json
async function handleRequest(request: Request) {
  try {
    // Verify the request is from Vercel cron or has valid auth
    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow Vercel cron (has x-vercel-cron header) or valid Bearer token
    const isVercelCron = cronHeader !== null;
    const hasValidAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    if (!isVercelCron && !hasValidAuth && cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset logic is handled in the models API route
    // This endpoint can be used for scheduled resets
    return NextResponse.json({ 
      success: true, 
      message: 'Daily reset check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in daily reset:', error);
    return NextResponse.json(
      { error: 'Failed to reset' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

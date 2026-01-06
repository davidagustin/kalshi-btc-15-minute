import { NextResponse } from 'next/server';
import { createAllModels } from '@/lib/models';
import { PaperTradingEngine } from '@/lib/tradingEngine';

// This endpoint can be called by a cron job to reset models daily
// For Vercel, you can set up a cron job in vercel.json
export async function POST(request: Request) {
  try {
    // Verify the request is from a cron job (add authentication in production)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

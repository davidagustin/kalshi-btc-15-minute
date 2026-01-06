import { NextResponse } from 'next/server';
import { fetchMarketData, generateHistoricalData } from '@/lib/marketData';

export async function GET() {
  try {
    const currentData = await fetchMarketData();
    const historicalData = generateHistoricalData(20);
    
    return NextResponse.json({
      current: currentData,
      history: historicalData,
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createAllModels } from '@/lib/models';
import { runBacktest } from '@/lib/backtesting';
import { fetch1MinuteMarketData, convertFxVerifyBarsToMarketData, fetchFxVerifyBars } from '@/lib/fxverify';
import { generateHistoricalData } from '@/lib/marketData';

function isReadOnlyMode(request: Request): boolean {
  const hostname = request.headers.get('host') || '';
  return (
    hostname.includes('kalshi-btc-15-minute.vercel.app') ||
    process.env.NEXT_PUBLIC_READ_ONLY === 'true'
  );
}

/**
 * Backtesting endpoint - tests models on historical data to predict performance
 */
export async function POST(request: Request) {
  if (isReadOnlyMode(request)) {
    return NextResponse.json(
      { error: 'Read-only mode: Backtesting is disabled in production' },
      { status: 403 }
    );
  }

  try {
    const { days = 30, barsPerDay = 96, initialBalance = 100 } = await request.json().catch(() => ({}));
    
    // Calculate number of 15-minute periods and 1-minute candles needed
    const total15MinBars = days * barsPerDay;
    const totalMinutes = days * 24 * 60; // Total minutes in the period
    
    console.log(`Running backtest with 1-minute candlesticks predicting 15-minute movements`);
    console.log(`Fetching ${totalMinutes} minutes of data (${days} days)`);
    
    // Fetch 1-minute candlesticks and aggregate to 15-minute periods
    let historicalData;
    try {
      const { marketData } = await fetch1MinuteMarketData(totalMinutes);
      if (marketData.length === 0) {
        throw new Error('No data from fxverify');
      }
      historicalData = marketData;
      console.log(`Fetched ${historicalData.length} 15-minute periods with 1-minute granularity`);
    } catch (error) {
      console.warn('Failed to fetch 1-minute data from fxverify, trying 15-minute data:', error);
      try {
        // Fallback to 15-minute bars directly
        const bars = await fetchFxVerifyBars('IC Markets:BTCUSD', 15, undefined, undefined, total15MinBars);
        if (bars.length === 0) {
          throw new Error('No data from fxverify');
        }
        historicalData = convertFxVerifyBarsToMarketData(bars);
        console.log(`Using 15-minute aggregated data (no 1-minute granularity)`);
      } catch (fallbackError) {
        console.warn('Failed to fetch from fxverify, using simulated data:', fallbackError);
        // Final fallback to simulated data
        historicalData = await generateHistoricalData(total15MinBars);
      }
    }
    
    if (historicalData.length < 20) {
      return NextResponse.json(
        { error: 'Insufficient historical data for backtesting (need at least 20 bars)' },
        { status: 400 }
      );
    }
    
    // Create all models
    const models = createAllModels();
    
    // Run backtest with 1-minute candlestick support
    const has1MinuteData = historicalData.some(d => d.minuteCandles && d.minuteCandles.length > 0);
    const backtestResults = await runBacktest(models, historicalData, initialBalance, has1MinuteData);
    
    // Format results for response (exclude full trade history and balance history to reduce payload)
    const formattedResults = backtestResults.results.map(result => ({
      ...result,
      trades: result.trades.slice(-50), // Only last 50 trades
      balanceHistory: result.balanceHistory.filter((_, i) => i % 10 === 0), // Sample every 10th point
    }));
    
    return NextResponse.json({
      success: true,
      backtest: {
        ...backtestResults,
        results: formattedResults,
      },
      summary: {
        period: backtestResults.period,
        totalModels: backtestResults.results.length,
        bestModel: backtestResults.bestModel ? {
          id: backtestResults.bestModel.modelId,
          name: backtestResults.bestModel.modelName,
          return: backtestResults.bestModel.totalReturnPercent,
          winRate: backtestResults.bestModel.winRate,
        } : null,
        worstModel: backtestResults.worstModel ? {
          id: backtestResults.worstModel.modelId,
          name: backtestResults.worstModel.modelName,
          return: backtestResults.worstModel.totalReturnPercent,
          winRate: backtestResults.worstModel.winRate,
        } : null,
        averageReturn: backtestResults.averageReturn,
        averageWinRate: backtestResults.averageWinRate,
      },
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run backtest', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Backtesting endpoint - POST to test models on historical data',
    usage: {
      method: 'POST',
      body: {
        days: 'Number of days of historical data to use (default: 30)',
        barsPerDay: 'Number of 15-minute bars per day (default: 96, which is 24 hours)',
        initialBalance: 'Starting balance for backtest (default: 100)',
      },
      note: 'Uses 1-minute candlesticks to predict 15-minute price movements, matching Kalshi market structure',
    },
  });
}

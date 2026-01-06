import { NextResponse } from 'next/server';
import { convertFxVerifyBarsToMarketData, fetchFxVerifyBars } from '@/lib/fxverify';
import { PaperTradingEngine } from '@/lib/tradingEngine';
import { createAllModels } from '@/lib/models';
import { saveAllModelsToDb } from '@/lib/db';

/**
 * Training endpoint that uses historical data from fxverify.com
 * to train the models on past market conditions
 */
export async function POST(request: Request) {
  try {
    const { days = 7, barsPerDay = 96 } = await request.json().catch(() => ({}));
    
    // Calculate number of bars to fetch (15-minute intervals)
    // 96 bars = 24 hours (96 * 15 minutes = 1440 minutes = 24 hours)
    const totalBars = days * barsPerDay;
    
    console.log(`Training models with ${totalBars} bars (${days} days of data)`);
    
    // Fetch historical data from fxverify
    const bars = await fetchFxVerifyBars('IC Markets:BTCUSD', 15, undefined, undefined, totalBars);
    
    if (bars.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available' },
        { status: 404 }
      );
    }
    
    // Convert to MarketData format
    const historicalData = convertFxVerifyBarsToMarketData(bars);
    
    // Initialize models
    const models = createAllModels();
    const engine = new PaperTradingEngine(models);
    
    // Train models by simulating trading on historical data
    const results = [];
    const batchSize = 20; // Process 20 bars at a time
    
    for (let i = batchSize; i < historicalData.length; i += batchSize) {
      const currentData = historicalData[i];
      const history = historicalData.slice(Math.max(0, i - batchSize), i);
      
      // Execute trading cycle
      await engine.executeTradingCycle(currentData, history);
      
      // Settle positions periodically
      if (i % (batchSize * 4) === 0) {
        engine.settlePositions(currentData);
      }
      
      // Log progress
      if (i % (batchSize * 10) === 0) {
        const currentModels = engine.getModels();
        results.push({
          bar: i,
          timestamp: currentData.timestamp,
          models: currentModels.map(m => ({
            id: m.id,
            balance: m.state.balance,
            totalPnL: m.state.totalPnL,
            trades: m.state.trades.length,
          })),
        });
      }
    }
    
    // Final settlement
    if (historicalData.length > 0) {
      engine.settlePositions(historicalData[historicalData.length - 1]);
    }
    
    const finalModels = engine.getModels();
    const currentDate = new Date().toDateString();
    
    // Save trained models to database
    await saveAllModelsToDb(finalModels, currentDate);
    
    return NextResponse.json({
      success: true,
      message: `Trained models on ${historicalData.length} bars of historical data`,
      trainingPeriod: {
        start: historicalData[0]?.timestamp,
        end: historicalData[historicalData.length - 1]?.timestamp,
        totalBars: historicalData.length,
      },
      results: results,
      finalModels: finalModels.map(m => ({
        id: m.id,
        name: m.name,
        balance: m.state.balance,
        totalPnL: m.state.totalPnL,
        dailyReturn: m.state.dailyReturn,
        totalTrades: m.state.trades.length,
      })),
    });
  } catch (error) {
    console.error('Error training models:', error);
    return NextResponse.json(
      { error: 'Failed to train models', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Training endpoint - POST to train models on historical data',
    usage: {
      method: 'POST',
      body: {
        days: 'Number of days of historical data to use (default: 7)',
        barsPerDay: 'Number of 15-minute bars per day (default: 96, which is 24 hours)',
      },
    },
  });
}

import { NextResponse } from 'next/server';
import { PaperTradingEngine } from '@/lib/tradingEngine';
import { createAllModels, resetModel } from '@/lib/models';
import { loadModelsFromDb, saveAllModelsToDb, initializeModelsInDb, savePerformanceHistory } from '@/lib/db';
import { fetchMarketData, generateHistoricalData } from '@/lib/marketData';

async function getEngine(): Promise<PaperTradingEngine> {
  const currentDate = new Date().toDateString();
  
  // Load models from database
  const { models: dbModels, lastResetDate } = await loadModelsFromDb();
  
  let models = dbModels;
  
  // Initialize models if database is empty
  if (models.length === 0) {
    const allModels = createAllModels();
    await initializeModelsInDb(allModels);
    models = allModels;
  } else {
    // Restore decision-making functions from model factory
    const modelTemplates = createAllModels();
    const modelMap = new Map(modelTemplates.map(m => [m.id, m]));
    models = models.map(model => ({
      ...model,
      makeDecision: modelMap.get(model.id)?.makeDecision || model.makeDecision,
    }));
  }
  
  // Reset if new day
  if (currentDate !== lastResetDate && models.length > 0) {
    // Save performance history before resetting
    const yesterday = lastResetDate;
    
    for (const model of models) {
      await savePerformanceHistory(model.id, yesterday, {
        startingBalance: 100,
        endingBalance: model.state.balance,
        dailyReturn: model.state.dailyReturn,
        totalTrades: model.state.trades.length,
        totalPnL: model.state.totalPnL,
      });
    }
    
    // Reset all models
    models = models.map(resetModel);
    await saveAllModelsToDb(models, currentDate);
  }
  
  return new PaperTradingEngine(models);
}

export async function POST(request: Request) {
  try {
    const engine = await getEngine();
    const marketData = await fetchMarketData();
    const history = await generateHistoricalData(20);
    
    // Execute trading cycle
    await engine.executeTradingCycle(marketData, history);
    
    // Settle positions periodically (every 15 minutes in real scenario)
    engine.settlePositions(marketData);
    
    const models = engine.getModels();
    const currentDate = new Date().toDateString();
    
    // Save to database
    await saveAllModelsToDb(models, currentDate);
    
    return NextResponse.json({
      success: true,
      models,
      marketData,
    });
  } catch (error) {
    console.error('Error executing trade:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const engine = await getEngine();
    const models = engine.getModels();
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error getting models:', error);
    return NextResponse.json(
      { error: 'Failed to get models' },
      { status: 500 }
    );
  }
}

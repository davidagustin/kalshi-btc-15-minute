import { NextResponse } from 'next/server';
import { createAllModels, resetModel } from '@/lib/models';
import { loadModelsFromDb, saveAllModelsToDb, initializeModelsInDb, savePerformanceHistory } from '@/lib/db';
import { TradingModel } from '@/types/trading';

export async function GET() {
  try {
    // Load models from database
    const { models: dbModels, lastResetDate } = await loadModelsFromDb();
    const currentDate = new Date().toDateString();
    
    let models: TradingModel[] = dbModels;
    
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
    
    // Check if we need to reset (new day)
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

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error in GET /api/models:', error);
    return NextResponse.json(
      { error: 'Failed to load models' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'reset') {
      const allModels = createAllModels();
      const currentDate = new Date().toDateString();
      await saveAllModelsToDb(allModels, currentDate);
      
      return NextResponse.json({ success: true, models: allModels });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/models:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

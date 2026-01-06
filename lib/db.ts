import { supabase, DbModel, DbTrade, DbPosition } from './supabase';
import { TradingModel, Trade, Position, ModelState } from '@/types/trading';

// Convert database model to application model
function dbModelToTradingModel(dbModel: DbModel, trades: Trade[], positions: Position[]): TradingModel {
  return {
    id: dbModel.model_id,
    name: dbModel.model_name,
    description: dbModel.description || '',
    state: {
      balance: dbModel.balance,
      positions: positions,
      trades: trades,
      totalPnL: dbModel.total_pnl,
      dailyReturn: dbModel.daily_return,
    },
    makeDecision: async () => ({ action: 'HOLD' }), // This will be set by the model factory
  };
}

// Convert application model to database model
function tradingModelToDbModel(model: TradingModel, lastResetDate: string): Partial<DbModel> {
  return {
    model_id: model.id,
    model_name: model.name,
    description: model.description,
    balance: model.state.balance,
    total_pnl: model.state.totalPnL,
    daily_return: model.state.dailyReturn,
    total_trades: model.state.trades.length,
    last_reset_date: lastResetDate,
  };
}

// Load all models from database
export async function loadModelsFromDb(): Promise<{ models: TradingModel[]; lastResetDate: string }> {
  try {
    // Fetch all models
    const { data: dbModels, error: modelsError } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: true });

    if (modelsError) throw modelsError;
    if (!dbModels || dbModels.length === 0) {
      return { models: [], lastResetDate: new Date().toDateString() };
    }

    // Get the most recent reset date
    const lastResetDate = dbModels[0].last_reset_date || new Date().toDateString();

    // Fetch trades and positions for each model
    const models: TradingModel[] = [];
    for (const dbModel of dbModels) {
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('model_id', dbModel.model_id)
        .order('timestamp', { ascending: true });

      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('model_id', dbModel.model_id);

      const appTrades: Trade[] = (trades || []).map(t => ({
        id: t.id,
        timestamp: new Date(t.timestamp),
        direction: t.direction as 'UP' | 'DOWN',
        price: Number(t.price),
        quantity: t.quantity,
        cost: Number(t.cost),
      }));

      const appPositions: Position[] = (positions || []).map(p => ({
        direction: p.direction as 'UP' | 'DOWN',
        quantity: p.quantity,
        averagePrice: Number(p.average_price),
        totalCost: Number(p.total_cost),
      }));

      models.push(dbModelToTradingModel(dbModel, appTrades, appPositions));
    }

    return { models, lastResetDate };
  } catch (error) {
    console.error('Error loading models from database:', error);
    return { models: [], lastResetDate: new Date().toDateString() };
  }
}

// Save model to database
export async function saveModelToDb(model: TradingModel, lastResetDate: string): Promise<void> {
  try {
    const dbModel = tradingModelToDbModel(model, lastResetDate);

    // Upsert model
    const { error: modelError } = await supabase
      .from('models')
      .upsert(dbModel, { onConflict: 'model_id' });

    if (modelError) throw modelError;

    // Save trades (only new ones)
    const { data: existingTrades } = await supabase
      .from('trades')
      .select('id')
      .eq('model_id', model.id);
    
    const existingTradeIds = new Set(existingTrades?.map(t => t.id) || []);
    const newTrades = model.state.trades.filter(t => !existingTradeIds.has(t.id));
    if (newTrades.length > 0) {
      const dbTrades = newTrades.map(trade => ({
        model_id: model.id,
        timestamp: trade.timestamp.toISOString(),
        direction: trade.direction,
        price: trade.price,
        quantity: trade.quantity,
        cost: trade.cost,
      }));

      const { error: tradesError } = await supabase
        .from('trades')
        .insert(dbTrades);

      if (tradesError) throw tradesError;
    }

    // Upsert positions
    if (model.state.positions.length > 0) {
      const dbPositions = model.state.positions.map(pos => ({
        model_id: model.id,
        direction: pos.direction,
        quantity: pos.quantity,
        average_price: pos.averagePrice,
        total_cost: pos.totalCost,
      }));

      // Delete existing positions and insert new ones
      await supabase.from('positions').delete().eq('model_id', model.id);

      const { error: positionsError } = await supabase
        .from('positions')
        .insert(dbPositions);

      if (positionsError) throw positionsError;
    } else {
      // Clear positions if none exist
      await supabase.from('positions').delete().eq('model_id', model.id);
    }
  } catch (error) {
    console.error('Error saving model to database:', error);
    throw error;
  }
}

// Save all models to database
export async function saveAllModelsToDb(models: TradingModel[], lastResetDate: string): Promise<void> {
  await Promise.all(models.map(model => saveModelToDb(model, lastResetDate)));
}

// Initialize models in database if they don't exist
export async function initializeModelsInDb(models: TradingModel[]): Promise<void> {
  try {
    const { data: existingModels } = await supabase
      .from('models')
      .select('model_id');

    const existingIds = new Set(existingModels?.map(m => m.model_id) || []);

    const newModels = models.filter(m => !existingIds.has(m.id));
    if (newModels.length === 0) return;

    const today = new Date().toDateString();
    await saveAllModelsToDb(newModels, today);
  } catch (error) {
    console.error('Error initializing models in database:', error);
  }
}

// Save performance history
export async function savePerformanceHistory(modelId: string, date: string, performance: {
  startingBalance: number;
  endingBalance: number;
  dailyReturn: number;
  totalTrades: number;
  totalPnL: number;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('performance_history')
      .upsert({
        model_id: modelId,
        date,
        starting_balance: performance.startingBalance,
        ending_balance: performance.endingBalance,
        daily_return: performance.dailyReturn,
        total_trades: performance.totalTrades,
        total_pnl: performance.totalPnL,
      }, { onConflict: 'model_id,date' });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving performance history:', error);
  }
}

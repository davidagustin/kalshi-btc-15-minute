import { TradingModel, MarketData } from '@/types/trading';

export function createRandomModel(): TradingModel {
  return {
    id: 'random',
    name: 'Random Strategy',
    description: 'Makes random trading decisions',
    state: {
      balance: 100,
      positions: [],
      trades: [],
      totalPnL: 0,
      dailyReturn: 0,
    },
    makeDecision: async (marketData: MarketData) => {
      // Random decision with 30% probability of trading
      if (Math.random() < 0.3) {
        const action = Math.random() < 0.5 ? 'BUY_YES' : 'BUY_NO';
        const quantity = Math.floor(Math.random() * 10) + 1;
        return { action, quantity };
      }
      return { action: 'HOLD' };
    },
  };
}

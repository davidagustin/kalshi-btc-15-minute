import { TradingModel, MarketData } from '@/types/trading';

export function createMomentumModel(): TradingModel {
  return {
    id: 'momentum',
    name: 'Momentum Strategy',
    description: 'Follows price momentum trends',
    state: {
      balance: 100,
      positions: [],
      trades: [],
      totalPnL: 0,
      dailyReturn: 0,
    },
    makeDecision: async (marketData: MarketData, history: MarketData[]) => {
      if (history.length < 3) {
        return { action: 'HOLD' };
      }

      // Calculate momentum (price change over last 3 periods)
      const recent = history.slice(-3);
      const priceChange = recent[recent.length - 1].currentPrice - recent[0].currentPrice;
      const momentum = priceChange / recent[0].currentPrice;

      // Strong momentum threshold
      if (Math.abs(momentum) > 0.01) {
        if (momentum > 0) {
          // Upward momentum - buy YES
          return { action: 'BUY_YES', quantity: 5 };
        } else {
          // Downward momentum - buy NO
          return { action: 'BUY_NO', quantity: 5 };
        }
      }

      return { action: 'HOLD' };
    },
  };
}

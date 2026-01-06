import { TradingModel, MarketData } from '@/types/trading';

export function createMeanReversionModel(): TradingModel {
  return {
    id: 'mean-reversion',
    name: 'Mean Reversion Strategy',
    description: 'Bets on price returning to average',
    state: {
      balance: 100,
      positions: [],
      trades: [],
      totalPnL: 0,
      dailyReturn: 0,
    },
    makeDecision: async (marketData: MarketData, history: MarketData[]) => {
      if (history.length < 10) {
        return { action: 'HOLD' };
      }

      // Calculate moving average
      const prices = history.map(d => d.currentPrice);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const currentPrice = marketData.currentPrice;
      const deviation = (currentPrice - avg) / avg;

      // If price is significantly above average, bet it goes down
      if (deviation > 0.02) {
        return { action: 'BUY_NO', quantity: 5 };
      }
      // If price is significantly below average, bet it goes up
      else if (deviation < -0.02) {
        return { action: 'BUY_YES', quantity: 5 };
      }

      return { action: 'HOLD' };
    },
  };
}

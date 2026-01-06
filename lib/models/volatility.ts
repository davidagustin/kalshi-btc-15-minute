import { TradingModel, MarketData } from '@/types/trading';

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

export function createVolatilityModel(): TradingModel {
  return {
    id: 'volatility',
    name: 'Volatility Strategy',
    description: 'Trades based on volatility patterns',
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

      const prices = history.map(d => d.currentPrice);
      const recentVol = calculateVolatility(prices.slice(-5));
      const longVol = calculateVolatility(prices);

      // High volatility relative to average - bet on continuation
      if (recentVol > longVol * 1.5) {
        const recentChange = prices[prices.length - 1] - prices[prices.length - 2];
        if (recentChange > 0) {
          return { action: 'BUY_YES', quantity: 5 };
        } else {
          return { action: 'BUY_NO', quantity: 5 };
        }
      }

      return { action: 'HOLD' };
    },
  };
}

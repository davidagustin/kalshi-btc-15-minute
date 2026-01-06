import { TradingModel, MarketData } from '@/types/trading';

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function createRSIModel(): TradingModel {
  return {
    id: 'rsi',
    name: 'RSI Strategy',
    description: 'Uses Relative Strength Index indicator',
    state: {
      balance: 100,
      positions: [],
      trades: [],
      totalPnL: 0,
      dailyReturn: 0,
    },
    makeDecision: async (marketData: MarketData, history: MarketData[]) => {
      if (history.length < 15) {
        return { action: 'HOLD' };
      }

      const prices = history.map(d => d.currentPrice);
      const rsi = calculateRSI(prices);

      // RSI > 70: overbought, bet price goes down
      if (rsi > 70) {
        return { action: 'BUY_NO', quantity: 5 };
      }
      // RSI < 30: oversold, bet price goes up
      else if (rsi < 30) {
        return { action: 'BUY_YES', quantity: 5 };
      }

      return { action: 'HOLD' };
    },
  };
}

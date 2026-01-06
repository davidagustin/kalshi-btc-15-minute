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
      // Use 1-minute candlesticks if available for more granular analysis
      let priceData: number[] = [];
      
      if (marketData.minuteCandles && marketData.minuteCandles.length > 0) {
        // Use 1-minute candle closes for momentum calculation
        priceData = marketData.minuteCandles.map(c => c.close);
        
        // Also include recent history's minute candles
        for (const h of history.slice(-5)) {
          if (h.minuteCandles && h.minuteCandles.length > 0) {
            priceData.push(...h.minuteCandles.map(c => c.close));
          } else {
            priceData.push(h.currentPrice);
          }
        }
      } else {
        // Fallback to 15-minute periods
        if (history.length < 3) {
          return { action: 'HOLD' };
        }
        priceData = history.slice(-10).map(d => d.currentPrice);
        priceData.push(marketData.currentPrice);
      }

      if (priceData.length < 5) {
        return { action: 'HOLD' };
      }

      // Calculate momentum using recent price data
      // For 1-minute data, look at last 5-10 minutes
      // For 15-minute data, look at last 3 periods
      const lookback = Math.min(10, Math.floor(priceData.length / 2));
      const recent = priceData.slice(-lookback);
      const priceChange = recent[recent.length - 1] - recent[0];
      const momentum = priceChange / recent[0];

      // Strong momentum threshold (adjusted for 1-minute granularity)
      const threshold = priceData.length > 15 ? 0.002 : 0.01; // Lower threshold for 1-min data
      
      if (Math.abs(momentum) > threshold) {
        if (momentum > 0) {
          // Upward momentum - buy YES (predict price goes up in next 15 min)
          return { action: 'BUY_YES', quantity: 5 };
        } else {
          // Downward momentum - buy NO (predict price goes down in next 15 min)
          return { action: 'BUY_NO', quantity: 5 };
        }
      }

      return { action: 'HOLD' };
    },
  };
}

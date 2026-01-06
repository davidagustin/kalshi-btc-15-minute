import { TradingModel, MarketData, Trade, Candlestick } from '@/types/trading';
import { PaperTradingEngine } from './tradingEngine';
import { fetch1MinuteMarketData } from './fxverify';

export interface BacktestResult {
  modelId: string;
  modelName: string;
  startingBalance: number;
  endingBalance: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  trades: Trade[];
  balanceHistory: { timestamp: Date; balance: number }[];
  dailyReturns: number[];
}

export interface BacktestSummary {
  period: {
    start: Date;
    end: Date;
    totalBars: number;
    days: number;
  };
  results: BacktestResult[];
  bestModel: BacktestResult | null;
  worstModel: BacktestResult | null;
  averageReturn: number;
  averageWinRate: number;
}

/**
 * Runs backtesting on models using 1-minute candlesticks to predict 15-minute price movements
 * Simulates Kalshi-style binary betting (UP/DOWN) on 15-minute intervals
 */
export async function runBacktest(
  models: TradingModel[],
  historicalData: MarketData[],
  initialBalance: number = 100,
  use1MinuteData: boolean = true
): Promise<BacktestSummary> {
  if (historicalData.length < 20) {
    throw new Error('Insufficient historical data for backtesting (need at least 20 bars)');
  }
  
  // If using 1-minute data, ensure we have minute candles for each period
  if (use1MinuteData && historicalData.some(d => !d.minuteCandles || d.minuteCandles.length === 0)) {
    console.warn('Some periods missing 1-minute candles, using aggregated data only');
  }

  const results: BacktestResult[] = [];
  const batchSize = 20; // Minimum history needed for models

  // Test each model independently
  for (const modelTemplate of models) {
    // Create a fresh copy of the model for backtesting
    const model: TradingModel = {
      ...modelTemplate,
      state: {
        balance: initialBalance,
        positions: [],
        trades: [],
        totalPnL: 0,
        dailyReturn: 0,
      },
    };

    const engine = new PaperTradingEngine([model]);
    const balanceHistory: { timestamp: Date; balance: number }[] = [
      { timestamp: historicalData[0].timestamp, balance: initialBalance }
    ];
    const dailyReturns: number[] = [];
    let peakBalance = initialBalance;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    // Run backtest through historical data
    // Each iteration represents a 15-minute period
    for (let i = batchSize; i < historicalData.length; i++) {
      const periodStart = historicalData[i];
      const history = historicalData.slice(Math.max(0, i - batchSize), i);
      
      // Build history with 1-minute granularity if available
      let detailedHistory = history;
      if (use1MinuteData && periodStart.minuteCandles && periodStart.minuteCandles.length > 0) {
        // Create MarketData from 1-minute candles for more granular history
        const minuteHistory: MarketData[] = [];
        for (let j = Math.max(0, i - batchSize); j < i; j++) {
          const period = historicalData[j];
          if (period.minuteCandles && period.minuteCandles.length > 0) {
            // Add each 1-minute candle as a data point
            for (const candle of period.minuteCandles) {
              const priceChange = minuteHistory.length > 0
                ? ((candle.close - minuteHistory[minuteHistory.length - 1].currentPrice) / minuteHistory[minuteHistory.length - 1].currentPrice) * 100
                : 0;
              const yesPrice = Math.max(1, Math.min(99, 50 + (priceChange * 10)));
              minuteHistory.push({
                timestamp: candle.timestamp,
                currentPrice: Math.round(candle.close),
                yesPrice: Math.round(yesPrice * 100) / 100,
                noPrice: Math.round((100 - yesPrice) * 100) / 100,
                volume: candle.volume,
                minuteCandles: [candle],
              });
            }
          } else {
            minuteHistory.push(period);
          }
        }
        detailedHistory = minuteHistory;
      }

      // Make trading decision at the START of the 15-minute period
      // Use 1-minute candles from previous periods + current period start
      const decisionData = periodStart;
      await engine.executeTradingCycle(decisionData, detailedHistory);

      // Settle positions at the END of the 15-minute period
      // Check if price went UP or DOWN during this period
      if (i < historicalData.length - 1) {
        const periodEnd = historicalData[i + 1];
        const startPrice = periodStart.currentPrice;
        const endPrice = periodEnd.currentPrice;
        const priceChange = endPrice - startPrice;
        const priceChangePercent = (priceChange / startPrice) * 100;
        
        // Create settlement data based on actual outcome
        const settlementData: MarketData = {
          ...periodEnd,
          // If price went up, YES wins (settles at 100), NO loses (settles at 0)
          // If price went down, NO wins (settles at 100), YES loses (settles at 0)
          yesPrice: priceChangePercent > 0 ? 100 : 0,
          noPrice: priceChangePercent <= 0 ? 100 : 0,
        };
        
        engine.settlePositions(settlementData);
      } else {
        // Final period - settle with last known price
        engine.settlePositions(periodStart);
      }

      // Track balance history
      const currentModels = engine.getModels();
      if (currentModels.length > 0) {
        const currentBalance = currentModels[0].state.balance;
        balanceHistory.push({
          timestamp: periodStart.timestamp,
          balance: currentBalance,
        });

        // Calculate drawdown
        if (currentBalance > peakBalance) {
          peakBalance = currentBalance;
        }
        const drawdown = peakBalance - currentBalance;
        const drawdownPercent = (drawdown / peakBalance) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
        if (drawdownPercent > maxDrawdownPercent) {
          maxDrawdownPercent = drawdownPercent;
        }
      }
    }

    // Final settlement
    if (historicalData.length > 0) {
      engine.settlePositions(historicalData[historicalData.length - 1]);
    }

    const finalModels = engine.getModels();
    if (finalModels.length === 0) continue;

    const finalModel = finalModels[0];
    const finalBalance = finalModel.state.balance;
    const totalReturn = finalBalance - initialBalance;
    const totalReturnPercent = (totalReturn / initialBalance) * 100;

    // Analyze trades - use engine's P&L calculation which properly handles Kalshi-style settlement
    const trades = finalModel.state.trades;
    
    // For Kalshi binary markets:
    // - If you buy YES at 50 cents and price goes UP, you get $1 per share (profit = 50 cents per share)
    // - If you buy NO at 50 cents and price goes DOWN, you get $1 per share (profit = 50 cents per share)
    // - If wrong, you lose your entire cost
    
    // Track individual trade outcomes by analyzing position settlements
    // Since the engine settles positions, we can estimate win/loss from trade patterns
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;

    // Calculate win/loss based on 15-minute period outcomes
    // Each trade is made at the START of a 15-minute period
    // Settlement happens at the END of that same period
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      const tradeIndex = historicalData.findIndex(
        d => Math.abs(d.timestamp.getTime() - trade.timestamp.getTime()) < 900000 // Within 15 minutes
      );

      if (tradeIndex >= 0 && tradeIndex < historicalData.length - 1) {
        const periodStart = historicalData[tradeIndex];
        const periodEnd = historicalData[tradeIndex + 1]; // Next 15-minute period is the settlement
        
        // Calculate price change during the 15-minute period
        const startPrice = periodStart.currentPrice;
        const endPrice = periodEnd.currentPrice;
        const priceChange = endPrice - startPrice;
        const priceChangePercent = (priceChange / startPrice) * 100;
        
        // For Kalshi binary markets:
        // - BUY_YES wins if price goes UP (endPrice > startPrice)
        // - BUY_NO wins if price goes DOWN (endPrice < startPrice)
        // - Need a minimum threshold to avoid noise (0.01% = $5 on $50k BTC)
        const threshold = 0.01; // 0.01% minimum movement
        
        let isWin = false;
        if (trade.direction === 'UP') {
          // Win if price went up by at least the threshold
          isWin = priceChangePercent > threshold;
        } else {
          // Win if price went down by at least the threshold
          isWin = priceChangePercent < -threshold;
        }

        if (isWin) {
          winningTrades++;
          // Profit = (100 - entry_price) * quantity
          // Kalshi pays $1 per winning share, so profit is (100 - entry_price) cents per share
          const profit = (100 - trade.price) * trade.quantity;
          totalWins += profit;
        } else {
          losingTrades++;
          // Loss = entry cost (you lose what you paid for the shares)
          totalLosses += trade.cost;
        }
      } else {
        // If we can't find the trade in history, check if it's in the final period
        // For final period trades, we can't determine outcome, so mark as loss
        losingTrades++;
        totalLosses += trade.cost;
      }
    }

    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
    const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = balanceHistory.slice(1).map((h, i) => {
      const prevBalance = balanceHistory[i].balance;
      return prevBalance > 0 ? (h.balance - prevBalance) / prevBalance : 0;
    });

    const avgReturn = returns.length > 0
      ? returns.reduce((a, b) => a + b, 0) / returns.length
      : 0;
    const returnStdDev = returns.length > 1
      ? Math.sqrt(
          returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
        )
      : 0;
    const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(252) : 0; // Annualized

    // Calculate daily returns
    const dailyBalanceMap = new Map<string, number>();
    for (const bh of balanceHistory) {
      const dayKey = bh.timestamp.toISOString().split('T')[0];
      dailyBalanceMap.set(dayKey, bh.balance);
    }

    const sortedDays = Array.from(dailyBalanceMap.keys()).sort();
    for (let i = 1; i < sortedDays.length; i++) {
      const prevBalance = dailyBalanceMap.get(sortedDays[i - 1]) || initialBalance;
      const currBalance = dailyBalanceMap.get(sortedDays[i]) || initialBalance;
      const dailyReturn = ((currBalance - prevBalance) / prevBalance) * 100;
      dailyReturns.push(dailyReturn);
    }

    results.push({
      modelId: finalModel.id,
      modelName: finalModel.name,
      startingBalance: initialBalance,
      endingBalance: finalBalance,
      totalReturn,
      totalReturnPercent,
      totalTrades: trades.length,
      winningTrades: winningTrades,
      losingTrades: losingTrades,
      winRate,
      totalPnL: finalModel.state.totalPnL,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      trades,
      balanceHistory,
      dailyReturns,
    });
  }

  // Calculate summary statistics
  const bestModel = results.reduce((best, current) =>
    current.totalReturnPercent > best.totalReturnPercent ? current : best,
    results[0]
  ) || null;

  const worstModel = results.reduce((worst, current) =>
    current.totalReturnPercent < worst.totalReturnPercent ? current : worst,
    results[0]
  ) || null;

  const averageReturn = results.length > 0
    ? results.reduce((sum, r) => sum + r.totalReturnPercent, 0) / results.length
    : 0;

  const averageWinRate = results.length > 0
    ? results.reduce((sum, r) => sum + r.winRate, 0) / results.length
    : 0;

  return {
    period: {
      start: historicalData[0].timestamp,
      end: historicalData[historicalData.length - 1].timestamp,
      totalBars: historicalData.length,
      days: Math.ceil(historicalData.length / 96), // 96 bars per day
    },
    results,
    bestModel,
    worstModel,
    averageReturn,
    averageWinRate,
  };
}

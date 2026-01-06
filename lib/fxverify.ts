import axios from 'axios';
import { MarketData } from '@/types/trading';

interface FxVerifyBar {
  time: number; // Unix timestamp
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
}

interface FxVerifyResponse {
  s: string; // Status: 'ok' or 'error'
  t?: number[]; // Timestamps
  o?: number[]; // Open prices
  h?: number[]; // High prices
  l?: number[]; // Low prices
  c?: number[]; // Close prices
  v?: number[]; // Volumes
  errmsg?: string; // Error message
}

/**
 * Fetches historical 15-minute BTC/USD data from fxverify.com
 */
export async function fetchFxVerifyBars(
  symbol: string = 'IC Markets:BTCUSD',
  resolution: number = 15,
  from?: number,
  to?: number,
  countback: number = 300
): Promise<FxVerifyBar[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const toTime = to || now;
    const fromTime = from || (toTime - (countback * resolution * 60));

    const url = `https://fxverify.com/api/live-chart/datafeed/bars`;
    const params = {
      symbol: encodeURIComponent(symbol),
      resolution,
      from: fromTime,
      to: toTime,
      countback,
    };

    const response = await axios.get<FxVerifyResponse>(url, { params });

    if (response.data.s === 'error') {
      throw new Error(response.data.errmsg || 'Failed to fetch data from fxverify');
    }

    if (!response.data.t || !response.data.c) {
      throw new Error('Invalid response format from fxverify');
    }

    const bars: FxVerifyBar[] = [];
    const timestamps = response.data.t;
    const opens = response.data.o || [];
    const highs = response.data.h || [];
    const lows = response.data.l || [];
    const closes = response.data.c;
    const volumes = response.data.v || [];

    for (let i = 0; i < timestamps.length; i++) {
      bars.push({
        time: timestamps[i],
        open: opens[i] || closes[i],
        high: highs[i] || closes[i],
        low: lows[i] || closes[i],
        close: closes[i],
        volume: volumes[i] || 0,
      });
    }

    return bars.sort((a, b) => a.time - b.time);
  } catch (error) {
    console.error('Error fetching fxverify data:', error);
    throw error;
  }
}

/**
 * Converts fxverify bars to MarketData format
 */
export function convertFxVerifyBarsToMarketData(bars: FxVerifyBar[]): MarketData[] {
  return bars.map((bar, index) => {
    const currentPrice = bar.close;
    
    // Calculate price change for this period
    const priceChange = index > 0 
      ? ((bar.close - bars[index - 1].close) / bars[index - 1].close) * 100
      : 0;
    
    // Convert to Kalshi market format
    // YES price + NO price = 100 cents
    // If price went up, YES price should be higher
    const yesPrice = Math.max(1, Math.min(99, 50 + (priceChange * 10)));
    const noPrice = 100 - yesPrice;

    return {
      timestamp: new Date(bar.time * 1000),
      currentPrice: Math.round(currentPrice),
      yesPrice: Math.round(yesPrice * 100) / 100,
      noPrice: Math.round(noPrice * 100) / 100,
      volume: Math.round(bar.volume),
    };
  });
}

/**
 * Fetches current market data from fxverify
 */
export async function fetchCurrentMarketData(): Promise<MarketData> {
  try {
    const bars = await fetchFxVerifyBars('IC Markets:BTCUSD', 15, undefined, undefined, 1);
    if (bars.length === 0) {
      throw new Error('No data received from fxverify');
    }
    
    const latestBar = bars[bars.length - 1];
    const currentPrice = latestBar.close;
    
    // For current data, we'll use a neutral market (50/50)
    // In production, you'd fetch actual Kalshi market prices
    return {
      timestamp: new Date(latestBar.time * 1000),
      currentPrice: Math.round(currentPrice),
      yesPrice: 50,
      noPrice: 50,
      volume: Math.round(latestBar.volume),
    };
  } catch (error) {
    console.error('Error fetching current market data:', error);
    // Fallback to simulated data
    throw error;
  }
}

/**
 * Fetches 1-minute candlesticks for a given time period
 */
export async function fetch1MinuteCandles(
  symbol: string = 'IC Markets:BTCUSD',
  from?: number,
  to?: number,
  countback: number = 1000
): Promise<FxVerifyBar[]> {
  return fetchFxVerifyBars(symbol, 1, from, to, countback);
}

/**
 * Aggregates 1-minute candlesticks into 15-minute periods
 */
export function aggregateTo15Minutes(minuteBars: FxVerifyBar[]): FxVerifyBar[] {
  const aggregated: FxVerifyBar[] = [];
  const periodMs = 15 * 60 * 1000; // 15 minutes in milliseconds

  let currentPeriod: FxVerifyBar | null = null;
  let periodStartTime = 0;

  for (const bar of minuteBars) {
    const barTime = bar.time * 1000; // Convert to milliseconds
    const periodTime = Math.floor(barTime / periodMs) * periodMs;
    const periodTimestamp = Math.floor(periodTime / 1000); // Back to seconds

    if (!currentPeriod || periodStartTime !== periodTimestamp) {
      // Start new 15-minute period
      if (currentPeriod) {
        aggregated.push(currentPeriod);
      }
      currentPeriod = {
        time: periodTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      };
      periodStartTime = periodTimestamp;
    } else {
      // Aggregate into current period
      if (currentPeriod) {
        currentPeriod.high = Math.max(currentPeriod.high, bar.high);
        currentPeriod.low = Math.min(currentPeriod.low, bar.low);
        currentPeriod.close = bar.close; // Last close price
        currentPeriod.volume += bar.volume;
      }
    }
  }

  // Add final period
  if (currentPeriod) {
    aggregated.push(currentPeriod);
  }

  return aggregated;
}

/**
 * Fetches 1-minute candlesticks and converts to MarketData with minute-level detail
 */
export async function fetch1MinuteMarketData(
  minutes: number = 1000
): Promise<{ minuteCandles: FxVerifyBar[]; marketData: MarketData[] }> {
  try {
    // Fetch 1-minute candlesticks
    const minuteBars = await fetch1MinuteCandles('IC Markets:BTCUSD', undefined, undefined, minutes);
    
    // Aggregate to 15-minute periods for market data
    const aggregatedBars = aggregateTo15Minutes(minuteBars);
    const marketData = convertFxVerifyBarsToMarketData(aggregatedBars);
    
    // Attach 1-minute candles to each 15-minute period
    const periodMs = 15 * 60 * 1000;
    for (let i = 0; i < marketData.length; i++) {
      const periodStart = marketData[i].timestamp.getTime();
      const periodEnd = periodStart + periodMs;
      
      const periodMinutes = minuteBars.filter(bar => {
        const barTime = bar.time * 1000;
        return barTime >= periodStart && barTime < periodEnd;
      });
      
      marketData[i].minuteCandles = periodMinutes.map(bar => ({
        timestamp: new Date(bar.time * 1000),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));
    }
    
    return {
      minuteCandles: minuteBars,
      marketData,
    };
  } catch (error) {
    console.error('Error fetching 1-minute market data:', error);
    throw error;
  }
}

/**
 * Fetches historical market data for training
 */
export async function fetchHistoricalMarketData(count: number = 100): Promise<MarketData[]> {
  try {
    const bars = await fetchFxVerifyBars('IC Markets:BTCUSD', 15, undefined, undefined, count);
    return convertFxVerifyBarsToMarketData(bars);
  } catch (error) {
    console.error('Error fetching historical market data:', error);
    throw error;
  }
}

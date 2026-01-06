import { MarketData } from '@/types/trading';
import { fetchCurrentMarketData, fetchHistoricalMarketData as fetchFxVerifyHistorical } from './fxverify';

// Use real data from fxverify.com, with fallback to simulation
export async function fetchMarketData(): Promise<MarketData> {
  try {
    // Try to fetch real data from fxverify
    return await fetchCurrentMarketData();
  } catch (error) {
    console.warn('Failed to fetch from fxverify, using simulated data:', error);
    // Fallback to simulated data
    return generateSimulatedMarketData();
  }
}

// Fallback simulated market data generator
function generateSimulatedMarketData(): MarketData {
  const basePrice = 50000;
  const volatility = 0.02;
  const randomChange = (Math.random() - 0.5) * volatility;
  const currentPrice = basePrice * (1 + randomChange);

  const yesPrice = 50 + (randomChange * 1000);
  const noPrice = 100 - yesPrice;

  return {
    timestamp: new Date(),
    currentPrice: Math.round(currentPrice),
    yesPrice: Math.max(1, Math.min(99, Math.round(yesPrice * 100) / 100)),
    noPrice: Math.max(1, Math.min(99, Math.round(noPrice * 100) / 100)),
    volume: Math.floor(Math.random() * 10000) + 1000,
  };
}

// Fetch historical data - uses real data from fxverify when available
export async function generateHistoricalData(count: number = 20): Promise<MarketData[]> {
  try {
    // Try to fetch real historical data
    const realData = await fetchFxVerifyHistorical(count);
    if (realData.length > 0) {
      return realData;
    }
  } catch (error) {
    console.warn('Failed to fetch historical data from fxverify, using simulated data:', error);
  }
  
  // Fallback to simulated data
  return generateSimulatedHistoricalData(count);
}

// Fallback simulated historical data
function generateSimulatedHistoricalData(count: number = 20): MarketData[] {
  const data: MarketData[] = [];
  const basePrice = 50000;
  
  for (let i = 0; i < count; i++) {
    const volatility = 0.02;
    const trend = (Math.random() - 0.5) * 0.001;
    const randomChange = (Math.random() - 0.5) * volatility + trend * i;
    const currentPrice = basePrice * (1 + randomChange);
    
    const yesPrice = 50 + (randomChange * 1000);
    const noPrice = 100 - yesPrice;

    data.push({
      timestamp: new Date(Date.now() - (count - i) * 15 * 60 * 1000),
      currentPrice: Math.round(currentPrice),
      yesPrice: Math.max(1, Math.min(99, Math.round(yesPrice * 100) / 100)),
      noPrice: Math.max(1, Math.min(99, Math.round(noPrice * 100) / 100)),
      volume: Math.floor(Math.random() * 10000) + 1000,
    });
  }

  return data;
}

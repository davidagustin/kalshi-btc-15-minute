export type MarketDirection = 'UP' | 'DOWN';

export interface MarketData {
  timestamp: Date;
  currentPrice: number;
  yesPrice: number; // Price to buy "YES" (price goes up)
  noPrice: number;  // Price to buy "NO" (price goes down)
  volume: number;
}

export interface Trade {
  id: string;
  timestamp: Date;
  direction: MarketDirection;
  price: number;
  quantity: number;
  cost: number;
}

export interface Position {
  direction: MarketDirection;
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

export interface ModelState {
  balance: number;
  positions: Position[];
  trades: Trade[];
  totalPnL: number;
  dailyReturn: number;
}

export interface TradingModel {
  id: string;
  name: string;
  description: string;
  state: ModelState;
  makeDecision: (marketData: MarketData, history: MarketData[]) => Promise<{
    action: 'BUY_YES' | 'BUY_NO' | 'SELL' | 'HOLD';
    quantity?: number;
  }>;
}

export interface ModelPerformance {
  modelId: string;
  modelName: string;
  startingBalance: number;
  currentBalance: number;
  totalPnL: number;
  dailyReturn: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
}

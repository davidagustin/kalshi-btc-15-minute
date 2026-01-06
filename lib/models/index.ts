import { TradingModel } from '@/types/trading';
import { createRandomModel } from './random';
import { createMomentumModel } from './momentum';
import { createMeanReversionModel } from './meanReversion';
import { createRSIModel } from './rsi';
import { createVolatilityModel } from './volatility';

export function createAllModels(): TradingModel[] {
  return [
    createRandomModel(),
    createMomentumModel(),
    createMeanReversionModel(),
    createRSIModel(),
    createVolatilityModel(),
  ];
}

export function resetModel(model: TradingModel): TradingModel {
  return {
    ...model,
    state: {
      balance: 100,
      positions: [],
      trades: [],
      totalPnL: 0,
      dailyReturn: 0,
    },
  };
}

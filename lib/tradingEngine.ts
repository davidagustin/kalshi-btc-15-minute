import { TradingModel, MarketData, Trade, Position, ModelState } from '@/types/trading';

export class PaperTradingEngine {
  private models: Map<string, TradingModel> = new Map();

  constructor(models: TradingModel[]) {
    models.forEach(model => {
      this.models.set(model.id, { ...model });
    });
  }

  async executeTradingCycle(marketData: MarketData, history: MarketData[]): Promise<void> {
    for (const model of this.models.values()) {
      try {
        const decision = await model.makeDecision(marketData, history);
        
        if (decision.action === 'HOLD') {
          continue;
        }

        if (decision.action === 'SELL') {
          this.closePositions(model);
          continue;
        }

        if (decision.action === 'BUY_YES' || decision.action === 'BUY_NO') {
          const direction = decision.action === 'BUY_YES' ? 'UP' : 'DOWN';
          const price = direction === 'UP' ? marketData.yesPrice : marketData.noPrice;
          const quantity = decision.quantity || 1;
          const cost = price * quantity;

          if (cost <= model.state.balance) {
            this.executeTrade(model, {
              direction,
              price,
              quantity,
              cost,
            }, marketData);
          }
        }
      } catch (error) {
        console.error(`Error executing trade for model ${model.id}:`, error);
      }
    }
  }

  private executeTrade(model: TradingModel, trade: { direction: 'UP' | 'DOWN'; price: number; quantity: number; cost: number }, marketData: MarketData): void {
    const tradeRecord: Trade = {
      id: `${model.id}-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      direction: trade.direction,
      price: trade.price,
      quantity: trade.quantity,
      cost: trade.cost,
    };

    model.state.balance -= trade.cost;
    model.state.trades.push(tradeRecord);

    // Update or create position
    const existingPosition = model.state.positions.find(
      p => p.direction === trade.direction
    );

    if (existingPosition) {
      const totalCost = existingPosition.totalCost + trade.cost;
      const totalQuantity = existingPosition.quantity + trade.quantity;
      existingPosition.averagePrice = totalCost / totalQuantity;
      existingPosition.quantity = totalQuantity;
      existingPosition.totalCost = totalCost;
    } else {
      model.state.positions.push({
        direction: trade.direction,
        quantity: trade.quantity,
        averagePrice: trade.price,
        totalCost: trade.cost,
      });
    }
  }

  private closePositions(model: TradingModel): void {
    // Calculate PnL for closed positions
    // In a real scenario, this would use current market prices
    // For simplicity, we'll use the average price as exit price
    let totalPnL = 0;
    
    model.state.positions.forEach(position => {
      // Simplified: assume positions are settled at average price
      // In reality, you'd use current market prices
      const exitValue = position.averagePrice * position.quantity;
      totalPnL += exitValue - position.totalCost;
      model.state.balance += exitValue;
    });

    model.state.totalPnL += totalPnL;
    model.state.positions = [];
  }

  settlePositions(marketData: MarketData): void {
    for (const model of this.models.values()) {
      let totalPnL = 0;
      
      model.state.positions.forEach(position => {
        // Settle positions at current market prices
        const currentPrice = position.direction === 'UP' 
          ? marketData.yesPrice 
          : marketData.noPrice;
        const exitValue = currentPrice * position.quantity;
        const pnl = exitValue - position.totalCost;
        totalPnL += pnl;
        model.state.balance += exitValue;
      });

      model.state.totalPnL += totalPnL;
      model.state.dailyReturn = ((model.state.balance - 100) / 100) * 100;
      model.state.positions = [];
    }
  }

  getModels(): TradingModel[] {
    return Array.from(this.models.values());
  }

  resetAllModels(): void {
    for (const [id, model] of this.models.entries()) {
      this.models.set(id, {
        ...model,
        state: {
          balance: 100,
          positions: [],
          trades: [],
          totalPnL: 0,
          dailyReturn: 0,
        },
      });
    }
  }
}

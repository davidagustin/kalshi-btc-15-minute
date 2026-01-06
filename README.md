# Kalshi Bitcoin Trading Models

A Next.js application for paper trading multiple AI/ML models on Kalshi's Bitcoin 15-minute price prediction market. Each model starts with $100 and resets at the end of each day.

## Features

- **5 Trading Models**: Each implementing different strategies:
  - **Random Strategy**: Makes random trading decisions
  - **Momentum Strategy**: Follows price momentum trends
  - **Mean Reversion Strategy**: Bets on price returning to average
  - **RSI Strategy**: Uses Relative Strength Index indicator
  - **Volatility Strategy**: Trades based on volatility patterns

- **Paper Trading Engine**: Simulates trading without real money
- **Daily Reset**: All models automatically reset to $100 at midnight
- **Performance Dashboard**: Real-time comparison of model performance
- **Live Charts**: Visual representation of balance over time

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase-schema.sql` to create the necessary tables:
   - `models` - Stores trading model states
   - `trades` - Stores all trade history
   - `positions` - Stores open positions
   - `performance_history` - Stores daily performance metrics

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://epxrqaxdvcbtjxguzlnr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2Goh-5Qq10XyYvT6ETcxGQ_01FLO9f-
```

Or copy from `.env.local.example`:
```bash
cp .env.local.example .env.local
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the trading dashboard.

## How It Works

1. **Market Data**: The system fetches (or simulates) Bitcoin market data from Kalshi
2. **Trading Cycle**: Each model makes trading decisions based on market conditions
3. **Paper Trading**: Trades are executed in a simulated environment
4. **Performance Tracking**: All models are tracked and compared in real-time
5. **Daily Reset**: At midnight, all models reset to $100 starting balance

## API Routes

- `/api/models` - Get all trading models and their states
- `/api/market` - Get current market data
- `/api/trade` - Execute a trading cycle
- `/api/reset-daily` - Daily reset endpoint (called by cron)

## Trading Models

Each model implements a different strategy:

- **Random**: 30% probability of making a random trade
- **Momentum**: Trades based on recent price momentum
- **Mean Reversion**: Trades when price deviates from moving average
- **RSI**: Uses RSI indicator (overbought/oversold conditions)
- **Volatility**: Trades based on volatility patterns

## Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com):

1. Push your code to GitHub
2. Import the project in Vercel
3. The cron job for daily resets will be automatically configured via `vercel.json`

## Database Schema

The application uses Supabase (PostgreSQL) to persist:
- **Model States**: Current balance, P&L, daily returns for each model
- **Trade History**: All trades executed by each model
- **Open Positions**: Current positions held by each model
- **Performance History**: Daily performance metrics for historical analysis

## Notes

- **Data Persistence**: All trading data is persisted in Supabase, so it survives server restarts
- **Market Data**: Currently uses simulated market data. To use real Kalshi API data, update `lib/marketData.ts` with your API credentials
- **Daily Reset**: Models reset automatically when a new day is detected, and previous day's performance is saved to `performance_history` table
- **Paper Trading**: All trading is simulated - no real money is involved
- **Row Level Security**: The Supabase tables have RLS enabled with permissive policies. Adjust security policies in production based on your needs

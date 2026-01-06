# Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase Database

1. Go to your Supabase project: https://supabase.com/dashboard/project/epxrqaxdvcbtjxguzlnr
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-schema.sql`
5. Click **Run** to execute the SQL script

This will create:
- `models` table - Stores trading model states
- `trades` table - Stores all trade history  
- `positions` table - Stores open positions
- `performance_history` table - Stores daily performance metrics

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://epxrqaxdvcbtjxguzlnr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2Goh-5Qq10XyYvT6ETcxGQ_01FLO9f-
```

**Note**: The publishable key is safe to use in the browser as long as Row Level Security (RLS) is properly configured (which the schema does).

### 4. Run the Application

```bash
npm run dev
```

Visit http://localhost:3000 to see the trading dashboard.

## Database Tables

### models
Stores the current state of each trading model:
- `model_id` - Unique identifier (e.g., 'random', 'momentum')
- `balance` - Current account balance
- `total_pnl` - Total profit/loss
- `daily_return` - Today's return percentage
- `last_reset_date` - Date of last reset

### trades
Historical record of all trades:
- `model_id` - Which model made the trade
- `direction` - 'UP' or 'DOWN'
- `price` - Execution price
- `quantity` - Number of contracts
- `cost` - Total cost of the trade

### positions
Current open positions:
- `model_id` - Which model holds the position
- `direction` - 'UP' or 'DOWN'
- `quantity` - Number of contracts
- `average_price` - Average entry price
- `total_cost` - Total cost basis

### performance_history
Daily performance snapshots:
- `model_id` - Which model
- `date` - Trading date
- `starting_balance` - Balance at start of day
- `ending_balance` - Balance at end of day
- `daily_return` - Return percentage for the day

## Troubleshooting

### Database Connection Issues
- Verify your Supabase URL and API key in `.env.local`
- Check that the SQL schema has been executed successfully
- Ensure Row Level Security policies are set correctly

### Models Not Loading
- Check browser console for errors
- Verify database tables exist in Supabase dashboard
- Check that models were initialized (first API call should create them)

### Daily Reset Not Working
- Verify the `last_reset_date` field is being updated
- Check that the cron job is configured (if using Vercel)
- Manual reset is available via the "Reset All Models" button

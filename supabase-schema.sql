-- Create models table to store trading model states
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  description TEXT,
  balance DECIMAL(10, 2) DEFAULT 100.00,
  total_pnl DECIMAL(10, 2) DEFAULT 0.00,
  daily_return DECIMAL(10, 2) DEFAULT 0.00,
  total_trades INTEGER DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table to store all trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL REFERENCES models(model_id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  direction TEXT NOT NULL CHECK (direction IN ('UP', 'DOWN')),
  price DECIMAL(10, 4) NOT NULL,
  quantity INTEGER NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create positions table to store open positions
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL REFERENCES models(model_id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('UP', 'DOWN')),
  quantity INTEGER NOT NULL,
  average_price DECIMAL(10, 4) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, direction)
);

-- Create performance_history table to track daily performance
CREATE TABLE IF NOT EXISTS performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL REFERENCES models(model_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  starting_balance DECIMAL(10, 2) NOT NULL,
  ending_balance DECIMAL(10, 2) NOT NULL,
  daily_return DECIMAL(10, 2) NOT NULL,
  total_trades INTEGER DEFAULT 0,
  total_pnl DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_model_id ON trades(model_id);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_positions_model_id ON positions(model_id);
CREATE INDEX IF NOT EXISTS idx_performance_model_date ON performance_history(model_id, date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on models" ON models
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on trades" ON trades
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on positions" ON positions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on performance_history" ON performance_history
  FOR ALL USING (true) WITH CHECK (true);

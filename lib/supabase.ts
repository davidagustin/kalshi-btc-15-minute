import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://epxrqaxdvcbtjxguzlnr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_2Goh-5Qq10XyYvT6ETcxGQ_01FLO9f-';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface DbModel {
  id: string;
  model_id: string;
  model_name: string;
  description: string;
  balance: number;
  total_pnl: number;
  daily_return: number;
  total_trades: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface DbTrade {
  id: string;
  model_id: string;
  timestamp: string;
  direction: 'UP' | 'DOWN';
  price: number;
  quantity: number;
  cost: number;
  created_at: string;
}

export interface DbPosition {
  id: string;
  model_id: string;
  direction: 'UP' | 'DOWN';
  quantity: number;
  average_price: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

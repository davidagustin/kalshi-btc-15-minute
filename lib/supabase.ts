import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://epxrqaxdvcbtjxguzlnr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVweHJxYXhkdmNidGp4Z3V6bG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjAyMzksImV4cCI6MjA4MzIzNjIzOX0.XGk3JCG-oeL6hqhsKVwQX5N3wzyj2bZEXdpQku8-L8o';

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

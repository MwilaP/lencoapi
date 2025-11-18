import { createClient } from '@supabase/supabase-js';
import { config } from './index';

// Create Supabase client with service role key for admin operations
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database types based on the schema
export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  payment_type: 'subscription' | 'contact_unlock';
  payment_method: 'mobile_money' | 'card';
  status: 'pending' | 'completed' | 'failed';
  provider_id?: string;
  transaction_reference: string;
  created_at: string;
  completed_at?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  active: boolean;
  plan: string;
  amount: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactUnlock {
  id: string;
  client_id: string;
  provider_id: string;
  amount: number;
  unlocked_at: string;
}

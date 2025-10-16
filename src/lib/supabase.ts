import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProjectData {
  id?: string;
  name: string;
  full_text: string;
  characters: any[];
  events: any[];
  locations: any[];
  terms: any[];
  total_chunks: number;
  created_at?: string;
  updated_at?: string;
}

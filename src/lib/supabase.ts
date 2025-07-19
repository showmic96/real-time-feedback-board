import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GuestbookEntry {
  id: string;
  message: string;
  author_name?: string;
  author_avatar?: string;
  is_anonymous: boolean;
  ip_address?: string;
  user_id?: string;
  created_at: string;
}

export interface RateLimit {
  id: string;
  ip_address: string;
  count: number;
  window_start: string;
}

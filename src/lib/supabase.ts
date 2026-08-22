import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('متغيرات البيئة لـ Supabase غير مضبوطة. تأكد من وجود VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1`;

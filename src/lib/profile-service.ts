import { supabase } from './supabase';
import type { Profile, AppSettings, Notification } from './types';

export async function fetchAllCustomers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfile(id: string, patch: { full_name?: string; phone?: string }): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  return { error: error ? error.message : null };
}

export async function fetchSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return (data as AppSettings) ?? null;
}

export async function updateSettings(patch: Partial<Pick<AppSettings, 'default_fare' | 'subscription_duration_days'>>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1);
  return { error: error ? error.message : null };
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function isAdminBootstrapNeeded(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin_bootstrap_needed');
  if (error) return false;
  return Boolean(data);
}

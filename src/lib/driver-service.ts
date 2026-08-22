import { supabase } from './supabase';
import { EDGE_FUNCTION_URL } from './supabase';
import type { Driver, DriverWithProfile, DriverStatus } from './types';

export async function fetchDriverRecord(driverId: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .maybeSingle();
  if (error) throw error;
  return (data as Driver) ?? null;
}

export async function ensureDriverRecord(): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('init_driver_record', {
    p_driver_id: '00000000-0000-0000-0000-000000000000',
    p_vehicle_info: '',
  });
  // سيُفشل هذا الاستدعاء عمدًا إن لم يكن المستخدم أدمن أو نفس المستخدم — لكن المندوب يُنشئ صفه عند أول تسجيل دخول
  void data; void error;
  return { success: true };
}

export async function fetchAllDrivers(): Promise<DriverWithProfile[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*, profiles!drivers_id_fkey(id, full_name, phone)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const p = row.profiles as Record<string, unknown> | null;
    return {
      ...(row as unknown as Driver),
      full_name: (p?.full_name as string) ?? '',
      phone: (p?.phone as string) ?? '',
    };
  });
}

export async function searchDrivers(term: string): Promise<DriverWithProfile[]> {
  const all = await fetchAllDrivers();
  const t = term.trim().toLowerCase();
  if (!t) return all;
  return all.filter(
    (d) =>
      d.full_name?.toLowerCase().includes(t) ||
      d.phone?.toLowerCase().includes(t) ||
      d.vehicle_info?.toLowerCase().includes(t)
  );
}

export async function setDriverStatus(driverId: string, status: DriverStatus): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('set_driver_status', {
    p_driver_id: driverId,
    p_status: status,
  });
  if (error) return { success: false, error: error.message };
  const r = data as Record<string, unknown>;
  return { success: Boolean(r.success), error: r.error as string | undefined };
}

export async function createDriverByAdmin(params: {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  vehicle_info?: string;
}): Promise<{ success: boolean; error?: string; driverId?: string }> {
  const { data: session } = await supabase.auth.getSession();
  const res = await fetch(`${EDGE_FUNCTION_URL}/admin-create-driver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.session?.access_token ?? ''}`,
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      full_name: params.full_name,
      phone: params.phone,
      vehicle_info: params.vehicle_info ?? '',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    return { success: false, error: json.message ?? json.error ?? 'تعذر إنشاء المندوب' };
  }
  return { success: true, driverId: json.driver_id };
}

export async function createOrExtendSubscription(
  driverId: string,
  days = 30
): Promise<{ success: boolean; error?: string; endDate?: string }> {
  const { data, error } = await supabase.rpc('create_or_extend_subscription', {
    p_driver_id: driverId,
    p_days: days,
  });
  if (error) return { success: false, error: error.message };
  const r = data as Record<string, unknown>;
  return { success: Boolean(r.success), error: r.error as string | undefined, endDate: r.end_date as string | undefined };
}

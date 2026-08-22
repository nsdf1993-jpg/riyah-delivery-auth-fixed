import { supabase } from './supabase';
import type { Order, OrderStatus, Cancellation } from './types';

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    number: row.number as number,
    customer_id: row.customer_id as string,
    driver_id: row.driver_id as string | null,
    status: row.status as OrderStatus,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    details: row.details as string,
    address: row.address as string,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    fare: Number(row.fare ?? 0),
    created_at: row.created_at as string,
    accepted_at: row.accepted_at as string | null,
    completed_at: row.completed_at as string | null,
    cancelled_at: row.cancelled_at as string | null,
    cancel_reason: row.cancel_reason as string | null,
    driver: row.driver as Order['driver'],
    customer: row.customer as Order['customer'],
  };
}

export async function createOrder(params: {
  details: string;
  address: string;
  customer_phone: string;
  customer_name: string;
  latitude?: number | null;
  longitude?: number | null;
  fare?: number | null;
}): Promise<{ success: boolean; orderNumber?: number; orderId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('create_order', {
    p_details: params.details,
    p_address: params.address,
    p_customer_phone: params.customer_phone,
    p_customer_name: params.customer_name,
    p_latitude: params.latitude ?? null,
    p_longitude: params.longitude ?? null,
    p_fare: params.fare ?? null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as Record<string, unknown>;
  if (!r.success) return { success: false, error: (r.message as string) ?? 'فشل إنشاء الطلب' };
  return { success: true, orderId: r.order_id as string, orderNumber: r.order_number as number };
}

export async function claimOrder(orderId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  const { data, error } = await supabase.rpc('claim_order', { p_order_id: orderId });
  if (error) return { success: false, error: error.message };
  const r = data as Record<string, unknown>;
  return { success: Boolean(r.success), error: r.error as string | undefined, message: r.message as string | undefined };
}

export async function advanceOrder(
  orderId: string,
  newStatus: OrderStatus,
  cancelReason?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const { data, error } = await supabase.rpc('advance_order', {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_cancel_reason: cancelReason ?? null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as Record<string, unknown>;
  return { success: Boolean(r.success), error: r.error as string | undefined, message: r.message as string | undefined };
}

export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, driver:profiles!orders_driver_id_fkey(id, full_name, phone)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapOrder(r as unknown as Record<string, unknown>));
}

export async function fetchDriverOrders(driverId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(id, full_name, phone)')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapOrder(r as unknown as Record<string, unknown>));
}

export async function fetchNewOrdersForDriver(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(id, full_name, phone)')
    .eq('status', 'new')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapOrder(r as unknown as Record<string, unknown>));
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, driver:profiles!orders_driver_id_fkey(id, full_name, phone), customer:profiles!orders_customer_id_fkey(id, full_name, phone)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapOrder(data as unknown as Record<string, unknown>);
}

export async function fetchActiveOrderForCustomer(customerId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, driver:profiles!orders_driver_id_fkey(id, full_name, phone)')
    .eq('customer_id', customerId)
    .in('status', ['new', 'taken', 'confirmed', 'on_the_way'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapOrder(data as unknown as Record<string, unknown>);
}

export async function fetchActiveOrderForDriver(driverId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(id, full_name, phone)')
    .eq('driver_id', driverId)
    .in('status', ['taken', 'confirmed', 'on_the_way'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapOrder(data as unknown as Record<string, unknown>);
}

export async function fetchAllOrders(filterStatus?: OrderStatus): Promise<Order[]> {
  let q = supabase
    .from('orders')
    .select('*, driver:profiles!orders_driver_id_fkey(id, full_name, phone), customer:profiles!orders_customer_id_fkey(id, full_name, phone)')
    .order('created_at', { ascending: false });
  if (filterStatus) q = q.eq('status', filterStatus);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => mapOrder(r as unknown as Record<string, unknown>));
}

export async function searchOrders(term: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, driver:profiles!orders_driver_id_fkey(id, full_name, phone), customer:profiles!orders_customer_id_fkey(id, full_name, phone)')
    .or(`number.eq.${Number(term) || -1},customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,address.ilike.%${term}%`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => mapOrder(r as unknown as Record<string, unknown>));
}

export async function fetchCancellationsForOrder(orderId: string): Promise<Cancellation[]> {
  const { data, error } = await supabase
    .from('cancellations')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Cancellation[];
}

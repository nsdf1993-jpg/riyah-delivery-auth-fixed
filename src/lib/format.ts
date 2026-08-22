import { supabase } from './supabase';

const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => arDigits[Number(d)]);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return toArabicDigits(d.toLocaleString('ar-IQ', opts));
  } catch {
    return toArabicDigits(d.toLocaleString('en-GB', opts));
  }
}

export function formatDateOnly(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  try {
    return toArabicDigits(d.toLocaleDateString('ar-IQ', { year: 'numeric', month: '2-digit', day: '2-digit' }));
  } catch {
    return toArabicDigits(d.toLocaleDateString('en-GB'));
  }
}

export function formatTimeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `قبل ${toArabicDigits(min)} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${toArabicDigits(hr)} ساعة`;
  const day = Math.floor(hr / 24);
  return `قبل ${toArabicDigits(day)} يوم`;
}

export function formatCurrency(value: number): string {
  return `${toArabicDigits(value.toLocaleString('en-US'))} د.ع`;
}

export function isSubscriptionActive(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate).getTime() > Date.now();
}

export function daysUntil(endDate: string | null): number {
  if (!endDate) return 0;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function getDriverEffectiveStatus(
  driverStatus: 'available' | 'busy' | 'suspended',
  subEnd: string | null
): 'available' | 'busy' | 'suspended' | 'expired' {
  if (!isSubscriptionActive(subEnd)) return 'expired';
  return driverStatus;
}

export async function getCustomerUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

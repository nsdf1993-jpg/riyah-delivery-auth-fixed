export type UserRole = 'customer' | 'driver' | 'admin';

export type OrderStatus =
  | 'new'
  | 'taken'
  | 'confirmed'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type DriverStatus = 'available' | 'busy' | 'suspended';

export type SubscriptionStatus = 'active' | 'expired';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface Driver {
  id: string;
  status: DriverStatus;
  subscription_start: string | null;
  subscription_end: string | null;
  vehicle_info: string;
  created_at: string;
  updated_at: string;
}

export interface DriverWithProfile extends Driver {
  profiles?: Profile;
  full_name?: string;
  phone?: string;
  email?: string;
}

export interface Order {
  id: string;
  number: number;
  customer_id: string;
  driver_id: string | null;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  details: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  fare: number;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  // joins
  driver?: Profile | null;
  customer?: Profile | null;
}

export interface Subscription {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  created_at: string;
}

export interface Cancellation {
  id: string;
  order_id: string;
  cancelled_by: 'customer' | 'driver' | 'admin';
  reason: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface AppSettings {
  id: number;
  default_fare: number;
  subscription_duration_days: number;
  updated_at: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  taken: 'مأخوذ',
  confirmed: 'مؤكد',
  on_the_way: 'بالطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  taken: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-100 text-sky-700 border-sky-200',
  on_the_way: 'bg-violet-100 text-violet-700 border-violet-200',
  delivered: 'bg-success-100 text-success-700 border-success-200',
  cancelled: 'bg-danger-100 text-danger-700 border-danger-200',
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available: 'متاح',
  busy: 'مشغول',
  suspended: 'موقوف',
};

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  available: 'bg-success-100 text-success-700 border-success-200',
  busy: 'bg-amber-100 text-amber-700 border-amber-200',
  suspended: 'bg-danger-100 text-danger-700 border-danger-200',
};

export const CANCEL_REASONS = [
  'الزبون لم يوافق على أجرة التوصيل',
  'لم يتمكن من الوصول إلى العنوان',
  'الزبون لم يرد على الاتصال',
  'تفاصيل الطلب غير واضحة',
  'تعذر إتمام التوصيل لظروف خارجية',
  'طلب مكرر',
  'سبب آخر',
];

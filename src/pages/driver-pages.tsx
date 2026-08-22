import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Phone, Clock, CheckCircle2, X, Truck, Loader2,
  Navigation, AlertCircle, Hand, XCircle,
} from 'lucide-react';
import { DriverLayout } from '@/components/driver-layout';
import { Card, Button, StatusBadge, EmptyState, Loading, Textarea } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/auth-context';
import { OrderInfoRow } from '@/components/brand';
import {
  claimOrder, advanceOrder, fetchNewOrdersForDriver,
  fetchActiveOrderForDriver, fetchDriverOrders, fetchOrderById,
} from '@/lib/order-service';
import { fetchDriverRecord, ensureDriverRecord } from '@/lib/driver-service';
import type { Order, Driver, OrderStatus } from '@/lib/types';
import { CANCEL_REASONS } from '@/lib/types';
import {
  formatDate, formatTimeAgo, formatCurrency, toArabicDigits,
  getDriverEffectiveStatus, isSubscriptionActive, formatDateOnly, daysUntil,
} from '@/lib/format';

export function DriverHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      let d = await fetchDriverRecord(profile.id);
      if (!d) {
        await ensureDriverRecord();
        d = await fetchDriverRecord(profile.id);
      }
      setDriver(d);
      if (d) {
        const eff = getDriverEffectiveStatus(d.status, d.subscription_end);
        if (eff === 'available') {
          const orders = await fetchNewOrdersForDriver();
          setNewOrders(orders);
        }
        const act = await fetchActiveOrderForDriver(profile.id);
        setActive(act);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleClaim(orderId: string) {
    setClaiming(orderId);
    const res = await claimOrder(orderId);
    setClaiming(null);
    if (res.success) {
      navigate(`/driver/order/${orderId}`);
    } else {
      // reload to reflect taken orders disappearing
      load();
    }
  }

  if (loading) return <DriverLayout driver={null}><Loading /></DriverLayout>;

  const effective = driver ? getDriverEffectiveStatus(driver.status, driver.subscription_end) : 'expired';
  const subActive = isSubscriptionActive(driver?.subscription_end ?? null);

  return (
    <DriverLayout driver={driver}>
      {/* Status banner */}
      {effective === 'suspended' && (
        <Card className="mb-4 border-danger-200 bg-danger-50">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-danger-600" />
            <p className="text-sm font-bold text-danger-700">حسابك موقوف — لا يمكنك أخذ طلبات جديدة</p>
          </div>
        </Card>
      )}
      {effective === 'expired' && (
        <Card className="mb-4 border-danger-200 bg-danger-50">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-danger-600" />
            <div>
              <p className="text-sm font-bold text-danger-700">اشتراكك منتهٍ</p>
              <p className="text-xs text-danger-600">تواصل مع الإدارة لتجديد الاشتراك</p>
            </div>
          </div>
        </Card>
      )}
      {effective === 'busy' && active && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck size={22} className="text-amber-600" />
              <p className="text-sm font-bold text-amber-700">لديك طلب جارٍ</p>
            </div>
            <Button size="sm" onClick={() => navigate(`/driver/order/${active.id}`)}>عرض</Button>
          </div>
        </Card>
      )}

      {/* Active order summary */}
      {active && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-extrabold text-ink-800 font-display">الطلب الحالي</h2>
          <ActiveOrderCard order={active} onClick={() => navigate(`/driver/order/${active.id}`)} />
        </div>
      )}

      {/* New orders */}
      {effective === 'available' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-800 font-display">
              <span className="live-dot h-2 w-2 rounded-full bg-success-500" />
              الطلبات الجديدة
            </h2>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              {toArabicDigits(newOrders.length)}
            </span>
          </div>
          {newOrders.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Package size={28} />}
                title="لا توجد طلبات جديدة"
                subtitle="ستظهر الطلبات الجديدة هنا فور وصولها"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {newOrders.map((o) => (
                <NewOrderCard
                  key={o.id}
                  order={o}
                  claiming={claiming === o.id}
                  onClaim={() => handleClaim(o.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </DriverLayout>
  );
}

function NewOrderCard({ order, claiming, onClaim }: { order: Order; claiming: boolean; onClaim: () => void }) {
  return (
    <Card className="card-hover animate-fade-in">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-900">#{toArabicDigits(order.number)}</span>
        <span className="text-xs font-medium text-ink-400">{formatTimeAgo(order.created_at)}</span>
      </div>
      <p className="mb-2 text-sm text-ink-700">{order.details}</p>
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-ink-600">
          <MapPin size={14} className="text-brand-600" />
          <span className="line-clamp-1">{order.address}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-600">
          <Phone size={14} className="text-brand-600" />
          <span>{order.customer_phone}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-brand-700">{formatCurrency(order.fare)}</span>
        <Button size="sm" loading={claiming} onClick={onClaim}>
          <Hand size={16} />
          أخذ الطلب
        </Button>
      </div>
    </Card>
  );
}

function ActiveOrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card-hover w-full rounded-2xl border-2 border-brand-200 bg-white p-4 text-right shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-900">#{toArabicDigits(order.number)}</span>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-1 line-clamp-1 text-sm text-ink-700">{order.details}</p>
      <div className="flex items-center gap-1 text-xs text-ink-500">
        <MapPin size={14} />
        <span className="line-clamp-1">{order.address}</span>
      </div>
    </button>
  );
}

export function DriverOrderDetailPage({ orderId }: { orderId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  async function load() {
    const o = await fetchOrderById(orderId);
    setOrder(o);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleAdvance(newStatus: OrderStatus) {
    setActing(true);
    const res = await advanceOrder(orderId, newStatus);
    setActing(false);
    if (!res.success) {
      toast.show(res.error ?? res.message ?? 'فشل التحديث', 'error');
      return;
    }
    toast.show(res.message ?? 'تم التحديث', 'success');
    load();
  }

  async function handleCancel() {
    setActing(true);
    const res = await advanceOrder(orderId, 'cancelled', cancelReason);
    setActing(false);
    if (!res.success) {
      toast.show(res.error ?? res.message ?? 'فشل الإلغاء', 'error');
      return;
    }
    toast.show('تم إلغاء الطلب', 'success');
    setShowCancelModal(false);
    navigate('/driver');
  }

  if (loading) return <DriverLayout driver={null}><Loading /></DriverLayout>;
  if (!order) {
    return (
      <DriverLayout driver={null}>
        <EmptyState icon={<Package size={28} />} title="الطلب غير موجود" />
        <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/driver')}>العودة</Button>
      </DriverLayout>
    );
  }

  const isDriverOrder = order.driver_id === profile?.id;
  const canAct = isDriverOrder && ['taken', 'confirmed', 'on_the_way'].includes(order.status);

  return (
    <DriverLayout driver={null}>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="rounded-lg p-2 text-ink-600 hover:bg-ink-100">
          <Navigation size={20} className="rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-ink-900 font-display">طلب #{toArabicDigits(order.number)}</h1>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Status tracker */}
      {order.status !== 'cancelled' && (
        <Card className="mb-4">
          <DriverStatusTracker current={order.status} />
        </Card>
      )}

      {order.status === 'cancelled' && (
        <Card className="mb-4 border-danger-200 bg-danger-50">
          <div className="flex items-center gap-3">
            <XCircle size={22} className="text-danger-600" />
            <div>
              <p className="text-sm font-bold text-danger-700">تم إلغاء الطلب</p>
              {order.cancel_reason && <p className="text-xs text-danger-600">السبب: {order.cancel_reason}</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Customer info */}
      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-extrabold text-ink-800 font-display">معلومات الزبون</h2>
        <OrderInfoRow icon={<Package size={16} />} label="الاسم" value={order.customer_name || 'زبون'} />
        <OrderInfoRow icon={<Phone size={16} />} label="الهاتف" value={order.customer_phone} />
        <a
          href={`tel:${order.customer_phone}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-50 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
        >
          <Phone size={18} />
          اتصال بالزبون
        </a>
      </Card>

      {/* Order details */}
      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-extrabold text-ink-800 font-display">تفاصيل الطلب</h2>
        <OrderInfoRow icon={<Package size={16} />} label="التفاصيل" value={order.details} />
        <OrderInfoRow icon={<MapPin size={16} />} label="العنوان" value={order.address} />
        <OrderInfoRow icon={<Clock size={16} />} label="وقت الطلب" value={formatDate(order.created_at)} />
        <OrderInfoRow icon={<Truck size={16} />} label="الأجرة" value={formatCurrency(order.fare)} />
        {order.latitude != null && order.longitude != null && (
          <a
            href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
          >
            <Navigation size={18} />
            فتح الموقع في خرائط Google
          </a>
        )}
      </Card>

      {/* Action buttons */}
      {canAct && (
        <div className="space-y-3">
          {order.status === 'taken' && (
            <Button size="lg" className="w-full" loading={acting} onClick={() => handleAdvance('confirmed')}>
              <CheckCircle2 size={18} />
              تأكيد الطلب
            </Button>
          )}
          {order.status === 'confirmed' && (
            <Button size="lg" className="w-full" loading={acting} onClick={() => handleAdvance('on_the_way')}>
              <Truck size={18} />
              بدء التوصيل
            </Button>
          )}
          {order.status === 'on_the_way' && (
            <Button size="lg" variant="primary" className="w-full bg-success-600 hover:bg-success-700" loading={acting} onClick={() => handleAdvance('delivered')}>
              <CheckCircle2 size={18} />
              تم التوصيل
            </Button>
          )}
          <Button size="lg" variant="danger" className="w-full" onClick={() => setShowCancelModal(true)}>
            <X size={18} />
            إلغاء الطلب
          </Button>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/50 p-4" onClick={() => setShowCancelModal(false)}>
          <div className="w-full max-w-md animate-slide-up rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-extrabold text-ink-900 font-display">إلغاء الطلب</h3>
            <p className="mb-3 text-sm text-ink-600">يرجى تحديد سبب الإلغاء:</p>
            <div className="space-y-2">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 cursor-pointer hover:bg-ink-50">
                  <input
                    type="radio"
                    name="driverCancelReason"
                    checked={cancelReason === r}
                    onChange={() => setCancelReason(r)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm text-ink-700">{r}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>تراجع</Button>
              <Button variant="danger" className="flex-1" loading={acting} onClick={handleCancel}>تأكيد</Button>
            </div>
          </div>
        </div>
      )}
    </DriverLayout>
  );
}

function DriverStatusTracker({ current }: { current: OrderStatus }) {
  const steps: { key: OrderStatus; label: string }[] = [
    { key: 'taken', label: 'مأخوذ' },
    { key: 'confirmed', label: 'مؤكد' },
    { key: 'on_the_way', label: 'بالطريق' },
    { key: 'delivered', label: 'تم التوصيل' },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const done = i <= idx;
        const isCurrent = i === idx;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && <div className={`h-0.5 flex-1 ${i <= idx ? 'bg-brand-500' : 'bg-ink-200'}`} />}
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'} ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}>
                {done ? <CheckCircle2 size={16} /> : toArabicDigits(i + 1)}
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < idx ? 'bg-brand-500' : 'bg-ink-200'}`} />}
            </div>
            <span className={`mt-1.5 text-center text-[10px] font-bold ${done ? 'text-brand-700' : 'text-ink-400'}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DriverHistoryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    fetchDriverOrders(profile!.id)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <DriverLayout driver={null}>
      <h1 className="mb-4 text-xl font-extrabold text-ink-900 font-display">سجل الطلبات</h1>

      <div className="mb-4 flex gap-1 rounded-xl bg-ink-100 p-1">
        {([['all', 'الكل'], ['delivered', 'المكتملة'], ['cancelled', 'الملغاة']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${filter === k ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Package size={28} />} title="لا توجد طلبات" /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/driver/order/${o.id}`)}
              className="card-hover w-full rounded-2xl border border-ink-100 bg-white p-4 text-right shadow-card"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-extrabold text-ink-900">#{toArabicDigits(o.number)}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="mb-1 line-clamp-1 text-sm text-ink-700">{o.details}</p>
              <div className="flex items-center gap-1 text-xs text-ink-500">
                <MapPin size={14} />
                <span className="line-clamp-1">{o.address}</span>
              </div>
              <p className="mt-2 text-[11px] text-ink-400">{formatTimeAgo(o.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </DriverLayout>
  );
}

export function DriverProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) fetchDriverRecord(profile.id).then(setDriver).catch(console.error);
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    const { error } = await updateDriverProfile(profile!.id, { full_name: name, phone });
    setSaving(false);
    if (error) toast.show(error, 'error');
    else {
      toast.show('تم حفظ التغييرات', 'success');
      await refreshProfile();
    }
  }

  const effective = driver ? getDriverEffectiveStatus(driver.status, driver.subscription_end) : 'expired';

  return (
    <DriverLayout driver={driver}>
      <h1 className="mb-4 text-xl font-extrabold text-ink-900 font-display">حسابي</h1>

      <Card className="mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-700">
            {(name || 'م').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-ink-900">{name || 'مندوب'}</p>
            <p className="text-xs text-ink-500">حساب مندوب</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-extrabold text-ink-800 font-display">حالة الاشتراك</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
            <span className="text-xs font-medium text-ink-600">الحالة</span>
            <span className={`text-xs font-bold ${effective === 'available' ? 'text-success-600' : effective === 'expired' ? 'text-danger-600' : 'text-amber-600'}`}>
              {effective === 'expired' ? 'منتهٍ' : effective === 'available' ? 'فعال' : 'مشغول'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
            <span className="text-xs font-medium text-ink-600">تاريخ الانتهاء</span>
            <span className="text-xs font-bold text-ink-800">{formatDateOnly(driver?.subscription_end ?? null)}</span>
          </div>
          {isSubscriptionActive(driver?.subscription_end ?? null) && (
            <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
              <span className="text-xs font-medium text-ink-600">الأيام المتبقية</span>
              <span className="text-xs font-bold text-brand-700">{toArabicDigits(daysUntil(driver?.subscription_end ?? null))} يوم</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-extrabold text-ink-800 font-display">تعديل البيانات</h2>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-ink-700">الاسم</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-ink-700">رقم الهاتف</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <Button loading={saving} className="w-full" onClick={handleSave}>حفظ التغييرات</Button>
      </Card>
    </DriverLayout>
  );
}

import { supabase } from '@/lib/supabase';

async function updateDriverProfile(id: string, patch: { full_name: string; phone: string }): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  return { error: error ? error.message : null };
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Package, MapPin, Phone, Clock, X, Navigation, CheckCircle2, XCircle, Loader2, Truck } from 'lucide-react';
import { CustomerLayout } from '@/components/customer-layout';
import { Card, Button, Input, Textarea, StatusBadge, EmptyState, Loading } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useAuth } from '@/lib/auth-context';
import { OrderInfoRow } from '@/components/brand';
import {
  createOrder,
  fetchCustomerOrders,
  fetchActiveOrderForCustomer,
  fetchOrderById,
} from '@/lib/order-service';
import { fetchSettings, updateProfile } from '@/lib/profile-service';
import type { Order, AppSettings } from '@/lib/types';
import { ORDER_STATUS_LABELS, CANCEL_REASONS } from '@/lib/types';
import { formatDate, formatTimeAgo, formatCurrency, toArabicDigits } from '@/lib/format';
import { advanceOrder } from '@/lib/order-service';

export function CustomerHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<Order | null>(null);
  const [recent, setRecent] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [act, orders] = await Promise.all([
          fetchActiveOrderForCustomer(profile!.id),
          fetchCustomerOrders(profile!.id),
        ]);
        setActive(act);
        setRecent(orders.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  if (loading) return <CustomerLayout><Loading /></CustomerLayout>;

  return (
    <CustomerLayout>
      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/customer/new-order')}
          className="card-hover flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg shadow-brand-700/20"
        >
          <PlusCircle size={28} />
          <span className="text-sm font-bold">طلب جديد</span>
        </button>
        <button
          onClick={() => navigate('/customer/history')}
          className="card-hover flex flex-col items-center gap-2 rounded-2xl border border-ink-200 bg-white p-5 text-ink-700 shadow-card"
        >
          <Clock size={28} />
          <span className="text-sm font-bold">طلباتي السابقة</span>
        </button>
      </div>

      {/* Active order */}
      {active && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-ink-800 font-display">
            <span className="live-dot h-2 w-2 rounded-full bg-brand-500" />
            الطلب الحالي
          </h2>
          <OrderCard order={active} onClick={() => navigate(`/customer/track/${active.id}`)} />
        </div>
      )}

      {/* Recent orders */}
      <div>
        <h2 className="mb-3 text-base font-extrabold text-ink-800 font-display">آخر الطلبات</h2>
        {recent.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Package size={28} />}
              title="لا توجد طلبات بعد"
              subtitle="ابدأ بإنشاء طلبك الأول"
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {recent.map((o) => (
              <OrderCard key={o.id} order={o} onClick={() => navigate(`/customer/track/${o.id}`)} />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card-hover w-full rounded-2xl border border-ink-100 bg-white p-4 text-right shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-900">#{toArabicDigits(order.number)}</span>
        <StatusBadge status={order.status} />
      </div>
      <p className="mb-1 line-clamp-1 text-sm text-ink-700">{order.details}</p>
      <div className="flex items-center gap-1 text-xs text-ink-500">
        <MapPin size={14} />
        <span className="line-clamp-1">{order.address}</span>
      </div>
      <p className="mt-2 text-[11px] text-ink-400">{formatTimeAgo(order.created_at)}</p>
    </button>
  );
}

export function NewOrderPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [name, setName] = useState(profile?.full_name ?? '');
  const [details, setDetails] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
  }, []);

  function getLocation() {
    if (!navigator.geolocation) {
      toast.show('المتصفح لا يدعم تحديد الموقع', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.show('تم تحديد موقعك', 'success');
      },
      () => {
        setLocating(false);
        toast.show('تعذر تحديد الموقع، تأكد من السماح بالوصول', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details || !address || !phone) {
      toast.show('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    setSubmitting(true);
    const res = await createOrder({
      details,
      address,
      customer_phone: phone,
      customer_name: name,
      latitude: lat,
      longitude: lng,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.show(res.error ?? 'فشل إنشاء الطلب', 'error');
      return;
    }
    toast.show(`تم إنشاء الطلب رقم ${toArabicDigits(res.orderNumber!)}`, 'success');
    navigate(`/customer/track/${res.orderId}`);
  }

  return (
    <CustomerLayout>
      <h1 className="mb-4 text-xl font-extrabold text-ink-900 font-display">طلب توصيل جديد</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4">
          <Input label="الاسم" value={name} onChange={setName} placeholder="اسمك" />
          <Input label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="07XX XXX XXXX" type="tel" required />
          <Textarea label="تفاصيل الطلب" value={details} onChange={setDetails} placeholder="ماذا تريد أن نوصل لك؟" required rows={3} />
          <Textarea label="العنوان" value={address} onChange={setAddress} placeholder="العنوان بالتفصيل: المنطقة، الشارع، أقرب نقطة دالة" required rows={2} />

          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink-700">الموقع على الخريطة</label>
            <button
              type="button"
              onClick={getLocation}
              disabled={locating}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-4 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
            >
              {locating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
              {lat !== null && lng !== null ? `تم تحديد الموقع (${toArabicDigits(lat.toFixed(4))}, ${toArabicDigits(lng.toFixed(4))})` : 'تحديد موقعي الحالي'}
            </button>
            <p className="mt-1.5 text-[11px] text-ink-400">
              ملاحظة: لتفعيل عرض الخريطة وتتبع المندوب مباشرة، أضف مفتاح Google Maps API (راجع README).
            </p>
          </div>

          {settings && (
            <div className="rounded-xl bg-ink-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-600">أجرة التوصيل الافتراضية</span>
                <span className="text-sm font-extrabold text-brand-700">{formatCurrency(settings.default_fare)}</span>
              </div>
            </div>
          )}
        </Card>

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          إرسال الطلب
        </Button>
      </form>
    </CustomerLayout>
  );
}

export function TrackOrderPage({ orderId }: { orderId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  async function load() {
    const o = await fetchOrderById(orderId);
    setOrder(o);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Poll every 5s for live updates (lightweight alternative to realtime subscription)
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleCancel() {
    setCancelling(true);
    const res = await advanceOrder(orderId, 'cancelled', cancelReason);
    setCancelling(false);
    if (!res.success) {
      toast.show(res.error ?? res.message ?? 'فشل الإلغاء', 'error');
      return;
    }
    toast.show('تم إلغاء الطلب', 'success');
    setShowCancelModal(false);
    load();
  }

  if (loading) return <CustomerLayout><Loading /></CustomerLayout>;
  if (!order) {
    return (
      <CustomerLayout>
        <EmptyState icon={<Package size={28} />} title="الطلب غير موجود" />
        <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/customer')}>العودة</Button>
      </CustomerLayout>
    );
  }

  const isActive = ['new', 'taken', 'confirmed', 'on_the_way'].includes(order.status);
  const statusSteps: { key: typeof order.status; label: string }[] = [
    { key: 'new', label: 'تم الإنشاء' },
    { key: 'taken', label: 'تم الأخذ' },
    { key: 'confirmed', label: 'تأكيد الطلب' },
    { key: 'on_the_way', label: 'بالطريق' },
    { key: 'delivered', label: 'تم التوصيل' },
  ];
  const currentStepIdx = order.status === 'cancelled' ? -1 : statusSteps.findIndex((s) => s.key === order.status);

  return (
    <CustomerLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink-900 font-display">طلب #{toArabicDigits(order.number)}</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Status tracker */}
      {order.status !== 'cancelled' ? (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => {
              const done = i <= currentStepIdx;
              const current = i === currentStepIdx;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {i > 0 && <div className={`h-0.5 flex-1 ${i <= currentStepIdx ? 'bg-brand-500' : 'bg-ink-200'}`} />}
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                        done ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'
                      } ${current ? 'ring-4 ring-brand-100' : ''}`}
                    >
                      {done ? <CheckCircle2 size={16} /> : toArabicDigits(i + 1)}
                    </div>
                    {i < statusSteps.length - 1 && <div className={`h-0.5 flex-1 ${i < currentStepIdx ? 'bg-brand-500' : 'bg-ink-200'}`} />}
                  </div>
                  <span className={`mt-1.5 text-center text-[10px] font-bold ${done ? 'text-brand-700' : 'text-ink-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
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

      {/* Order details */}
      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-extrabold text-ink-800 font-display">تفاصيل الطلب</h2>
        <OrderInfoRow icon={<Package size={16} />} label="التفاصيل" value={order.details} />
        <OrderInfoRow icon={<MapPin size={16} />} label="العنوان" value={order.address} />
        <OrderInfoRow icon={<Phone size={16} />} label="الهاتف" value={order.customer_phone} />
        <OrderInfoRow icon={<Clock size={16} />} label="وقت الطلب" value={formatDate(order.created_at)} />
        <OrderInfoRow icon={<Truck size={16} />} label="الأجرة" value={formatCurrency(order.fare)} />
      </Card>

      {/* Driver info */}
      {order.driver_id && order.driver && (
        <Card className="mb-4">
          <h2 className="mb-3 text-sm font-extrabold text-ink-800 font-display">المندوب</h2>
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink-800">{order.driver.full_name || 'مندوب'}</p>
              <p className="text-xs text-ink-500">{order.driver.phone}</p>
            </div>
            <a
              href={`tel:${order.driver.phone}`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700"
            >
              <Phone size={20} />
            </a>
          </div>
        </Card>
      )}

      {order.status === 'new' && (
        <Card className="mb-4 border-brand-200 bg-brand-50/50">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-700">
            <Loader2 size={16} className="animate-spin" />
            جارٍ البحث عن مندوب متاح لاستلام طلبك...
          </div>
        </Card>
      )}

      {/* Cancel */}
      {isActive && order.customer_id === profile?.id && (
        <Button variant="danger" className="w-full" onClick={() => setShowCancelModal(true)}>
          <X size={18} />
          إلغاء الطلب
        </Button>
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
                    name="cancelReason"
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
              <Button variant="danger" className="flex-1" loading={cancelling} onClick={handleCancel}>تأكيد الإلغاء</Button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}

export function CustomerHistoryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchCustomerOrders(profile!.id)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['new', 'taken', 'confirmed', 'on_the_way'].includes(o.status);
    if (filter === 'completed') return o.status === 'delivered';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'active', label: 'الجارية' },
    { key: 'completed', label: 'المكتملة' },
    { key: 'cancelled', label: 'الملغاة' },
  ];

  return (
    <CustomerLayout>
      <h1 className="mb-4 text-xl font-extrabold text-ink-900 font-display">طلباتي</h1>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filter === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Package size={28} />} title="لا توجد طلبات" subtitle="ستظهر طلباتك هنا" />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onClick={() => navigate(`/customer/track/${o.id}`)} />
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}

export function CustomerProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await updateProfile(profile!.id, { full_name: name, phone });
    setSaving(false);
    if (error) toast.show(error, 'error');
    else {
      toast.show('تم حفظ التغييرات', 'success');
      await refreshProfile();
    }
  }

  return (
    <CustomerLayout>
      <h1 className="mb-4 text-xl font-extrabold text-ink-900 font-display">حسابي</h1>
      <Card className="space-y-4">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-700">
            {(name || 'ز').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-ink-900">{name || 'زبون'}</p>
            <p className="text-xs text-ink-500">حساب زبون</p>
          </div>
        </div>
        <Input label="الاسم" value={name} onChange={setName} />
        <Input label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" />
        <Button loading={saving} className="w-full" onClick={handleSave}>حفظ التغييرات</Button>
      </Card>
    </CustomerLayout>
  );
}



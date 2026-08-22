import { useEffect, useState, useCallback } from 'react';
import {
  Package, Users, UserCog, TrendingUp, Clock, CheckCircle2, XCircle,
  Truck, AlertCircle, Plus, Search, Ban, Check, CalendarPlus, Phone, MapPin, X,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, Button, Input, StatusBadge, DriverStatusBadge, EmptyState, Loading, Select } from '@/components/ui';
import { useToast } from '@/components/toast';
import {
  fetchAllOrders, searchOrders, fetchCancellationsForOrder, advanceOrder,
} from '@/lib/order-service';
import {
  fetchAllDrivers, searchDrivers, setDriverStatus, createDriverByAdmin,
  createOrExtendSubscription,
} from '@/lib/driver-service';
import { fetchAllCustomers, fetchSettings, updateSettings } from '@/lib/profile-service';
import type { Order, DriverWithProfile, Profile, OrderStatus, AppSettings } from '@/lib/types';
import { ORDER_STATUS_LABELS, DRIVER_STATUS_LABELS } from '@/lib/types';
import {
  formatDate, formatTimeAgo, formatCurrency, toArabicDigits,
  getDriverEffectiveStatus, isSubscriptionActive, formatDateOnly,
} from '@/lib/format';

export function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, d, c] = await Promise.all([
          fetchAllOrders(),
          fetchAllDrivers(),
          fetchAllCustomers(),
        ]);
        setOrders(o);
        setDrivers(d);
        setCustomers(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <AdminLayout><Loading /></AdminLayout>;

  const stats = {
    total: orders.length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    active: orders.filter((o) => ['taken', 'confirmed', 'on_the_way'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
    available: drivers.filter((d) => getDriverEffectiveStatus(d.status, d.subscription_end) === 'available').length,
    busy: drivers.filter((d) => getDriverEffectiveStatus(d.status, d.subscription_end) === 'busy').length,
    suspended: drivers.filter((d) => d.status === 'suspended').length,
    expired: drivers.filter((d) => !isSubscriptionActive(d.subscription_end)).length,
  };

  const statCards = [
    { label: 'إجمالي الطلبات', value: stats.total, icon: Package, color: 'brand' },
    { label: 'طلبات جديدة', value: stats.newOrders, icon: Clock, color: 'blue' },
    { label: 'طلبات جارية', value: stats.active, icon: Truck, color: 'amber' },
    { label: 'طلبات مكتملة', value: stats.delivered, icon: CheckCircle2, color: 'green' },
    { label: 'طلبات ملغاة', value: stats.cancelled, icon: XCircle, color: 'red' },
    { label: 'إجمالي الزبائن', value: customers.length, icon: Users, color: 'ink' },
  ];

  const driverCards = [
    { label: 'متاح', value: stats.available, color: 'text-success-600 bg-success-50' },
    { label: 'مشغول', value: stats.busy, color: 'text-amber-600 bg-amber-50' },
    { label: 'موقوف', value: stats.suspended, color: 'text-danger-600 bg-danger-50' },
    { label: 'اشتراك منتهٍ', value: stats.expired, color: 'text-danger-600 bg-danger-50' },
  ];

  const recentOrders = orders.slice(0, 8);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900 font-display">لوحة المعلومات</h1>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="card-hover">
            <div className="mb-2 flex items-center justify-between">
              <s.icon size={20} className="text-ink-400" />
              <TrendingUp size={14} className="text-ink-300" />
            </div>
            <p className="text-2xl font-extrabold text-ink-900 font-display">{toArabicDigits(s.value)}</p>
            <p className="text-xs font-medium text-ink-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Driver status summary */}
      <Card className="mb-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-ink-800 font-display">
          <UserCog size={20} className="text-brand-600" />
          حالة المندوبين
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {driverCards.map((d) => (
            <div key={d.label} className={`rounded-xl px-4 py-3 ${d.color}`}>
              <p className="text-2xl font-extrabold font-display">{toArabicDigits(d.value)}</p>
              <p className="text-xs font-bold">{d.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent orders */}
      <Card>
        <h2 className="mb-4 text-base font-extrabold text-ink-800 font-display">أحدث الطلبات</h2>
        {recentOrders.length === 0 ? (
          <EmptyState icon={<Package size={28} />} title="لا توجد طلبات" />
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-ink-900">#{toArabicDigits(o.number)}</span>
                  <div className="hidden sm:block">
                    <p className="text-xs text-ink-600 line-clamp-1 max-w-[200px]">{o.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-ink-400 sm:inline">{formatTimeAgo(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}

export function AdminOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (search.trim()) {
        setOrders(await searchOrders(search.trim()));
      } else {
        setOrders(await fetchAllOrders(filter === 'all' ? undefined : filter));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const filterTabs: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'new', label: 'جديدة' },
    { key: 'taken', label: 'مأخوذة' },
    { key: 'confirmed', label: 'مؤكدة' },
    { key: 'on_the_way', label: 'بالطريق' },
    { key: 'delivered', label: 'مكتملة' },
    { key: 'cancelled', label: 'ملغاة' },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900 font-display">إدارة الطلبات</h1>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب، الاسم، الهاتف، العنوان..."
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); setSearch(''); }}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${filter === t.key && !search ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <Card><EmptyState icon={<Package size={28} />} title="لا توجد طلبات" /></Card>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              className="card-hover flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-right shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-ink-900">#{toArabicDigits(o.number)}</span>
                <div className="hidden sm:block">
                  <p className="text-xs text-ink-700 line-clamp-1 max-w-[180px]">{o.details}</p>
                  <p className="text-[11px] text-ink-400">{o.customer_name || o.customer_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-ink-400 md:inline">{formatTimeAgo(o.created_at)}</span>
                <StatusBadge status={o.status} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Order detail drawer */}
      {selected && (
        <OrderDetailDrawer order={selected} onClose={() => setSelected(null)} onRefresh={load} toast={toast} />
      )}
    </AdminLayout>
  );
}

function OrderDetailDrawer({ order, onClose, onRefresh, toast }: {
  order: Order; onClose: () => void; onRefresh: () => void; toast: ReturnType<typeof useToast>;
}) {
  const [cancellations, setCancellations] = useState<{ id: string; reason: string; cancelled_by: string; created_at: string }[]>([]);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetchCancellationsForOrder(order.id).then((c) => setCancellations(c as never)).catch(() => {});
  }, [order.id]);

  async function handleAdminCancel() {
    setActing(true);
    const res = await advanceOrder(order.id, 'cancelled', 'إلغاء إداري');
    setActing(false);
    if (!res.success) { toast.show(res.error ?? 'فشل', 'error'); return; }
    toast.show('تم إلغاء الطلب', 'success');
    onRefresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/50" onClick={onClose}>
      <div className="h-full w-full max-w-md animate-slide-up overflow-y-auto bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-900 font-display">طلب #{toArabicDigits(order.number)}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X size={20} /></button>
        </div>

        <StatusBadge status={order.status} />

        <div className="mt-4 space-y-3">
          <DetailRow label="الزبون" value={order.customer_name || '—'} />
          <DetailRow label="الهاتف" value={order.customer_phone} />
          <DetailRow label="التفاصيل" value={order.details} />
          <DetailRow label="العنوان" value={order.address} />
          <DetailRow label="الأجرة" value={formatCurrency(order.fare)} />
          <DetailRow label="وقت الطلب" value={formatDate(order.created_at)} />
          {order.driver && <DetailRow label="المندوب" value={`${order.driver.full_name} (${order.driver.phone})`} />}
          {order.accepted_at && <DetailRow label="وقت الأخذ" value={formatDate(order.accepted_at)} />}
          {order.completed_at && <DetailRow label="وقت التسليم" value={formatDate(order.completed_at)} />}
          {order.cancel_reason && <DetailRow label="سبب الإلغاء" value={order.cancel_reason} />}
        </div>

        {cancellations.length > 0 && (
          <div className="mt-4 rounded-xl bg-danger-50 p-3">
            <h3 className="mb-2 text-xs font-bold text-danger-700">سجل الإلغاءات</h3>
            {cancellations.map((c) => (
              <div key={c.id} className="border-b border-danger-100 py-1.5 last:border-0">
                <p className="text-xs text-danger-700">{c.reason}</p>
                <p className="text-[10px] text-danger-500">{c.cancelled_by} — {formatDate(c.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {!['delivered', 'cancelled'].includes(order.status) && (
          <Button variant="danger" className="mt-4 w-full" loading={acting} onClick={handleAdminCancel}>
            <Ban size={16} /> إلغاء الطلب (إداري)
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink-50 pb-2">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <span className="text-left text-sm font-bold text-ink-800">{value}</span>
    </div>
  );
}

export function AdminDriversPage() {
  const toast = useToast();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [filtered, setFiltered] = useState<DriverWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [extending, setExtending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchAllDrivers();
      setDrivers(d);
      setFiltered(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(drivers); return; }
    searchDrivers(search.trim()).then(setFiltered).catch(() => setFiltered(drivers));
  }, [search, drivers]);

  async function handleToggleSuspend(d: DriverWithProfile) {
    const newStatus = d.status === 'suspended' ? 'available' : 'suspended';
    const res = await setDriverStatus(d.id, newStatus);
    if (!res.success) { toast.show(res.error ?? 'فشل', 'error'); return; }
    toast.show(newStatus === 'suspended' ? 'تم إيقاف المندوب' : 'تم تفعيل المندوب', 'success');
    load();
  }

  async function handleExtend(d: DriverWithProfile) {
    setExtending(d.id);
    const res = await createOrExtendSubscription(d.id, 30);
    setExtending(null);
    if (!res.success) { toast.show(res.error ?? 'فشل', 'error'); return; }
    toast.show('تم تمديد الاشتراك ٣٠ يوم', 'success');
    load();
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900 font-display">إدارة المندوبين</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={18} /> إضافة مندوب</Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن مندوب..."
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<UserCog size={28} />} title="لا يوجد مندوبون" subtitle="أضف مندوبًا جديدًا للبدء" /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const eff = getDriverEffectiveStatus(d.status, d.subscription_end);
            const subActive = isSubscriptionActive(d.subscription_end);
            return (
              <Card key={d.id} className="card-hover">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-base font-extrabold text-brand-700">
                      {(d.full_name || 'م').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{d.full_name || 'مندوب'}</p>
                      <p className="text-xs text-ink-500">{d.phone || '—'}</p>
                    </div>
                  </div>
                  <DriverStatusBadge status={eff} />
                </div>

                <div className="mb-3 space-y-1.5 rounded-xl bg-ink-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-ink-500">الحالة</span>
                    <span className="text-[11px] font-bold text-ink-700">{DRIVER_STATUS_LABELS[d.status]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-ink-500">الاشتراك</span>
                    <span className={`text-[11px] font-bold ${subActive ? 'text-success-600' : 'text-danger-600'}`}>
                      {subActive ? `حتى ${formatDateOnly(d.subscription_end)}` : 'منتهٍ'}
                    </span>
                  </div>
                  {d.vehicle_info && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-ink-500">المركبة</span>
                      <span className="text-[11px] font-bold text-ink-700">{d.vehicle_info}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={d.status === 'suspended' ? 'primary' : 'outline'}
                    className="flex-1"
                    onClick={() => handleToggleSuspend(d)}
                  >
                    {d.status === 'suspended' ? <><Check size={14} /> تفعيل</> : <><Ban size={14} /> إيقاف</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    loading={extending === d.id}
                    onClick={() => handleExtend(d)}
                  >
                    <CalendarPlus size={14} /> تمديد
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showAdd && <AddDriverModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} toast={toast} />}
    </AdminLayout>
  );
}

function AddDriverModal({ onClose, onDone, toast }: {
  onClose: () => void; onDone: () => void; toast: ReturnType<typeof useToast>;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) { toast.show('يرجى ملء الحقول المطلوبة', 'error'); return; }
    setSaving(true);
    const res = await createDriverByAdmin({ email: email.trim(), password, full_name: name, phone, vehicle_info: vehicle });
    setSaving(false);
    if (!res.success) { toast.show(res.error ?? 'فشل إنشاء المندوب', 'error'); return; }
    toast.show('تم إنشاء المندوب بنجاح', 'success');
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md animate-slide-up rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink-900 font-display">إضافة مندوب جديد</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="الاسم الكامل" value={name} onChange={setName} required />
          <Input label="رقم الهاتف" value={phone} onChange={setPhone} type="tel" />
          <Input label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" required />
          <Input label="كلمة المرور" value={password} onChange={setPassword} type="password" required />
          <Input label="معلومات المركبة (اختياري)" value={vehicle} onChange={setVehicle} placeholder="نوع المركبة، اللون، اللوحة" />
          <Button type="submit" loading={saving} className="w-full">إنشاء المندوب</Button>
        </form>
      </div>
    </div>
  );
}

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllCustomers()
      .then((c) => { setCustomers(c); setFiltered(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = search.trim().toLowerCase();
    if (!t) { setFiltered(customers); return; }
    setFiltered(customers.filter((c) => c.full_name.toLowerCase().includes(t) || c.phone.toLowerCase().includes(t)));
  }, [search, customers]);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900 font-display">الزبائن</h1>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن زبون..."
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Users size={28} />} title="لا يوجد زبائن" /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="card-hover">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-base font-extrabold text-brand-700">
                  {(c.full_name || 'ز').charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{c.full_name || 'زبون'}</p>
                  <p className="text-xs text-ink-500">{c.phone || '—'}</p>
                  <p className="text-[10px] text-ink-400">{formatTimeAgo(c.created_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export function AdminSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [fare, setFare] = useState('');
  const [days, setDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        setFare(String(s?.default_fare ?? ''));
        setDays(String(s?.subscription_duration_days ?? ''));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await updateSettings({
      default_fare: Number(fare) || 0,
      subscription_duration_days: Number(days) || 30,
    });
    setSaving(false);
    if (res.error) toast.show(res.error, 'error');
    else toast.show('تم حفظ الإعدادات', 'success');
  }

  if (loading) return <AdminLayout><Loading /></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900 font-display">إعدادات النظام</h1>

      <Card className="max-w-md space-y-4">
        <h2 className="text-sm font-extrabold text-ink-800 font-display">الإعدادات العامة</h2>
        <Input label="أجرة التوصيل الافتراضية (د.ع)" value={fare} onChange={setFare} type="number" />
        <Input label="مدة الاشتراك الافتراضية (أيام)" value={days} onChange={setDays} type="number" />
        <Button loading={saving} onClick={handleSave}>حفظ الإعدادات</Button>
      </Card>

      <Card className="mt-4 max-w-md">
        <h2 className="mb-2 text-sm font-extrabold text-ink-800 font-display">حالة النظام</h2>
        <div className="space-y-1.5 text-xs text-ink-600">
          <p>قاعدة البيانات: مفعّلة</p>
          <p>المصادقة: مفعّلة (بريد/كلمة مرور)</p>
          <p>قواعد الأمان (RLS): مفعّلة على جميع الجداول</p>
          <p>دالة منع التعارض (claim_order): مفعّلة</p>
          <p>الإشعارات الداخلية: مفعّلة</p>
          <p className="text-ink-400">الإشعارات الفورية (FCM): تتطلب إعداد مفتاح — راجع README</p>
          <p className="text-ink-400">خرائط Google: تتطلب مفتاح API — راجع README</p>
        </div>
      </Card>
    </AdminLayout>
  );
}

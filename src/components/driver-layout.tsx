import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Package, Clock, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/brand';
import { DriverStatusBadge } from '@/components/ui';
import type { ReactNode } from 'react';
import type { Driver } from '@/lib/types';
import { getDriverEffectiveStatus, isSubscriptionActive, formatDateOnly, daysUntil } from '@/lib/format';

const navItems = [
  { to: '/driver', label: 'الرئيسية', icon: Home, end: true },
  { to: '/driver/orders', label: 'الطلبات', icon: Package },
  { to: '/driver/history', label: 'سجلّي', icon: Clock },
  { to: '/driver/profile', label: 'حسابي', icon: User },
];

export function DriverLayout({ children, driver }: { children: ReactNode; driver: Driver | null }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const effective = driver ? getDriverEffectiveStatus(driver.status, driver.subscription_end) : 'expired';
  const subActive = isSubscriptionActive(driver?.subscription_end ?? null);
  const days = daysUntil(driver?.subscription_end ?? null);

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-ink-600 transition hover:bg-ink-100"
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>
        {driver && (
          <div className="mx-auto max-w-2xl px-4 pb-3">
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-800">{profile?.full_name}</span>
                <DriverStatusBadge status={effective} />
              </div>
              {subActive ? (
                <span className="text-[11px] font-medium text-brand-700">
                  الاشتراك ينتهي {formatDateOnly(driver.subscription_end)} (خلال {days} يوم)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-danger-600">الاشتراك منتهٍ</span>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-bold transition ${
                  isActive ? 'text-brand-700' : 'text-ink-400'
                }`
              }
            >
              <item.icon size={22} strokeWidth={item.end ? 2.5 : 2} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

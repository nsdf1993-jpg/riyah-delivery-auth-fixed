import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Package, User, LogOut, PlusCircle, Clock, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/brand';
import type { ReactNode } from 'react';

const navItems = [
  { to: '/customer', label: 'الرئيسية', icon: Home, end: true },
  { to: '/customer/new-order', label: 'طلب جديد', icon: PlusCircle },
  { to: '/customer/history', label: 'طلباتي', icon: Clock },
  { to: '/customer/profile', label: 'حسابي', icon: User },
];

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

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
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="mb-4">
          <p className="text-sm text-ink-500">مرحبًا</p>
          <h1 className="text-xl font-extrabold text-ink-900 font-display">{profile?.full_name || 'زبون'}</h1>
        </div>
        {children}
      </main>

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

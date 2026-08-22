import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, UserCog, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/brand';
import { useState } from 'react';
import type { ReactNode } from 'react';

const navItems = [
  { to: '/admin', label: 'لوحة المعلومات', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'الطلبات', icon: Package },
  { to: '/admin/drivers', label: 'المندوبون', icon: UserCog },
  { to: '/admin/customers', label: 'الزبائن', icon: Users },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-l border-ink-100 bg-white">
        <div className="flex items-center justify-between px-5 py-5 border-b border-ink-100">
          <Logo size="sm" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-700">
              {(profile?.full_name || 'أ').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-800">{profile?.full_name || 'مدير'}</p>
              <p className="text-[11px] text-ink-400">إدارة النظام</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-ink-600 transition hover:bg-ink-100"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3">
          <Logo size="sm" />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100"
            aria-label="القائمة"
          >
            <div className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-ink-700" />
              <span className="block h-0.5 w-5 bg-ink-700" />
              <span className="block h-0.5 w-5 bg-ink-700" />
            </div>
          </button>
        </header>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-ink-900/40" />
            <div className="absolute inset-y-0 right-0 w-72 bg-white p-4 shadow-elevated" onClick={(e) => e.stopPropagation()}>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    {item.label}
                  </NavLink>
                ))}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-ink-600 hover:bg-ink-100"
                >
                  <LogOut size={20} />
                  تسجيل الخروج
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 lg:mr-64">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

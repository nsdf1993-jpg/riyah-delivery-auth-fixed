import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Lock, Eye, EyeOff, Shield, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/brand';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/toast';
import { isAdminBootstrapNeeded } from '@/lib/profile-service';
import type { UserRole } from '@/lib/types';

export function LoginPage() {
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [role, setRole] = useState<UserRole>('customer');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) navigate(roleHome(profile.role), { replace: true });
  }, [user, profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    const { error } = await signIn(identifier, password);
    setLoading(false);
    if (error) toast.show(error, 'error');
    else toast.show('تم تسجيل الدخول', 'success');
  }

  const admin = role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-4 text-sm text-ink-500">سجّل الدخول للمتابعة إلى حسابك</p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {([
            ['customer', 'زبون', User],
            ['driver', 'مندوب', User],
            ['admin', 'إدارة', Shield],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setRole(value); setIdentifier(''); }}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-xs font-bold ${
                role === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-600'
              }`}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink-700">
              {admin ? 'البريد الإلكتروني' : 'رقم الهاتف'}
            </label>
            <div className="relative">
              {admin ? <Mail size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" /> : <Phone size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />}
              <input
                type={admin ? 'email' : 'tel'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={admin ? 'example@mail.com' : '07XX XXX XXXX'}
                required
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink-700">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} size="lg" className="w-full">تسجيل الدخول</Button>
        </form>

        {role === 'customer' && (
          <Link to="/register?role=customer" className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-700">
            <User size={18} /> إنشاء حساب زبون جديد
          </Link>
        )}

        <p className="mt-auto pt-8 text-center text-xs text-ink-400">رياح الجنوب للتوصيل السريع — جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password || !fullName) return;
    setLoading(true);
    const { error } = await signUp(phone.trim(), password, 'customer', { full_name: fullName, phone: phone.trim() });
    setLoading(false);
    if (error) {
      toast.show(error, 'error');
      return;
    }
    toast.show('تم إنشاء الحساب بنجاح', 'success');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="mb-6 flex flex-col items-center text-center"><Logo size="lg" /><p className="mt-4 text-sm text-ink-500">إنشاء حساب زبون</p></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="الاسم الكامل" value={fullName} onChange={setFullName} placeholder="الاسم" required />
          <Input label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="07XX XXX XXXX" type="tel" required />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink-700">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" required className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{showPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <Button type="submit" loading={loading} size="lg" className="w-full">إنشاء الحساب</Button>
        </form>
        <Link to="/login" className="mt-6 text-center text-sm font-bold text-brand-700 hover:underline">لديك حساب؟ سجّل الدخول</Link>
      </div>
    </div>
  );
}

export function roleHome(role: UserRole): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'driver': return '/driver';
    default: return '/customer';
  }
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, UserRole } from './types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (identifier: string, password: string, role: UserRole, meta: { full_name: string; phone: string }) => Promise<{ error: string | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

async function loadProfileByAuthId(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeIraqiPhone(value: string): string {
  const raw = value.trim().replace(/[\s()-]/g, '');
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('00964')) return `+${raw.slice(2)}`;
  if (raw.startsWith('964')) return `+${raw}`;
  if (raw.startsWith('07')) return `+964${raw.slice(1)}`;
  return raw;
}

async function loadProfile(uid: string): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.error('loadProfile error', error);
    return { profile: null, error: error.message };
  }
  return { profile: (data as Profile | null) ?? null, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          const result = await loadProfile(data.session.user.id);
          if (mounted) setProfile(result.profile);
        }
      } catch (error) {
        console.error('Auth initialization error', error);
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      // Do not perform a Supabase database query inside the auth callback.
      // Queue it so auth state changes cannot deadlock the client.
      if (newSession?.user) {
        setTimeout(async () => {
          if (!mounted) return;
          const result = await loadProfile(newSession.user.id);
          if (mounted) setProfile(result.profile);
          if (mounted && event !== 'INITIAL_SESSION') setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,

    async signUp(identifier, password, role, meta) {
      if (role === 'driver') return { error: 'لا يمكن للمندوب إنشاء حساب بنفسه' };

      const common = {
        data: {
          role,
          full_name: meta.full_name,
          phone: meta.phone,
        },
      };

      const isEmail = identifier.includes('@');
      const response = isEmail
        ? await supabase.auth.signUp({ email: identifier.trim().toLowerCase(), password, options: common })
        : await supabase.auth.signUp({ phone: normalizeIraqiPhone(identifier), password, options: common });

      if (response.error) return { error: translateError(response.error.message) };
      if (!response.data.user) return { error: 'تعذر إنشاء الحساب' };
      return { error: null };
    },

    async signIn(identifier, password) {
      const value = identifier.trim();
      const response = value.includes('@')
        ? await supabase.auth.signInWithPassword({ email: value.toLowerCase(), password })
        : await supabase.auth.signInWithPassword({ phone: normalizeIraqiPhone(value), password });

      if (response.error) return { error: translateError(response.error.message) };
      if (!response.data.session) return { error: 'تعذر إنشاء جلسة تسجيل الدخول' };

      const result = await loadProfile(response.data.user.id);
      if (result.error) {
        await supabase.auth.signOut();
        return { error: `تم تسجيل الدخول لكن تعذر تحميل بيانات الحساب: ${result.error}` };
      }
      if (!result.profile) {
        await supabase.auth.signOut();
        return { error: 'الحساب لا يحتوي على ملف مستخدم صالح' };
      }
      setProfile(result.profile);
      setSession(response.data.session);
      return { error: null };
    },

    async signOut() {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
    },

    async refreshProfile() {
      if (!session?.user) return;
      const result = await loadProfile(session.user.id);
      setProfile(result.profile);
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'رقم الهاتف/البريد أو كلمة المرور غير صحيحة';
  if (m.includes('user already registered')) return 'هذا الحساب مسجّل مسبقًا';
  if (m.includes('email')) return 'البريد الإلكتروني غير صالح';
  if (m.includes('phone')) return 'رقم الهاتف غير صالح أو غير مفعّل في Supabase';
  if (m.includes('password')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  if (m.includes('rate limit')) return 'محاولات كثيرة، حاول لاحقًا';
  if (m.includes('confirm')) return 'يجب تأكيد الحساب أولًا من إعدادات Supabase';
  return msg;
}

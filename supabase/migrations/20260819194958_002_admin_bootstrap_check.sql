/*
# دالة فحص الحاجة لأدمن أولي (bootstrap)

تسمح بإنشاء أول حساب إدارة إذا لم يوجد أي أدمن في النظام.
دالة عامة قابلة للتنفيذ بدون مصادقة (TO anon, authenticated).
*/

CREATE OR REPLACE FUNCTION public.is_admin_bootstrap_needed()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_bootstrap_needed() TO anon, authenticated;

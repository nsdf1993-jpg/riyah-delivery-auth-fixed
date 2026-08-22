/*
# إصلاحات أمنية: تقييد تنفيذ الدوال الخادمية

1. سحب صلاحية EXECUTE من anon/PUBLIC على جميع دوال SECURITY DEFINER الحساسة
2. إصلاح search_path لدالة set_updated_at (إعادة إنشاء مع CASCADE ثم إعادة التريغر)
3. دالة is_admin_bootstrap_needed تبقى متاحة لـ anon (مطلوبة لفحص أولي).
*/

-- إعادة إنشاء set_updated_at بـ search_path ثابت
DROP TRIGGER IF EXISTS drivers_set_updated_at ON public.drivers;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER drivers_set_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- سحب EXECUTE من PUBLIC/anon وإبقاؤها لـ authenticated فقط
REVOKE EXECUTE ON FUNCTION public.claim_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_order(text,text,text,text,double precision,double precision,numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_order(uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_or_extend_subscription(uuid,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.init_driver_record(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_driver_status(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_driver() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.driver_subscription_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.driver_can_work(uuid) FROM PUBLIC, anon;

-- إعادة منح لـ authenticated
GRANT EXECUTE ON FUNCTION public.claim_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(text,text,text,text,double precision,double precision,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_order(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_extend_subscription(uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.init_driver_record(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_driver_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver() TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_subscription_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_can_work(uuid) TO authenticated;

-- is_admin_bootstrap_needed تبقى متاحة لـ anon + authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin_bootstrap_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_bootstrap_needed() TO anon, authenticated;

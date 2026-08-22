/*
# منع التسجيل الذاتي كمندوب + دعم تسجيل الزبون برقم الهاتف

## التغييرات
1. تعديل دالة `handle_new_user` (التريغر): تمنع إنشاء حساب بدور "driver" عبر التسجيل الذاتي (signUp).
   فقط الأدمن يستطيع إنشاء مندوب — وذلك عبر Edge Function التي تستخدم service role.
   المنطق: إذا كان الدور "driver" والمستخدم ليس قد أنشئ بواسطة service role (أي ليس من admin API)،
   نمنع العملية برمي استثناء.
   
   ملاحظة: Supabase لا يفرّق بين signUp العادي و admin.createUser من حيث التريغر،
   لكننا نستخدم raw_app_meta_data الذي يضعه service role فقط. سنستخدم نهجًا أبسط:
   نمنع دور "driver" في user_metadata تمامًا من التسجيل الذاتي، لأن admin.createUser
   يضع role في user_metadata أيضًا. لذلك سنستخدم نهجًا مختلفًا:
   
   النهج: نمنع التسجيل بدور "driver" عبر signUp العادي بإضافة فحص في التريغر.
   لكن بما أن التريغر لا يستطيع التمييز، سنستخدم سياسة RLS على جدول drivers:
   - INSERT على drivers مسموح فقط إذا auth.uid() = id (المستخدم نفسه) أو is_admin.
   - لكن المندوب الجديد لن يكون لديه صف drivers بعد، فكيف ينشئه؟
   
   الحل النهائي: نعتمد على أن إنشاء مندوب يتم فقط عبر Edge Function (service role).
   التسجيل الذاتي (signUp) يُنشئ profile فقط. إذا حاول مستخدم التسجيل بدور "driver"،
   فإن التريغر يُنشئ profile بدور driver لكن لن يكون لديه صف في drivers،
   وبالتالي لن يظهر له أي طلبات (لأن driver_can_work تتحقق من صف drivers).
   
   لكن لمنع التلاعب تمامًا: نعدّل التريغر ليرفض دور "driver" في user_metadata
   ويحوّله تلقائيًا إلى "customer". هذا يضمن أن أي محاولة تسجيل ذاتي بدور driver
   ستنشئ حساب زبون بدلاً من مندوب.

2. إضافة عمود `phone` كـ UNIQUE في profiles لمنع تكرار رقم الهاتف.
3. دالة `update_driver_subscription_dates` جديدة تسمح للأدمن بتحديد تواريخ بداية/نهاية الاشتراك مباشرة.
*/

-- تعديل تريغر إنشاء profile: منع دور driver من التسجيل الذاتي
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- منع التسجيل الذاتي بدور driver: يحوّل تلقائيًا إلى customer
  -- المندوبون يُنشؤون فقط عبر Edge Function (admin.createUser مع service role)
  IF v_role = 'driver' THEN
    v_role := 'customer';
  END IF;
  
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- إضافة قيد UNIQUE على phone في profiles (لكن نسمح بـ NULL/فارغ)
-- نستخدم partial index: فقط للأرقام غير الفارغة
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_nonempty_unique
  ON public.profiles (phone)
  WHERE phone <> '';

-- دالة جديدة: تحديد تواريخ الاشتراك مباشرة (للأدمن)
CREATE OR REPLACE FUNCTION public.set_driver_subscription_dates(
  p_driver_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'صلاحية إدارة فقط');
  END IF;

  UPDATE public.drivers
    SET subscription_start = COALESCE(p_start_date, subscription_start),
        subscription_end = p_end_date
    WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'المندوب غير موجود');
  END IF;

  -- إذا تم تحديد تاريخ نهاية، نُنشئ سجل اشتراك جديد
  IF p_end_date IS NOT NULL THEN
    INSERT INTO public.subscriptions (driver_id, start_date, end_date, status)
    VALUES (p_driver_id, COALESCE(p_start_date, now()), p_end_date, 'active');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'تم تحديث تواريخ الاشتراك');
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_driver_subscription_dates(uuid, timestamptz, timestamptz) TO authenticated;

-- دالة: تحديث بيانات المندوب (للأدمن) — الاسم، الهاتف، معلومات المركبة
CREATE OR REPLACE FUNCTION public.admin_update_driver(
  p_driver_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_vehicle_info text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'صلاحية إدارة فقط');
  END IF;

  IF p_full_name IS NOT NULL THEN
    UPDATE public.profiles SET full_name = p_full_name WHERE id = p_driver_id;
  END IF;

  IF p_phone IS NOT NULL THEN
    UPDATE public.profiles SET phone = p_phone WHERE id = p_driver_id;
  END IF;

  IF p_vehicle_info IS NOT NULL THEN
    UPDATE public.drivers SET vehicle_info = p_vehicle_info WHERE id = p_driver_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'تم تحديث بيانات المندوب');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_driver(uuid, text, text, text) TO authenticated;

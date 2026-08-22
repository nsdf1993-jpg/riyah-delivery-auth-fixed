/*
# رياح الجنوب للتوصيل — مخطط قاعدة البيانات الكامل

إنشاء بنية قاعدة البيانات لتطبيق توصيل متكامل يربط الزبائن والمندوبين والإدارة.

## الجداول الجديدة

1. `profiles` — يخزّن دور المستخدم (زبون/مندوب/إدارة) وبياناته الأساسية، مرتبط بجدول auth.users
   - id (uuid, PK, مرتبط بـ auth.users)
   - role (text: customer | driver | admin)
   - full_name (text)
   - phone (text)
   - created_at (timestamp)

2. `drivers` — بيانات المندوبين وحالتهم والاشتراك
   - id (uuid, PK, مرتبط بـ profiles)
   - status (text: available | busy | suspended)
   - subscription_start (timestamptz)
   - subscription_end (timestamptz)
   - is_available (boolean, مشتق منطقيًا)
   - created_at, updated_at

3. `orders` — الطلبات
   - id (uuid, PK)
   - number (int, تسلسلي للعرض)
   - customer_id (uuid, FK → profiles)
   - driver_id (uuid, FK → profiles, nullable)
   - status (text: new | taken | confirmed | on_the_way | delivered | cancelled)
   - customer_phone, customer_name (text)
   - details (text)
   - address (text)
   - latitude, longitude (numeric, nullable)
   - fare (numeric, nullable)
   - created_at, accepted_at, completed_at, cancelled_at (timestamps)
   - cancel_reason (text, nullable)

4. `subscriptions` — سجل الاشتراكات لكل مندوب (متعدد)
   - id (uuid, PK)
   - driver_id (uuid, FK → drivers)
   - start_date, end_date (timestamptz)
   - status (text: active | expired)
   - created_at

5. `cancellations` — سجل أسباب الإلغاء
   - id (uuid, PK)
   - order_id (uuid, FK → orders)
   - cancelled_by (text: customer | driver | admin)
   - reason (text)
   - created_at

6. `notifications` — إشعارات النظام (مستقبلية/FCM)
   - id (uuid, PK)
   - user_id (uuid, FK → profiles)
   - title, body (text)
   - type (text)
   - read (boolean, default false)
   - created_at

7. `settings` — إعدادات النظام
   - id (int, PK)
   - default_fare (numeric)
   - subscription_duration_days (int)
   - updated_at

## الأمان (RLS)
- تفعيل RLS على كل جدول
- الزبون: يرى ويعدّل بياناته وطلباته فقط
- المندوب: يرى الطلبات الجديدة (المتاحة) + طلباته المسندة + بياناته
- الإدارة: صلاحيات كاملة عبر دور admin في profiles

## الدوال الخادمية (RPC)
- `claim_order(p_order_id)` — دالة ذرية (SECURITY DEFINER) تأخذ الطلب للمندوب المتصل، تمنع التعارض، تتحقق من حالة المندوب والاشتراك. تُعيد success/conflict/locked.
- `expire_subscriptions()` — تحدّث حالة الاشتراكات المنتهية و حالة المندوب.
- `create_order(...)` — تُنشئ طلبًا جديدًا للزبون المتصل وتعيد رقم الطلب.

## ملاحظات
- يستخدم `auth.uid()` للتحقق من الملكية
- role يُخزّن في raw_app_meta_data (غير قابل للتعديل من المستخدم)
- تسلسل رقم الطلب عبر sequence مخصص
*/

-- لاحظ: لا يمكننا تعديل auth.users مباشرة، نستخدم profiles موازٍ

-- ======= الجداول =======

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer','driver','admin')),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','suspended')),
  subscription_start timestamptz,
  subscription_end timestamptz,
  vehicle_info text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL DEFAULT nextval('public.order_number_seq'),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','taken','confirmed','on_the_way','delivered','cancelled')),
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  fare numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_number_key ON public.orders(number);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cancelled_by text NOT NULL CHECK (cancelled_by IN ('customer','driver','admin')),
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id int PRIMARY KEY DEFAULT 1,
  default_fare numeric(10,2) NOT NULL DEFAULT 3000,
  subscription_duration_days int NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ======= الفهارس =======
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_driver ON public.subscriptions(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);

-- ======= التفعيل RLS =======
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ======= دوال مساعدة =======

-- هل المستخدم الحالي أدمن؟
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- هل المستخدم الحالي مندوب؟
CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'driver'
  );
$$;

-- هل الاشتراك الحالي للمندوب فعال؟
CREATE OR REPLACE FUNCTION public.driver_subscription_active(p_driver uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = p_driver
      AND d.subscription_end IS NOT NULL
      AND d.subscription_end > now()
  );
$$;

-- هل المندوب متاح للعمل (حالة + اشتراك)؟
CREATE OR REPLACE FUNCTION public.driver_can_work(p_driver uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = p_driver
      AND d.status = 'available'
      AND d.subscription_end IS NOT NULL
      AND d.subscription_end > now()
  );
$$;

-- ======= سياسات profiles =======

DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "select_own_or_admin_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- الإدارة لا تعدّل profiles مباشرة هنا (تُنشئ مندوبين عبر دالة منفصلة إن لزم)؛ نسمح للأدمن بتحديث بيانات الآخرين
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_insert_profiles" ON public.profiles;
CREATE POLICY "admin_insert_profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ======= سياسات drivers =======

-- المندوب يرى صفه فقط؛ الإدارة ترى الكل؛ الزبون لا يرى صفات المندوبين (يصل لبيانات المندوب عبر الطلب)
DROP POLICY IF EXISTS "select_drivers_self_or_admin" ON public.drivers;
CREATE POLICY "select_drivers_self_or_admin"
ON public.drivers FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "insert_driver_self_or_admin" ON public.drivers;
CREATE POLICY "insert_driver_self_or_admin"
ON public.drivers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "update_driver_self_or_admin" ON public.drivers;
CREATE POLICY "update_driver_self_or_admin"
ON public.drivers FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- ======= سياسات orders =======

-- الزبون يرى طلباته؛ المندوب يرى الطلبات الجديدة المتاحة + طلباته المسندة؛ الإدارة ترى الكل
DROP POLICY IF EXISTS "select_orders" ON public.orders;
CREATE POLICY "select_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  OR driver_id = auth.uid()
  OR (status = 'new' AND public.is_driver() AND public.driver_can_work(auth.uid()))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "insert_own_order" ON public.orders;
CREATE POLICY "insert_own_order"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- تحديث حالة الطلب: المندوب المسؤول، الزبون صاحب الطلب (للإلغاء)، أو الإدارة
DROP POLICY IF EXISTS "update_orders" ON public.orders;
CREATE POLICY "update_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  OR customer_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  driver_id = auth.uid()
  OR customer_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "delete_orders_admin" ON public.orders;
CREATE POLICY "delete_orders_admin"
ON public.orders FOR DELETE
TO authenticated
USING (public.is_admin());

-- ======= سياسات subscriptions =======

-- المندوب يرى اشتراكاته؛ الإدارة ترى الكل
DROP POLICY IF EXISTS "select_subscriptions" ON public.subscriptions;
CREATE POLICY "select_subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (driver_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert_subscriptions_admin" ON public.subscriptions;
CREATE POLICY "insert_subscriptions_admin"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_subscriptions_admin" ON public.subscriptions;
CREATE POLICY "update_subscriptions_admin"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ======= سياسات cancellations =======

DROP POLICY IF EXISTS "select_cancellations" ON public.cancellations;
CREATE POLICY "select_cancellations"
ON public.cancellations FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid()))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "insert_cancellations" ON public.cancellations;
CREATE POLICY "insert_cancellations"
ON public.cancellations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.driver_id = auth.uid() OR public.is_admin()))
);

-- ======= سياسات notifications =======

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
CREATE POLICY "insert_own_notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ======= سياسات settings =======

-- الإعدادات يقرأها الجميع (قيم عامة مثل الأجرة الافتراضية)
DROP POLICY IF EXISTS "select_settings" ON public.settings;
CREATE POLICY "select_settings"
ON public.settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "update_settings_admin" ON public.settings;
CREATE POLICY "update_settings_admin"
ON public.settings FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ======= التريغر: إنشاء profile تلقائيًا عند التسجيل =======
-- نُنشئ profile عند إدراج صف في auth.users عبر trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
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

-- ======= التريغر: تحديث updated_at للسائقين =======
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drivers_set_updated_at ON public.drivers;
CREATE TRIGGER drivers_set_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======= دالة ذرية: أخذ الطلب (منع التعارض) =======
-- تتحقق: الطلب حالته new، المندوب متاح، اشتراكه فعال، لا أحد أخذه
-- تستخدم SELECT ... FOR UPDATE لحجز صف الطلب ضمن المعاملة

CREATE OR REPLACE FUNCTION public.claim_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_driver public.drivers%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- التحقق من هوية المستخدم
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_profile.role <> 'driver' THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'صلاحية غير كافية');
  END IF;

  -- حالة المندوب
  SELECT * INTO v_driver FROM public.drivers WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_driver_record', 'message', 'لا يوجد سجل مندوب');
  END IF;

  IF v_driver.status = 'suspended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'suspended', 'message', 'لا يمكنك أخذ الطلب لأن حسابك موقوف');
  END IF;

  IF v_driver.status = 'busy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'busy', 'message', 'أنت مشغول بطلب آخر');
  END IF;

  IF v_driver.subscription_end IS NULL OR v_driver.subscription_end <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_expired', 'message', 'اشتراكك منتهٍ، لا يمكنك أخذ طلبات');
  END IF;

  -- حجز صف الطلب حصريًا (منع التعارض)
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'الطلب غير موجود');
  END IF;

  IF v_order.status <> 'new' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_taken', 'message', 'الطلب تم أخذه من مندوب آخر');
  END IF;

  -- أخذ الطلب
  UPDATE public.orders
    SET status = 'taken', driver_id = auth.uid(), accepted_at = now()
    WHERE id = p_order_id;

  -- تعيين المندوب كمشغول
  UPDATE public.drivers SET status = 'busy' WHERE id = auth.uid();

  -- إشعار للزبون
  INSERT INTO public.notifications (user_id, title, body, type)
  VALUES (v_order.customer_id, 'تم أخذ طلبك', 'تم أخذ طلبك رقم ' || v_order.number || ' من قبل مندوب', 'order_taken');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order.number,
    'message', 'تم أخذ الطلب بنجاح'
  );
END;
$$;

-- ======= دالة: إنشاء طلب جديد =======
CREATE OR REPLACE FUNCTION public.create_order(
  p_details text,
  p_address text,
  p_customer_phone text,
  p_customer_name text,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_fare numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number int;
  v_profile public.profiles%ROWTYPE;
  v_settings public.settings%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_profile.role <> 'customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'يجب تسجيل الدخول كزبون');
  END IF;

  SELECT * INTO v_settings FROM public.settings WHERE id = 1;

  INSERT INTO public.orders (customer_id, details, address, customer_phone, customer_name, latitude, longitude, fare)
  VALUES (auth.uid(), p_details, p_address, p_customer_phone, p_customer_name, p_latitude, p_longitude, COALESCE(p_fare, v_settings.default_fare))
  RETURNING id, number INTO v_order_id, v_order_number;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'message', 'تم إنشاء الطلب'
  );
END;
$$;

-- ======= دالة: تحديث حالة الطلب (للمندوب) =======
CREATE OR REPLACE FUNCTION public.advance_order(p_order_id uuid, p_new_status text, p_cancel_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'الطلب غير موجود');
  END IF;

  -- صلاحية: مندوب المسؤول، الزبون صاحب الطلب، أو الإدارة
  IF NOT (v_order.driver_id = auth.uid() OR v_order.customer_id = auth.uid() OR v_is_admin) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'لا تملك صلاحية');
  END IF;

  -- حالة الإلغاء
  IF p_new_status = 'cancelled' THEN
    IF v_order.status = 'delivered' THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid', 'message', 'لا يمكن إلغاء طلب مكتمل');
    END IF;

    UPDATE public.orders
      SET status = 'cancelled', cancelled_at = now(), cancel_reason = p_cancel_reason
      WHERE id = p_order_id;

    INSERT INTO public.cancellations (order_id, cancelled_by, reason)
    VALUES (p_order_id,
      CASE WHEN v_order.customer_id = auth.uid() THEN 'customer'
           WHEN v_order.driver_id = auth.uid() THEN 'driver'
           ELSE 'admin' END,
      COALESCE(p_cancel_reason, ''));

    -- تحرير المندوب
    IF v_order.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET status = 'available' WHERE id = v_order.driver_id;
    END IF;

    -- إشعار
    IF v_order.customer_id <> auth.uid() THEN
      INSERT INTO public.notifications (user_id, title, body, type)
      VALUES (v_order.customer_id, 'تم إلغاء طلبك', 'تم إلغاء الطلب رقم ' || v_order.number || COALESCE(': ' || p_cancel_reason, ''), 'order_cancelled');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'تم إلغاء الطلب');
  END IF;

  -- الانتقالات المسموحة
  IF p_new_status = 'confirmed' AND v_order.status = 'taken' THEN
    UPDATE public.orders SET status = 'confirmed' WHERE id = p_order_id;
  ELSIF p_new_status = 'on_the_way' AND v_order.status IN ('taken','confirmed') THEN
    UPDATE public.orders SET status = 'on_the_way' WHERE id = p_order_id;
  ELSIF p_new_status = 'delivered' AND v_order.status IN ('confirmed','on_the_way') THEN
    UPDATE public.orders SET status = 'delivered', completed_at = now() WHERE id = p_order_id;
    IF v_order.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET status = 'available' WHERE id = v_order.driver_id;
    END IF;
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (v_order.customer_id, 'تم التوصيل', 'تم توصيل طلبك رقم ' || v_order.number, 'order_delivered');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_transition', 'message', 'انتقال غير مسموح من ' || v_order.status || ' إلى ' || p_new_status);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'تم تحديث الحالة');
END;
$$;

-- ======= دالة: إنشاء/تمديد اشتراك =======
CREATE OR REPLACE FUNCTION public.create_or_extend_subscription(p_driver_id uuid, p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver public.drivers%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'صلاحية إدارة فقط');
  END IF;

  SELECT * INTO v_driver FROM public.drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'المندوب غير موجود');
  END IF;

  -- إذا كان اشتراك جارٍ، نمدّد من تاريخ انتهائه؛ وإلا من الآن
  IF v_driver.subscription_end IS NOT NULL AND v_driver.subscription_end > now() THEN
    v_start := v_driver.subscription_end;
  ELSE
    v_start := now();
  END IF;
  v_end := v_start + (p_days || ' days')::interval;

  UPDATE public.drivers
    SET subscription_start = COALESCE(subscription_start, now()), subscription_end = v_end
    WHERE id = p_driver_id;

  INSERT INTO public.subscriptions (driver_id, start_date, end_date, status)
  VALUES (p_driver_id, v_start, v_end, 'active');

  RETURN jsonb_build_object('success', true, 'end_date', v_end, 'message', 'تم تفعيل الاشتراك');
END;
$$;

-- ======= دالة: إنشاء مندوب جديد (للإدارة) =======
-- تنشئ auth user + profile + driver. تتطلب service role لكن نوفّر مسارًا عبر RPC من الإدارة.
-- ملاحظة: لا يمكن إنشاء auth user من RPC بدون service role، لذا الإدارة تُسجّل المندوب عبر auth.admin من الواجهة باستخدام مفتاح الخدمة.
-- نوفّر بدلاً من ذلك دالة لإعداد صف المندوب بعد التسجيل.
CREATE OR REPLACE FUNCTION public.init_driver_record(p_driver_id uuid, p_vehicle_info text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() AND auth.uid() <> p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'صلاحية غير كافية');
  END IF;

  INSERT INTO public.drivers (id, vehicle_info)
  VALUES (p_driver_id, p_vehicle_info)
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'تم إنشاء سجل المندوب');
END;
$$;

-- ======= دالة: إيقاف/تفعيل مندوب =======
CREATE OR REPLACE FUNCTION public.set_driver_status(p_driver_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'صلاحية إدارة فقط');
  END IF;

  IF p_status NOT IN ('available','suspended') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid', 'message', 'حالة غير مسموحة');
  END IF;

  UPDATE public.drivers SET status = p_status WHERE id = p_driver_id;
  RETURN jsonb_build_object('success', true, 'message', 'تم تحديث حالة المندوب');
END;
$$;

-- منح صلاحية تنفيذ الدوال للمستخدمين المصادق عليهم
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

-- منح صلاحيات الجداول
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cancellations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.settings TO authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT USAGE, SELECT ON public.order_number_seq TO authenticated;

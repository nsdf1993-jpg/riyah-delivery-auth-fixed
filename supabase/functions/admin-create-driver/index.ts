import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "missing_service_role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller session and admin role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerRole = userData.user.user_metadata?.role;
    if (callerRole !== "admin") {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, phone, vehicle_info } = body ?? {};
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "missing_fields", message: "البريد وكلمة المرور والاسم مطلوبة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "driver", full_name, phone: phone ?? "" },
    });

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: "create_failed", message: createErr?.message ?? "تعذر إنشاء المندوب" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driverId = created.user.id;

    // profile row auto-created by trigger; ensure driver record
    const { error: driverErr } = await adminClient.from("drivers").upsert({
      id: driverId,
      vehicle_info: vehicle_info ?? "",
      status: "available",
    });

    if (driverErr) {
      return new Response(JSON.stringify({ error: "driver_record_failed", message: driverErr.message, driver_id: driverId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activate default subscription
    const { error: subErr } = await adminClient.rpc("create_or_extend_subscription", {
      p_driver_id: driverId,
      p_days: 30,
    });
    if (subErr) {
      return new Response(JSON.stringify({ error: "subscription_failed", message: subErr.message, driver_id: driverId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, driver_id: driverId, message: "تم إنشاء المندوب بنجاح" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "server_error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

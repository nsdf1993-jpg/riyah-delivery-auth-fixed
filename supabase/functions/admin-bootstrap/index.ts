import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const client = createClient(url, serviceKey)

    const { email, password, full_name } = await req.json()
    if (!email || !password || password.length < 6) throw new Error("Email and password are required")

    const { count, error: countError } = await client
      .from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin")
    if (countError) throw countError
    if ((count ?? 0) > 0) throw new Error("Admin already exists. Use the existing Admin account.")

    const { data: created, error: createError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin", full_name: full_name ?? "" }
    })
    if (createError || !created.user) throw createError ?? new Error("Could not create admin")

    const { error: profileError } = await client.from("profiles").upsert({
      id: created.user.id,
      role: "admin",
      full_name: full_name ?? "",
      phone: null
    })
    if (profileError) {
      await client.auth.admin.deleteUser(created.user.id)
      throw profileError
    }

    return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), {
      headers: { ...cors, "Content-Type": "application/json" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

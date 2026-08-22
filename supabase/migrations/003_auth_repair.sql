-- Authentication repair migration
-- This migration does NOT delete users or passwords.
-- It only provides safe helpers for checking/repairing profile linkage.

create or replace function public.get_my_profile()
returns public.profiles
language sql
stable
security definer
set search_path=public
as $$
  select p from public.profiles p where p.id = auth.uid() limit 1;
$$;

-- Repair an existing user's profile only when run by an admin/service role.
create or replace function public.admin_repair_profile(
  p_user_id uuid,
  p_role public.app_role,
  p_full_name text default null,
  p_phone text default null
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only';
  end if;

  insert into public.profiles(id, role, full_name, phone)
  values(p_user_id, p_role, p_full_name, p_phone)
  on conflict(id) do update
    set role=excluded.role,
        full_name=coalesce(excluded.full_name, public.profiles.full_name),
        phone=coalesce(excluded.phone, public.profiles.phone);

  return true;
end
$$;

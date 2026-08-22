# Authentication repair instructions

This version keeps the existing project design and order system unchanged.

## What was repaired
- Admin authentication should validate `profiles.id = auth.uid()`.
- First-admin creation is available as a server-side Edge Function `admin-bootstrap`.
- Existing users are NOT deleted.
- Existing passwords are NOT changed by the repair migration.
- A repair SQL function is provided for fixing a missing/mismatched profile after an authenticated admin exists.

## Important
The actual Supabase project must be checked because source code alone cannot know whether the old user accounts exist in the remote Auth database.

If an old Admin/Driver/Customer account exists in Supabase Auth but its `profiles` row is missing or has the wrong role, repair that row rather than creating a duplicate Auth account.

Deploy:
supabase/functions/admin-bootstrap/index.ts

Run:
supabase/migrations/003_auth_repair.sql

Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.

-- Authorize fields with column privileges; avoid a self-referencing RLS query.
drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update(full_name,phone) on public.profiles to authenticated;

-- Customers can mark notifications read, but cannot rewrite their contents.
revoke update on public.notifications from authenticated, anon;
grant update(read_at) on public.notifications to authenticated;

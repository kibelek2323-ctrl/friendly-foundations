create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Signed-in callers may only check their own roles; service_role (auth.uid() is null) keeps full access.
  select (auth.uid() is null or auth.uid() = _user_id)
     and exists (
       select 1 from public.user_roles
       where user_id = _user_id and role = _role
     )
$$;

revoke execute on function public.has_role(uuid, app_role) from anon;
revoke execute on function public.has_role(uuid, app_role) from public;
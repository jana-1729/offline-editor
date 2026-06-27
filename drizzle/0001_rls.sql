-- Row-Level Security setup.
--
-- Strategy: the application connects as a dedicated, NON-owner role (app_user)
-- so RLS policies actually apply (table owners/superusers bypass RLS). Helper
-- predicates are SECURITY DEFINER functions owned by the migration role, so the
-- membership lookups inside them are NOT themselves subject to RLS — this is
-- what prevents infinite policy recursion between documents <-> members.
--
-- Tenant isolation choke point: every app query runs inside withUser(), which
-- sets app.current_user_id. Privileged paths (registration, realtime server)
-- run inside asService(), which sets app.bypass_rls=on.

-- ── Helper predicates ───────────────────────────────────────────────────────
create or replace function app_current_user() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;
--> statement-breakpoint
create or replace function app_bypass() returns boolean
  language sql stable as $$
    select coalesce(current_setting('app.bypass_rls', true), 'off') = 'on'
$$;
--> statement-breakpoint
create or replace function app_is_member(doc uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists(
      select 1 from document_members
      where document_id = doc and user_id = app_current_user()
    )
$$;
--> statement-breakpoint
create or replace function app_doc_role(doc uuid) returns text
  language sql stable security definer set search_path = public as $$
    select role::text from document_members
    where document_id = doc and user_id = app_current_user()
    limit 1
$$;
--> statement-breakpoint
create or replace function app_is_doc_owner(doc uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists(
      select 1 from documents where id = doc and owner_id = app_current_user()
    )
$$;
--> statement-breakpoint
create or replace function app_shares_user(target uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists(
      select 1 from document_members m1
      join document_members m2 on m1.document_id = m2.document_id
      where m1.user_id = app_current_user() and m2.user_id = target
    )
$$;
--> statement-breakpoint

-- ── Application role ─────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login password 'app_user';
  end if;
end $$;
--> statement-breakpoint
grant usage on schema public to app_user;
--> statement-breakpoint
grant select, insert, update, delete on all tables in schema public to app_user;
--> statement-breakpoint
grant execute on all functions in schema public to app_user;
--> statement-breakpoint
alter default privileges in schema public grant select, insert, update, delete on tables to app_user;
--> statement-breakpoint
alter default privileges in schema public grant execute on functions to app_user;
--> statement-breakpoint

-- ── users ───────────────────────────────────────────────────────────────────
alter table users enable row level security;
--> statement-breakpoint
create policy users_select on users for select
  using (app_bypass() or id = app_current_user() or app_shares_user(id));
--> statement-breakpoint
create policy users_modify on users for all
  using (app_bypass() or id = app_current_user())
  with check (app_bypass() or id = app_current_user());
--> statement-breakpoint

-- ── documents ────────────────────────────────────────────────────────────────
alter table documents enable row level security;
--> statement-breakpoint
create policy documents_select on documents for select
  using (app_bypass() or app_is_member(id));
--> statement-breakpoint
create policy documents_insert on documents for insert
  with check (app_bypass() or owner_id = app_current_user());
--> statement-breakpoint
create policy documents_update on documents for update
  using (app_bypass() or app_doc_role(id) in ('owner', 'editor'))
  with check (app_bypass() or app_doc_role(id) in ('owner', 'editor'));
--> statement-breakpoint
create policy documents_delete on documents for delete
  using (app_bypass() or app_doc_role(id) = 'owner');
--> statement-breakpoint

-- ── document_members ─────────────────────────────────────────────────────────
alter table document_members enable row level security;
--> statement-breakpoint
create policy dm_select on document_members for select
  using (app_bypass() or user_id = app_current_user() or app_is_member(document_id));
--> statement-breakpoint
create policy dm_write on document_members for all
  using (app_bypass() or app_is_doc_owner(document_id))
  with check (app_bypass() or app_is_doc_owner(document_id));
--> statement-breakpoint

-- ── doc_state ────────────────────────────────────────────────────────────────
alter table doc_state enable row level security;
--> statement-breakpoint
create policy ds_select on doc_state for select
  using (app_bypass() or app_is_member(document_id));
--> statement-breakpoint
create policy ds_write on doc_state for all
  using (app_bypass() or app_doc_role(document_id) in ('owner', 'editor'))
  with check (app_bypass() or app_doc_role(document_id) in ('owner', 'editor'));
--> statement-breakpoint

-- ── doc_updates ──────────────────────────────────────────────────────────────
alter table doc_updates enable row level security;
--> statement-breakpoint
create policy du_select on doc_updates for select
  using (app_bypass() or app_is_member(document_id));
--> statement-breakpoint
create policy du_write on doc_updates for all
  using (app_bypass() or app_doc_role(document_id) in ('owner', 'editor'))
  with check (app_bypass() or app_doc_role(document_id) in ('owner', 'editor'));
--> statement-breakpoint

-- ── versions ─────────────────────────────────────────────────────────────────
alter table versions enable row level security;
--> statement-breakpoint
create policy ver_select on versions for select
  using (app_bypass() or app_is_member(document_id));
--> statement-breakpoint
create policy ver_insert on versions for insert
  with check (app_bypass() or app_doc_role(document_id) in ('owner', 'editor'));
--> statement-breakpoint
create policy ver_delete on versions for delete
  using (app_bypass() or app_doc_role(document_id) = 'owner');

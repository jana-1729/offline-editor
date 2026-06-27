-- An INSERT ... RETURNING also evaluates the table's SELECT policy against the
-- new row. A freshly created document has no membership row yet (it is inserted
-- in a separate statement), so app_is_member(id) is false and the RETURNING
-- fails. Allow the owner to see their own documents by owner_id as well — this
-- both fixes create-with-returning and means owners always see their docs.
drop policy if exists documents_select on documents;
--> statement-breakpoint
create policy documents_select on documents for select
  using (
    app_bypass()
    or owner_id = app_current_user()
    or app_is_member(id)
  );

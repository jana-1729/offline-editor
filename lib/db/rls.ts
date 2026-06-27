import { sql } from "drizzle-orm";
import { db } from "./index";

/** The transaction handle drizzle hands to a `db.transaction` callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Run a callback inside a transaction with the Postgres session variable
 * `app.current_user_id` set to `userId`. All Row-Level-Security policies are
 * keyed on this value, so every query inside the callback is automatically
 * scoped to what `userId` is allowed to see. This is the single choke point
 * for tenant isolation — combined with RLS, a buggy query still cannot leak
 * another tenant's rows.
 *
 * Uses `set_config(..., true)` (transaction-local) so the value never leaks to
 * a pooled connection's next user.
 */
export async function withUser<T>(
  userId: string,
  cb: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_user_id', ${userId}, true)`,
    );
    return cb(tx);
  });
}

/**
 * Run a callback with NO user scoping but flagged as the service role, which
 * RLS policies treat as a bypass. Used by the realtime server and registration
 * where access is already authorized out-of-band.
 */
export async function asService<T>(cb: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    return cb(tx);
  });
}

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  primaryKey,
  index,
  customType,
} from "drizzle-orm/pg-core";

/**
 * Binary column type for storing Yjs document state / updates / snapshots.
 * Stored as Postgres `bytea`; surfaced to app code as `Uint8Array`.
 */
export const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value) {
    return Buffer.from(value);
  },
  fromDriver(value) {
    return new Uint8Array(value);
  },
});

export const docRole = pgEnum("doc_role", ["owner", "editor", "viewer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("Untitled document"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentMembers = pgTable(
  "document_members",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: docRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.userId] }),
    index("document_members_user_idx").on(t.userId),
  ],
);

/** Squashed, current Yjs state for a document (fast load + sync seed). */
export const docState = pgTable("doc_state", {
  documentId: uuid("document_id")
    .primaryKey()
    .references(() => documents.id, { onDelete: "cascade" }),
  snapshot: bytea("snapshot").notNull(),
  stateVector: bytea("state_vector").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only log of Yjs updates; periodically squashed into docState. */
export const docUpdates = pgTable(
  "doc_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    update: bytea("update").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("doc_updates_document_idx").on(t.documentId, t.createdAt)],
);

/** Named, user-captured version snapshots for time travel. */
export const versions = pgTable(
  "versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    snapshot: bytea("snapshot").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("versions_document_idx").on(t.documentId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentMember = typeof documentMembers.$inferSelect;
export type Version = typeof versions.$inferSelect;
export type Role = (typeof docRole.enumValues)[number];

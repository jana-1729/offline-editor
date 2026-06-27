import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const renameDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["editor", "viewer"]),
});

export const removeMemberSchema = z.object({
  userId: z.string().uuid(),
});

// Cap snapshot payload size to protect the server from oversized version blobs.
const MAX_SNAPSHOT_B64 = 8_000_000; // ~6 MB binary

export const captureVersionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  snapshot: z.string().min(1).max(MAX_SNAPSHOT_B64),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CaptureVersionInput = z.infer<typeof captureVersionSchema>;

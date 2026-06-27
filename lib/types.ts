import type { Role } from "@/lib/db/schema";

export type { Role };

export interface DocSummary {
  id: string;
  title: string;
  role: Role;
  ownerId: string;
  memberCount: number;
  updatedAt: string;
}

export interface VersionSummary {
  id: string;
  label: string;
  createdAt: string;
  authorName: string | null;
}

export interface MemberSummary {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

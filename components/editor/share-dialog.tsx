"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/role-badge";
import { initials } from "@/lib/format";
import type { MemberSummary, Role } from "@/lib/types";

export function ShareDialog({
  docId,
  open,
  onOpenChange,
}: {
  docId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<{ members: MemberSummary[] }>(`/api/documents/${docId}/members`)
      .then((d) => setMembers(d.members))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, docId]);

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { member } = await apiFetch<{ member: MemberSummary }>(
        `/api/documents/${docId}/members`,
        { method: "POST", body: JSON.stringify({ email: email.trim(), role }) },
      );
      setMembers((m) => [
        ...m.filter((x) => x.userId !== member.userId),
        member,
      ]);
      setEmail("");
      toast.success(`Added ${member.name}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(m: MemberSummary, newRole: "editor" | "viewer") {
    try {
      await apiFetch(`/api/documents/${docId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: m.email, role: newRole }),
      });
      setMembers((list) =>
        list.map((x) => (x.userId === m.userId ? { ...x, role: newRole } : x)),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function remove(m: MemberSummary) {
    try {
      await apiFetch(`/api/documents/${docId}/members`, {
        method: "DELETE",
        body: JSON.stringify({ userId: m.userId }),
      });
      setMembers((list) => list.filter((x) => x.userId !== m.userId));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Invite collaborators by email. Viewers can read; editors can edit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <select
            aria-label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button onClick={add} disabled={busy} aria-label="Add collaborator">
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            members
              .slice()
              .sort((a, b) => (a.role === "owner" ? -1 : 1))
              .map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </p>
                  </div>
                  {m.role === "owner" ? (
                    <RoleBadge role={m.role} />
                  ) : (
                    <>
                      <select
                        aria-label={`Role for ${m.name}`}
                        value={m.role}
                        onChange={(e) =>
                          changeRole(m, e.target.value as "editor" | "viewer")
                        }
                        className="rounded-md border border-input bg-background px-1.5 py-1 text-xs"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => remove(m)}
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { Role };

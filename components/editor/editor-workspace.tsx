"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, History, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { acquireDoc, releaseDoc, type DocHandle } from "@/lib/sync/doc-manager";
import { colorForId } from "@/lib/sync/colors";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./status-pill";
import { PresenceAvatars } from "./presence-avatars";
import { TiptapEditor } from "./tiptap-editor";
import { VersionTimeline } from "./version-timeline";
import { ShareDialog } from "./share-dialog";
import { RoleBadge } from "@/components/role-badge";
import type { Role, VersionSummary } from "@/lib/types";

export function EditorWorkspace({
  docId,
  initialTitle,
  role,
  user,
  initialVersions,
}: {
  docId: string;
  initialTitle: string;
  role: Role;
  user: { id: string; name: string };
  initialVersions: VersionSummary[];
}) {
  const [handle, setHandle] = useState<DocHandle | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [showHistory, setShowHistory] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const canWrite = role !== "viewer";

  useEffect(() => {
    const h = acquireDoc(docId, { id: user.id, name: user.name });
    setHandle(h);
    return () => {
      releaseDoc(docId);
    };
  }, [docId, user.id, user.name]);

  const persistTitle = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (!trimmed) return;
      try {
        await apiFetch(`/api/documents/${docId}`, {
          method: "PATCH",
          body: JSON.stringify({ title: trimmed }),
        });
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [docId],
  );

  async function saveTitle() {
    if (title.trim() === initialTitle) return;
    await persistTitle(title);
  }

  const applyTitle = useCallback(
    (t: string) => {
      setTitle(t);
      void persistTitle(t);
    },
    [persistTitle],
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-5 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={title}
          disabled={!canWrite}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Document title"
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-2xl font-bold tracking-tight outline-none transition-colors hover:bg-accent/40 focus:bg-accent/40 disabled:cursor-default disabled:hover:bg-transparent"
        />

        <div className="flex items-center gap-2">
          {handle && <StatusPill connection={handle.connection} />}
          {handle && (
            <PresenceAvatars
              awareness={handle.awareness}
              selfClientId={handle.doc.clientID}
            />
          )}
          <RoleBadge role={role} />
          {role === "owner" && (
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" /> Share
            </Button>
          )}
          <Button
            variant={showHistory ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHistory((s) => !s)}
          >
            <History className="size-4" /> History
          </Button>
        </div>
      </div>

      {!canWrite && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Eye className="size-4" /> You have view-only access. Edits are
          disabled.
        </div>
      )}

      {/* Body */}
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {handle ? (
            <TiptapEditor
              doc={handle.doc}
              awareness={handle.awareness}
              editable={canWrite}
              user={{ name: user.name, color: colorForId(user.id) }}
              onApplyTitle={applyTitle}
            />
          ) : (
            <div className="h-[60vh] animate-pulse rounded-xl border border-border/60 bg-card" />
          )}
        </div>

        <AnimatePresence>
          {showHistory && handle && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="hidden shrink-0 overflow-hidden lg:block"
            >
              <div className="w-[320px]">
                <VersionTimeline
                  docId={docId}
                  doc={handle.doc}
                  role={role}
                  initialVersions={initialVersions}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {role === "owner" && (
        <ShareDialog docId={docId} open={shareOpen} onOpenChange={setShareOpen} />
      )}
    </div>
  );
}

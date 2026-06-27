"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type * as Y from "yjs";
import { History, RotateCcw, Save, Trash2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { bytesToBase64, base64ToBytes } from "@/lib/base64";
import { encodeState, restoreToSnapshot } from "@/lib/sync/reconcile";
import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role, VersionSummary } from "@/lib/types";

export function VersionTimeline({
  docId,
  doc,
  role,
  initialVersions,
}: {
  docId: string;
  doc: Y.Doc;
  role: Role;
  initialVersions: VersionSummary[];
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const canWrite = role === "owner" || role === "editor";

  async function capture() {
    setBusy("capture");
    try {
      const snapshot = bytesToBase64(encodeState(doc));
      const { version } = await apiFetch<{ version: VersionSummary }>(
        `/api/documents/${docId}/versions`,
        { method: "POST", body: JSON.stringify({ label: label.trim() || "Snapshot", snapshot }) },
      );
      setVersions((v) => [{ ...version, authorName: "You" }, ...v]);
      setCaptureOpen(false);
      setLabel("");
      toast.success("Version captured");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restore(v: VersionSummary) {
    setBusy(v.id);
    try {
      const { snapshot } = await apiFetch<{ snapshot: string }>(
        `/api/documents/${docId}/versions/${v.id}`,
      );
      restoreToSnapshot(doc, base64ToBytes(snapshot));
      toast.success(`Restored “${v.label}”`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(v: VersionSummary) {
    setBusy(v.id);
    try {
      await apiFetch(`/api/documents/${docId}/versions/${v.id}`, {
        method: "DELETE",
      });
      setVersions((list) => list.filter((x) => x.id !== v.id));
      toast.success("Version deleted");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" /> Version history
        </h2>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setCaptureOpen(true)}>
            <Save className="size-3.5" /> Capture
          </Button>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No versions yet. Capture a snapshot to start your timeline.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-border/70 pl-4">
          <AnimatePresence initial={false}>
            {versions.map((v) => (
              <motion.li
                key={v.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="relative"
              >
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background" />
                <div className="rounded-lg border border-border/70 bg-card p-3">
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {relativeTime(v.createdAt)}
                    {v.authorName ? ` · ${v.authorName}` : ""}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={busy === v.id}
                        onClick={() => restore(v)}
                      >
                        {busy === v.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Restore
                      </Button>
                    )}
                    {role === "owner" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={busy === v.id}
                        onClick={() => remove(v)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture version</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="e.g. First draft"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && capture()}
          />
          <DialogFooter>
            <Button onClick={capture} disabled={busy === "capture"}>
              {busy === "capture" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Capture snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DocSummary } from "@/lib/types";

export function CreateDocumentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (doc: DocSummary) => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const { document } = await apiFetch<{ document: DocSummary }>(
        "/api/documents",
        {
          method: "POST",
          body: JSON.stringify({ title: title.trim() || undefined }),
        },
      );
      onOpenChange(false);
      setTitle("");
      onCreated(document);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>
            Give it a name. You can rename it any time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            autoFocus
            placeholder="Untitled document"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={create} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

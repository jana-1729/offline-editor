"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/role-badge";
import { Confetti } from "@/components/confetti";
import { CreateDocumentDialog } from "./create-document-dialog";
import { relativeTime } from "@/lib/format";
import type { DocSummary } from "@/lib/types";

export function DocumentGrid({ docs }: { docs: DocSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const isEmpty = docs.length === 0;

  function handleCreated(doc: DocSummary) {
    if (isEmpty) {
      setConfetti(true);
      toast.success("Your first document — welcome! 🎉");
      setTimeout(() => router.push(`/doc/${doc.id}`), 900);
    } else {
      router.push(`/doc/${doc.id}`);
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      toast.success("Document deleted");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      {confetti && <Confetti />}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {docs.length} {docs.length === 1 ? "document" : "documents"}
        </h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New document
        </Button>
      </div>

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center"
        >
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="size-7" />
          </div>
          <h2 className="text-lg font-semibold">No documents yet</h2>
          <p className="mb-5 mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first document. It works offline and syncs automatically
            when you&apos;re back online.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New document
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              whileHover={{ y: -3 }}
            >
              <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition-shadow hover:shadow-lg">
                <Link href={`/doc/${doc.id}`} className="block focus:outline-none">
                  <div className="mb-8 mr-6 flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </div>
                    <RoleBadge role={doc.role} />
                  </div>
                  <h3 className="line-clamp-2 font-semibold leading-snug">
                    {doc.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" /> {doc.memberCount}
                    </span>
                    <span>· {relativeTime(doc.updatedAt)}</span>
                  </div>
                </Link>

                {doc.role === "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete document"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(doc.id);
                    }}
                    className="absolute right-2 top-3.5 size-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CreateDocumentDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}

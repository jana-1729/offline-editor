"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import { FileText, Plus, Moon, Sun, LayoutDashboard } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { DocSummary } from "@/lib/types";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      apiFetch<{ documents: DocSummary[] }>("/api/documents")
        .then((d) => setDocs(d.documents))
        .catch(() => {});
    }
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      loop
    >
      <Command.Input placeholder="Search documents or run a command…" />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Actions">
          <Command.Item onSelect={() => run(() => router.push("/dashboard"))}>
            <LayoutDashboard className="size-4" /> Go to dashboard
          </Command.Item>
          <Command.Item
            onSelect={() =>
              run(async () => {
                const { document } = await apiFetch<{ document: DocSummary }>(
                  "/api/documents",
                  { method: "POST", body: JSON.stringify({}) },
                );
                router.push(`/doc/${document.id}`);
              })
            }
          >
            <Plus className="size-4" /> New document
          </Command.Item>
          <Command.Item
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            Toggle theme
          </Command.Item>
        </Command.Group>
        {docs.length > 0 && (
          <Command.Group heading="Documents">
            {docs.map((d) => (
              <Command.Item
                key={d.id}
                value={`${d.title} ${d.id}`}
                onSelect={() => run(() => router.push(`/doc/${d.id}`))}
              >
                <FileText className="size-4" /> {d.title}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

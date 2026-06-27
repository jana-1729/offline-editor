"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Plus, Search, FileText, LogOut, PanelsTopLeft } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand";
import { CreateDocumentDialog } from "@/components/dashboard/create-document-dialog";
import { AUTHOR } from "@/components/footer";
import { initials, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DocSummary } from "@/lib/types";

export function Sidebar({
  user,
  onNavigate,
}: {
  user: { name: string; email: string };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const activeId = pathname?.startsWith("/doc/")
    ? pathname.split("/")[2]
    : null;

  useEffect(() => {
    let alive = true;
    apiFetch<{ documents: DocSummary[] }>("/api/documents")
      .then((d) => alive && setDocs(d.documents))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  const filtered = useMemo(
    () =>
      docs.filter((d) =>
        d.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [docs, query],
  );

  return (
    <div className="flex h-full flex-col bg-card/40">
      <div className="flex items-center justify-between px-4 pt-4">
        <Link href="/dashboard" onClick={onNavigate}>
          <Wordmark />
        </Link>
        <ThemeToggle />
      </div>

      <div className="px-3 pt-4">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" /> New document
        </Button>
      </div>

      <div className="relative px-3 pt-3">
        <Search className="absolute left-5 top-[30px] size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents"
          className="pl-9"
          aria-label="Search documents"
        />
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {docs.length === 0 ? "No documents yet" : "No matches"}
          </p>
        ) : (
          filtered.map((d) => {
            const active = d.id === activeId;
            return (
              <Link
                key={d.id}
                href={`/doc/${d.id}`}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/80 hover:bg-accent/60",
                )}
              >
                <FileText
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{d.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {d.role} · {relativeTime(d.updatedAt)}
                  </span>
                </span>
                {active && (
                  <motion.span
                    layoutId="active-doc"
                    className="size-1.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })
        )}
      </nav>

      <div className="border-t border-border/60 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent/60">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {initials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Built by {AUTHOR.name} ·{" "}
              <a href={AUTHOR.github} target="_blank" rel="noreferrer" className="underline">
                GitHub
              </a>{" "}
              ·{" "}
              <a href={AUTHOR.linkedin} target="_blank" rel="noreferrer" className="underline">
                LinkedIn
              </a>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard")}>
              <PanelsTopLeft className="size-4" /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(doc) => {
          onNavigate?.();
          router.push(`/doc/${doc.id}`);
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "@/components/command-palette";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-[280px] shrink-0 border-r border-border/60 lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar user={user} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border/60 bg-card lg:hidden"
            >
              <Sidebar user={user} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-border/60 p-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Wordmark />
        </div>
        {drawer && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
            className="fixed right-3 top-3 z-50 lg:hidden"
          >
            <X className="size-5" />
          </Button>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}

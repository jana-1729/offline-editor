"use client";

import { motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Loader2, CircleAlert } from "lucide-react";
import { useConnectionStatus } from "@/hooks/use-sync";
import type { ConnectionState, ConnStatus } from "@/lib/sync/connection-state";
import { cn } from "@/lib/utils";

const MAP: Record<
  ConnStatus,
  { label: string; cls: string; Icon: typeof Wifi; spin?: boolean }
> = {
  online: { label: "Online", cls: "text-success bg-success/10 border-success/20", Icon: Wifi },
  syncing: {
    label: "Syncing",
    cls: "text-primary bg-primary/10 border-primary/20",
    Icon: RefreshCw,
    spin: true,
  },
  connecting: {
    label: "Connecting",
    cls: "text-warning bg-warning/10 border-warning/20",
    Icon: Loader2,
    spin: true,
  },
  offline: {
    label: "Offline",
    cls: "text-muted-foreground bg-muted border-border",
    Icon: WifiOff,
  },
  error: {
    label: "Error",
    cls: "text-destructive bg-destructive/10 border-destructive/20",
    Icon: CircleAlert,
  },
};

export function StatusPill({ connection }: { connection: ConnectionState }) {
  const status = useConnectionStatus(connection);
  const { label, cls, Icon, spin } = MAP[status];

  return (
    <motion.div
      layout
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        cls,
      )}
      title={`Realtime status: ${label}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("size-3.5", spin && "animate-spin")} />
      <motion.span
        key={label}
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: "auto" }}
        className="overflow-hidden whitespace-nowrap"
      >
        {label}
      </motion.span>
      {status === "online" && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-success" />
        </span>
      )}
    </motion.div>
  );
}

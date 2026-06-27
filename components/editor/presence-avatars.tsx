"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Awareness } from "y-protocols/awareness";
import { useAwarenessStates } from "@/hooks/use-sync";
import { initials } from "@/lib/format";

export function PresenceAvatars({
  awareness,
  selfClientId,
}: {
  awareness: Awareness;
  selfClientId: number;
}) {
  const users = useAwarenessStates(awareness, selfClientId);

  return (
    <div className="flex items-center -space-x-2" aria-label="Active collaborators">
      <AnimatePresence>
        {users.slice(0, 5).map((u) => (
          <motion.div
            key={u.clientId}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            title={u.name}
            className="flex size-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white"
            style={{ backgroundColor: u.color }}
          >
            {initials(u.name)}
          </motion.div>
        ))}
      </AnimatePresence>
      {users.length > 5 && (
        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold">
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}

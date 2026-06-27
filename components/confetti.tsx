"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#06b6d4"];

/**
 * Lightweight, dependency-free confetti burst. Render it (keyed) to fire once;
 * it cleans up visually after the animation. Respects reduced-motion via CSS.
 */
export function Confetti({ count = 80 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.sin(i * 12.9898) * 43758.5453) % 1,
        delay: ((i * 7) % 30) / 100,
        color: COLORS[i % COLORS.length],
        rotate: (i * 53) % 360,
      })),
    [count],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: `${50}vw`, y: "45vh", opacity: 1, scale: 1 }}
          animate={{
            x: `${50 + (p.x - 0.5) * 120}vw`,
            y: `${110}vh`,
            opacity: 0,
            rotate: p.rotate,
            scale: 0.6,
          }}
          transition={{ duration: 1.8 + p.delay, ease: "easeOut", delay: p.delay }}
          style={{ backgroundColor: p.color }}
          className="absolute size-2 rounded-[2px]"
        />
      ))}
    </div>
  );
}

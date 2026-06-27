"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { WifiOff, GitMerge, History, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/components/brand";

const FEATURES = [
  {
    icon: WifiOff,
    title: "Local-first",
    desc: "Open, edit and close documents with zero network blocking the UI.",
  },
  {
    icon: GitMerge,
    title: "Conflict-free sync",
    desc: "Concurrent edits merge deterministically — never lose your work.",
  },
  {
    icon: History,
    title: "Time travel",
    desc: "Snapshot any version and safely restore without corrupting others.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    desc: "Row-level security, role-based access and hardened sync payloads.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Landing() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center sm:py-28">
      <motion.span
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease }}
        className="mb-5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
      >
        Local-first · Offline-ready · Realtime
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease, delay: 0.05 }}
        className="text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl"
      >
        {BRAND.name}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease, delay: 0.1 }}
        className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl"
      >
        A collaborative document editor that keeps working when the network
        doesn&apos;t. Edit offline, sync automatically, and never lose a keystroke
        to a conflict.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease, delay: 0.15 }}
        className="mt-9 flex gap-3"
      >
        <Button asChild size="lg" className="h-11 px-6 text-base">
          <Link href="/register">Get started — free</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base">
          <Link href="/login">Sign in</Link>
        </Button>
      </motion.div>

      <div className="mt-24 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.2 + i * 0.08 }}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-border/70 bg-card/70 p-5 backdrop-blur transition-shadow hover:shadow-lg"
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

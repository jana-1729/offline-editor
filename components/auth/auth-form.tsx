"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Registration failed");
        }
      }
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Invalid email or password");
      toast.success(isRegister ? "Welcome aboard! 🎉" : "Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-sm rounded-xl border border-border/70 bg-card/80 p-8 shadow-xl backdrop-blur"
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isRegister
            ? "Start writing — online or offline."
            : "Sign in to your documents."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {isRegister && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ada Lovelace"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
          {isRegister && (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-primary hover:underline"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </motion.div>
  );
}

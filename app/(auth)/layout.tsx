import Link from "next/link";
import { Wordmark, BRAND } from "@/components/brand";
import { Footer } from "@/components/footer";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  "Works fully offline — your edits never block on the network.",
  "Real-time collaboration with conflict-free merging.",
  "Version history and safe one-click restore.",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 bg-card/40 p-10 dot-grid lg:flex">
        <Link href="/">
          <Wordmark />
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight">
            {BRAND.tagline}
          </h2>
          <ul className="mt-6 space-y-3 text-muted-foreground">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          © {BRAND.name}. Built for the House of EdTech assignment.
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center p-6">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Landing } from "@/components/landing";
import { Footer } from "@/components/footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col dot-grid">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-4">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <Landing />
      </main>
      <Footer />
    </div>
  );
}

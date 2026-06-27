import { redirect } from "next/navigation";
import { currentUser } from "@/lib/api/guard";
import { listDocumentsFor } from "@/lib/api/documents-query";
import { DocumentGrid } from "@/components/dashboard/document-grid";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const docs = await listDocumentsFor(user.id);
  const firstName = user.name.split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl font-bold tracking-tight">{firstName} 👋</h1>
        <p className="mt-1 text-muted-foreground">
          Pick up where you left off, or start something new.
        </p>
      </header>
      <DocumentGrid docs={docs} />
    </div>
  );
}

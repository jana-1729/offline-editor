import { redirect } from "next/navigation";
import { currentUser } from "@/lib/api/guard";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={{ name: user.name, email: user.email }}>
      {children}
    </AppShell>
  );
}

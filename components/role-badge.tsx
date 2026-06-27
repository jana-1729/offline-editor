import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/db/schema";

const STYLES: Record<Role, string> = {
  owner:
    "border-primary/30 bg-primary/10 text-primary",
  editor:
    "border-success/30 bg-success/10 text-success",
  viewer:
    "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", STYLES[role], className)}
    >
      {role}
    </Badge>
  );
}

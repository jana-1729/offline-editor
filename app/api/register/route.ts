import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { asService } from "@/lib/db/rls";
import { users } from "@/lib/db/schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await asService((tx) =>
    tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1),
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const [user] = await asService((tx) =>
    tx
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name }),
  );

  return NextResponse.json({ user }, { status: 201 });
}

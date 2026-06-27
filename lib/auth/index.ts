import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig } from "./config";
import { verifyPassword } from "./password";
import { loginSchema } from "@/lib/validation/auth";
import { asService } from "@/lib/db/rls";
import { users } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [user] = await asService((tx) =>
          tx.select().from(users).where(eq(users.email, email)).limit(1),
        );
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});

import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config shared by middleware and the full auth instance.
 * It must NOT import the database, bcrypt, or any Node-only module, because
 * middleware runs on the Edge runtime.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      const isProtected =
        pathname.startsWith("/dashboard") || pathname.startsWith("/doc");

      if (isProtected && !loggedIn) return false; // → redirect to signIn
      if (isAuthPage && loggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

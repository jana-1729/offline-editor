import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Edge proxy (Next.js 16 successor to middleware) uses only the base,
// db-free config so it can run on the Edge runtime.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/doc/:path*", "/login", "/register"],
};

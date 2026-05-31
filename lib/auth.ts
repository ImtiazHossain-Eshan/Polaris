import type { NextAuthOptions } from "next-auth";

// On Vercel, force the canonical https URL even if NEXTAUTH_URL was left as a
// localhost/http value — otherwise NextAuth writes a non-secure cookie that the
// (HTTPS) middleware can't read, bouncing users back to /signin after login.
const onVercel = !!process.env.VERCEL;
if (onVercel && process.env.VERCEL_URL) {
  if (!process.env.NEXTAUTH_URL || !process.env.NEXTAUTH_URL.startsWith("https://")) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}
// Use secure cookies whenever we're on HTTPS (Vercel or an https NEXTAUTH_URL).
// This keeps the cookie name (__Secure-…) consistent between the auth callback
// and the middleware's getToken, which is what makes login "stick".
const useSecureCookies =
  onVercel || (process.env.NEXTAUTH_URL?.startsWith("https://") ?? false);
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/mongodb";
import {
  getUserById,
  setUserRole,
  type Plan,
  type UserRole,
} from "@/lib/db/collections";
import { isAdminEmail } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  useSecureCookies,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ email: credentials.email.toLowerCase() });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // Auto-promote allowlisted emails to admin (and persist).
        let role = (user.role as UserRole) ?? "student";
        if (isAdminEmail(user.email) && role !== "admin") {
          role = "admin";
          await setUserRole(user._id.toString(), "admin").catch(() => {});
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
          plan: (user.plan as Plan) ?? "free",
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    signOut: "/signout",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, seed the token from the authorized user.
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: UserRole }).role ?? "student";
        token.plan = (user as { plan?: Plan }).plan ?? "free";
        token.refreshedAt = Date.now();
        return token;
      }
      // On subsequent requests, refresh role/plan from the DB at most once
      // every 5 minutes so plan upgrades (via webhook) reflect without a
      // re-login, but we don't slam MongoDB on every single page load.
      const FIVE_MINUTES = 5 * 60 * 1000;
      const lastRefresh = (token.refreshedAt as number) ?? 0;
      if (token.id && Date.now() - lastRefresh > FIVE_MINUTES) {
        const fresh = await getUserById(token.id as string).catch(() => null);
        if (fresh) {
          token.role = fresh.role ?? "student";
          token.plan = fresh.plan ?? "free";
        }
        token.refreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) ?? "student";
        session.user.plan = (token.plan as Plan) ?? "free";
      }
      return session;
    },
  },
};

import type { NextAuthOptions } from "next-auth";

// Vercel doesn't set NEXTAUTH_URL automatically — fall back to VERCEL_URL
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/mongodb";
import { getUserById, type Plan, type UserRole } from "@/lib/db/collections";

export const authOptions: NextAuthOptions = {
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

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: (user.role as UserRole) ?? "student",
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
        return token;
      }
      // On subsequent requests, refresh role/plan from the DB so upgrades
      // (applied via webhook) reflect without requiring a re-login.
      if (token.id) {
        const fresh = await getUserById(token.id as string).catch(() => null);
        if (fresh) {
          token.role = fresh.role ?? "student";
          token.plan = fresh.plan ?? "free";
        }
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

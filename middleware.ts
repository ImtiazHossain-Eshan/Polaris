import { withAuth } from "next-auth/middleware";

/**
 * Protects authenticated areas. Unauthenticated users are redirected to
 * /signin (configured via authOptions pages). Role/plan checks happen in
 * pages and API routes via lib/authz.
 */
export default withAuth({
  pages: {
    signIn: "/signin",
  },
});

export const config = {
  matcher: [
    // Only protect routes that strictly require an authenticated account.
    // /dashboard and /onboard work in guest-mode via localStorage.
    "/billing/:path*",
    "/family/:path*",
    "/monitor/:path*",
  ],
};

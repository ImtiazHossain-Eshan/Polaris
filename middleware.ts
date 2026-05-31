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
    // Strict paywall: roadmap generation is Pro-only, so these all require auth.
    "/dashboard/:path*",
    "/onboard/:path*",
    "/billing/:path*",
    "/family/:path*",
    "/monitor/:path*",
    "/account/:path*",
    "/admin/:path*",
  ],
};

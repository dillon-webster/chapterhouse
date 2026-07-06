import type { NextAuthConfig } from "next-auth";

// Edge-safe configuration shared by middleware and the full auth setup.
// IMPORTANT: must not import Node-only deps (Prisma, bcrypt) — middleware runs
// on the edge runtime. The Credentials provider is added in `auth.ts`.
export const authConfig = {
  // Trust the incoming request host so sign-in works from any origin the app is
  // actually served on (localhost on desktop, the LAN IP on a phone, the real
  // domain in prod) without pinning AUTH_URL to a single host.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Gatekeeper used by middleware to protect routes.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      // Every other matched route requires a session.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.username = user.username;
        token.isAdmin = user.isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
        session.user.username = (token.username as string | undefined) ?? "";
        session.user.isAdmin = (token.isAdmin as boolean | undefined) ?? false;
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts
} satisfies NextAuthConfig;

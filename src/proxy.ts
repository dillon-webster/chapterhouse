import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-safe auth proxy (Next 16's renamed "middleware" convention).
// No Prisma/bcrypt here — those run in the Node-only Credentials provider.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  // API routes (including /api/auth and /api/signup) handle their own access.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|epub)$).*)",
  ],
};

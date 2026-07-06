import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, normalizeTheme, type ThemeId } from "@/lib/themes";

// Resolve the signed-in user's saved color preset for server rendering. Read in
// the root layout so <html data-theme> is set before paint (no theme flash).
// Unauthenticated requests (login/signup) fall back to the default.
export async function getUserTheme(): Promise<ThemeId> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return DEFAULT_THEME;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { theme: true },
  });
  return normalizeTheme(user?.theme);
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME, normalizeTheme, type ThemeId } from "@/lib/themes";
import { DEFAULT_FONT, normalizeFont, type FontId } from "@/lib/fonts";

// Resolve the signed-in user's saved appearance (color preset + UI font) for
// server rendering. Read in the root layout so <html data-theme data-font> is
// set before paint (no theme/font flash). Unauthenticated requests
// (login/signup) fall back to the defaults.
export async function getUserAppearance(): Promise<{
  theme: ThemeId;
  font: FontId;
}> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { theme: DEFAULT_THEME, font: DEFAULT_FONT };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { theme: true, font: true },
  });
  return {
    theme: normalizeTheme(user?.theme),
    font: normalizeFont(user?.font),
  };
}

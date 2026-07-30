import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { accountSchema } from "../src/lib/accountSchema";

// Account recovery for self-hosted instances. There's no email-based reset
// flow (that would mean requiring SMTP config), but whoever runs the box has
// shell access, so recovery lives here instead:
//
//   npx tsx prisma/reset-password.ts --list
//   npx tsx prisma/reset-password.ts <username-or-email> <new-password>

const USAGE = `Usage:
  npm run db:users                                  List accounts
  npm run db:reset-password -- <identifier> <new-password>

<identifier> is a username or an email address, same as the sign-in field.`;

async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      username: true,
      email: true,
      displayName: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  if (users.length === 0) {
    console.log("No accounts yet. Visit the app to run first-time setup.");
    return;
  }

  console.log(`${users.length} account(s):\n`);
  for (const u of users) {
    const admin = u.isAdmin ? " [admin]" : "";
    const created = u.createdAt.toISOString().slice(0, 10);
    console.log(`  ${u.username} <${u.email}> — ${u.displayName}${admin} (created ${created})`);
  }
}

async function resetPassword(identifier: string, password: string) {
  // Same rule as first-run setup and invite signup.
  const parsed = accountSchema.shape.password.safeParse(password);
  if (!parsed.success) {
    console.error(`✘ ${parsed.error.issues[0].message}`);
    process.exit(1);
  }

  // Resolve the identifier the way sign-in does (see src/auth.ts).
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
    },
  });
  if (!user) {
    console.error(`✘ No account matches "${identifier}". Run \`npm run db:users\` to list accounts.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`✔ Password reset for ${user.username} <${user.email}>. Sign in with the new password.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--list" || args[0] === "-l") {
    await listUsers();
    return;
  }

  if (args.length !== 2) {
    console.error(USAGE);
    process.exit(1);
  }

  await resetPassword(args[0], args[1]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

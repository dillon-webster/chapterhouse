import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME ?? "Admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const inviteCode = process.env.SEED_INVITE_CODE ?? "FIRST-CLUB-INVITE";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { username },
    update: { isAdmin: true },
    create: { username, email, displayName, passwordHash, isAdmin: true },
  });
  console.log(`✔ Admin user ready: ${admin.username} <${admin.email}>`);

  const invite = await prisma.inviteCode.upsert({
    where: { code: inviteCode },
    update: { isActive: true },
    create: { code: inviteCode, isActive: true },
  });
  console.log(`✔ Active invite code: ${invite.code}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

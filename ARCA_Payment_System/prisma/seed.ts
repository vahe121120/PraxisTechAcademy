/* eslint-disable no-console -- CLI seed script; stdout feedback is the point, not application logging. */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  if (!email || !password) {
    console.warn(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin bootstrap. ' +
        'Set both in .env if you need this seed to create the first admin account.',
    );
    return;
  }

  if (password.length < 12) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be at least 12 characters — refusing to seed a weak admin password.',
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    console.log(`Admin account already exists for ${normalizedEmail} — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Created initial admin account: ${admin.email} (${admin.id})`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

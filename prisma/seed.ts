// Bootstraps the initial administrator account. Never touches reservations, guests,
// rooms or any other data — this script only ever creates or (with explicit opt-in)
// resets a single admin login.
//
// Safe-by-default: if ANY user already exists, it does nothing and exits cleanly.
// This is what makes it safe to keep around after go-live — an accidental re-run
// (e.g. someone re-running the seed command, or a misconfigured deploy hook) can
// never silently overwrite the real admin's password or recreate the account.
//
// First run (creates the admin):
//   ADMIN_USERNAME=admin ADMIN_PASSWORD='...' ADMIN_NAME="Administrator" npx tsx prisma/seed.ts
//
// Explicit password reset for an existing account (only runs if you pass this flag):
//   ADMIN_RESET=true ADMIN_USERNAME=admin ADMIN_PASSWORD='...' npx tsx prisma/seed.ts
//
// ADMIN_EMAIL is optional. If ADMIN_PASSWORD is omitted, a random password is generated
// and printed once — save it immediately, it cannot be recovered afterwards.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  let pw = "";
  for (let i = 0; i < 16; i++) pw += chars[crypto.randomInt(chars.length)];
  return pw;
}

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const name = process.env.ADMIN_NAME || "Administrator";
  const email = process.env.ADMIN_EMAIL || undefined;
  const explicitReset = process.env.ADMIN_RESET === "true";

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing && !explicitReset) {
    console.log(`User "${username}" already exists (id ${existing.id}) — nothing to do.`);
    console.log("Pass ADMIN_RESET=true if you specifically intend to reset this account's password.");
    return;
  }

  if (!existing) {
    const anyUserExists = (await prisma.user.count()) > 0;
    if (anyUserExists) {
      console.log(`Other users already exist but "${username}" does not. Refusing to auto-create a second`);
      console.log("admin under a different username without explicit confirmation. Set ADMIN_USERNAME to");
      console.log("match an existing account if you meant to reset it, or create new users from Settings > Users.");
      return;
    }
  }

  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const generated = !process.env.ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    create: { username, name, email, passwordHash, role: "ADMIN", language: "EN" },
    update: { passwordHash, active: true, failedLoginAttempts: 0, lockedUntil: null },
  });

  console.log(`Admin user ready: ${user.username} (${user.id})`);
  if (generated) {
    console.log(`Generated temporary password: ${password}`);
    console.log("Save this now and change it after your first login — it will not be shown again.");
  }
}

main()
  .catch((err) => {
    console.error("Failed to bootstrap admin user:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

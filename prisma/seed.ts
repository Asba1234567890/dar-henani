// Bootstraps the initial administrator account. Safe to run multiple times (idempotent
// upsert by username) and never touches reservations, guests, rooms or any other data.
//
// Usage:
//   ADMIN_USERNAME=admin ADMIN_PASSWORD='...' ADMIN_NAME="Administrator" npx tsx prisma/seed.ts
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
  const password = process.env.ADMIN_PASSWORD || generatePassword();
  const generated = !process.env.ADMIN_PASSWORD;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    create: { username, name, email, passwordHash, role: "ADMIN", language: "EN" },
    update: { name, email, passwordHash, role: "ADMIN", active: true, failedLoginAttempts: 0, lockedUntil: null },
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

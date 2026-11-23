import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password minimal 8 karakter.");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") return false;
  if (!/^\$2[aby]\$\d{2}\$/.test(storedHash)) return false;
  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}

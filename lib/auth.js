import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { query, queryOne } from "./db";
import { SESSION_COOKIE, SESSION_DAYS } from "./constants";

/** Buat sesi baru di database dan simpan token di cookie httpOnly. */
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expires]
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token = $1", [token]);
  store.delete(SESSION_COOKIE);
}

/** User yang sedang login (atau null). Supplier yang belum Approved dianggap tidak login. */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.company_name, u.phone, u.address
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  if (!user) return null;
  if (user.role === "supplier" && user.status !== "Approved") return null;
  return user;
}

/** Wajib login; jika `roles` diisi, user wajib memiliki salah satu role tersebut. */
export async function requireUser(roles) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) {
    redirect(`/dashboard?err=${encodeURIComponent("Anda tidak memiliki akses ke halaman tersebut.")}`);
  }
  return user;
}

/**
 * Versi untuk Server Action: tidak redirect, melempar error agar bisa dikembalikan
 * sebagai pesan ke form.
 */
export async function assertRole(roles) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sesi berakhir, silakan login kembali.");
  if (roles && !roles.includes(user.role)) throw new AuthError("Anda tidak memiliki akses untuk aksi ini.");
  return user;
}

export class AuthError extends Error {}

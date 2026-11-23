"use server";

import { hashPassword, verifyPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { dbErrorMessage, fail, isEmail, str, withMsg } from "@/lib/validation";

export async function loginAction(prevState, formData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };

  const fieldErrors = {};
  if (!email) fieldErrors.email = "Email wajib diisi.";
  else if (!isEmail(email)) fieldErrors.email = "Format email tidak valid.";
  if (!password) fieldErrors.password = "Password wajib diisi.";
  if (Object.keys(fieldErrors).length) return fail("Periksa kembali isian Anda.", fieldErrors, values);

  const user = await queryOne(
    "SELECT id, password_hash, role, status FROM users WHERE LOWER(email) = $1",
    [email]
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return fail("Email atau password salah.", {}, values);
  }

  if (user.role === "supplier" && user.status === "Pending") {
    return { ...fail(null, {}, values), notice: "pending" };
  }
  if (user.role === "supplier" && user.status === "Rejected") {
    return { ...fail(null, {}, values), notice: "rejected" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(prevState, formData) {
  const values = {
    name: str(formData, "name"),
    company_name: str(formData, "company_name"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone"),
    address: str(formData, "address"),
  };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const e = {};
  if (values.name.length < 3) e.name = "Nama minimal 3 karakter.";
  if (values.name.length > 100) e.name = "Nama maksimal 100 karakter.";
  if (values.company_name.length < 2) e.company_name = "Nama perusahaan wajib diisi.";
  if (!isEmail(values.email)) e.email = "Format email tidak valid.";
  if (!/^[0-9+\-\s]{8,20}$/.test(values.phone)) e.phone = "Nomor telepon 8–20 digit (angka, +, -).";
  if (values.address.length < 5) e.address = "Alamat wajib diisi (min. 5 karakter).";
  if (password.length < 8) e.password = "Password minimal 8 karakter.";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) e.password = "Password harus mengandung huruf dan angka.";
  if (confirm !== password) e.confirm_password = "Konfirmasi password tidak sama.";
  if (Object.keys(e).length) return fail("Periksa kembali isian Anda.", e, values);

  const exists = await queryOne("SELECT 1 FROM users WHERE LOWER(email) = $1", [values.email]);
  if (exists) return fail("Periksa kembali isian Anda.", { email: "Email sudah terdaftar." }, values);

  try {
    const hash = await hashPassword(password);
    await query(
      `INSERT INTO users (name, email, password_hash, role, status, company_name, phone, address)
       VALUES ($1, $2, $3, 'supplier', 'Pending', $4, $5, $6)`,
      [values.name, values.email, hash, values.company_name, values.phone, values.address]
    );
  } catch (err) {
    return fail(dbErrorMessage(err), {}, values);
  }

  redirect(withMsg("/login", "Registrasi berhasil! Akun Anda menunggu verifikasi Admin."));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

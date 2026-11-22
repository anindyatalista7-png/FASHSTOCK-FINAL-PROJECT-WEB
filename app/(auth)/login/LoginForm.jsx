"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "@/actions/auth";
import SubmitButton from "@/components/client/SubmitButton";
import Icon from "@/components/Icon";
import Image from "next/image";

export default function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fe = state?.fieldErrors ?? {};

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <Image src="/logo.svg" alt="Logo FashStock" width={48} height={48} className="rounded-xl" />
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">Masuk</h2>
      <p className="mt-2 text-sm text-stone-500">Gunakan akun Admin, Manager, Staff Gudang, atau Supplier.</p>

      {state?.notice === "pending" && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Akun sedang ditinjau</p>
            <p className="mt-0.5 text-amber-800">Pendaftaran Anda sebagai Supplier sedang ditinjau oleh Admin. Anda dapat masuk setelah akun disetujui.</p>
          </div>
        </div>
      )}
      {state?.notice === "rejected" && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Pendaftaran ditolak</p>
            <p className="mt-0.5 text-red-800">Maaf, pendaftaran akun Supplier Anda ditolak oleh Admin. Hubungi pengelola gudang untuk informasi lebih lanjut.</p>
          </div>
        </div>
      )}
      {state?.error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <form action={action} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className={`input ${fe.email ? "input-error" : ""}`}
            placeholder="nama@perusahaan.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {fe.email && <p className="mt-1 text-xs font-medium text-red-600">{fe.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" className={`input ${fe.password ? "input-error" : ""}`}
            placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          {fe.password && <p className="mt-1 text-xs font-medium text-red-600">{fe.password}</p>}
        </div>
        <SubmitButton className="btn btn-primary w-full py-3" pendingText="Memeriksa...">Masuk</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Supplier baru?{" "}
        <Link href="/register" className="font-bold text-ink underline decoration-brand-400 decoration-2 underline-offset-4">Daftar sebagai Supplier</Link>
      </p>

    </div>
  );
}

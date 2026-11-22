"use client";
import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import SubmitButton from "@/components/client/SubmitButton";

function F({ name, label, type = "text", state, placeholder, autoComplete, className = "" }) {
  const err = state?.fieldErrors?.[name];
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>{label} <span className="text-red-500">*</span></label>
      {type === "textarea" ? (
        <textarea id={name} name={name} rows={2} defaultValue={state?.values?.[name] ?? ""} placeholder={placeholder}
          className={`input ${err ? "input-error" : ""}`} />
      ) : (
        <input id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder}
          defaultValue={type === "password" ? undefined : state?.values?.[name] ?? ""} className={`input ${err ? "input-error" : ""}`} />
      )}
      {err && <p className="mt-1 text-xs font-medium text-red-600">{err}</p>}
    </div>
  );
}

export default function RegisterForm() {
  const [state, action] = useActionState(registerAction, null);
  return (
    <div>
      <h2 className="text-3xl font-extrabold tracking-tight text-ink">Daftar Supplier</h2>
      <p className="mt-2 text-sm text-stone-500">
        Akun baru berstatus <b className="text-amber-700">Pending</b> dan dapat digunakan setelah disetujui Admin.
      </p>
      {state?.error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      )}
      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate key={state?.ts}>
        <F name="name" label="Nama PIC" state={state} placeholder="Nama lengkap" autoComplete="name" />
        <F name="company_name" label="Nama Perusahaan" state={state} placeholder="PT / CV ..." autoComplete="organization" />
        <F name="email" label="Email" type="email" state={state} placeholder="nama@perusahaan.com" autoComplete="email" />
        <F name="phone" label="No. Telepon" state={state} placeholder="08xxxxxxxxxx" autoComplete="tel" />
        <F name="address" label="Alamat" type="textarea" state={state} placeholder="Alamat perusahaan" className="sm:col-span-2" />
        <F name="password" label="Password" type="password" state={state} autoComplete="new-password" placeholder="Min. 8 karakter" />
        <F name="confirm_password" label="Konfirmasi Password" type="password" state={state} autoComplete="new-password" />
        <SubmitButton className="btn btn-primary py-3 sm:col-span-2" pendingText="Mendaftarkan...">Daftar</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-bold text-ink underline decoration-brand-400 decoration-2 underline-offset-4">Masuk</Link>
      </p>
    </div>
  );
}

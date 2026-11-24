import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm text-stone-500">404</p>
      <h1 className="text-2xl font-bold text-ink">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-stone-500">Data yang Anda cari mungkin sudah dihapus atau tautannya salah.</p>
      <Link href="/dashboard" className="btn btn-primary">Kembali ke Dashboard</Link>
    </div>
  );
}

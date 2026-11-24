"use client";

export default function Error({ error, reset }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <p className="font-mono text-xs text-stone-500">ERROR</p>
      <h2 className="mt-2 text-xl font-bold text-ink">Terjadi kesalahan</h2>
      <p className="mt-2 text-sm text-stone-500">
        {error?.message?.includes("ECONNREFUSED")
          ? "Tidak dapat terhubung ke database PostgreSQL. Periksa DATABASE_URL di .env.local."
          : "Halaman gagal dimuat. Silakan coba lagi."}
      </p>
      <button onClick={() => reset()} className="btn btn-primary mt-6">Coba lagi</button>
    </div>
  );
}

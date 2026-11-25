# FashStock — Sistem Manajemen Gudang Fashion

Next.js 15, React 19, Tailwind CSS v4, PostgreSQL, `pg`, dan `bcryptjs`.

## Persiapan

1. Backup database PostgreSQL lama di pgAdmin terlebih dahulu.
2. Buat database **baru dan kosong** bernama `fashstock` di pgAdmin.
3. Jalankan `database/SETUP-FASHSTOCK.sql` melalui Query Tool database `fashstock`.
4. File `.env.local` **sudah disertakan** sebagai template. Ganti `GANTI_PASSWORD_POSTGRES` dengan password PostgreSQL di komputermu. Jangan commit `.env.local`.
5. Jalankan `npm install`, lalu `npm run dev`.
6. Buka `http://localhost:3000/login`.

**Jangan jalankan SQL ini pada `fashstock_db` yang berisi data lama.** Struktur `users.id_user` dari database sebelumnya tidak kompatibel dengan aplikasi ini yang menggunakan `users.id`. SQL menolak berjalan jika tabel utama sudah ada dan tidak melakukan DROP.

## Akun uji

Lihat `AKUN-DEMO.md` untuk email dan password awal. Semua password seed disimpan sebagai hash bcrypt yang telah diverifikasi terhadap password aslinya. Supplier baru mendaftar melalui `/register` dan berstatus Pending.

## Logo

Halaman login menggunakan `public/logo.svg`. ZIP yang diterima tidak memuat file logo final milikmu, sehingga file ini sementara menggunakan ikon FashStock bergaya burgundy. Untuk menggunakan logo aslimu, ganti `public/logo.svg` dengan logo SVG milikmu atau sesuaikan path di `app/(auth)/layout.js` dan `app/(auth)/login/LoginForm.jsx`.

## Fitur

Produk, kategori, transaksi IN/OUT, persetujuan transaksi, restock, verifikasi supplier, barcode/QR, ekspor, dan dashboard berbasis peran. Kode sumber telah diperiksa konsistensi strukturnya, tetapi pengujian end-to-end dengan PostgreSQL lokal belum dilakukan.

## Catatan keamanan

`.env.local` tidak boleh diunggah ke GitHub. Ganti seluruh password demo sebelum deployment. Akun internal dibuat melalui SQL; Supplier mendaftar lewat formulir dan hanya dapat mengakses dashboard setelah Approved.

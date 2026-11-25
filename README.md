<div align="center">
  <img src="public/logo.svg" alt="Logo FashStock" width="180" />
  <h1>FashStock — Fashion Warehouse Management System</h1>
  <strong>Organized Inventory, Seamless Warehouse Operations</strong>
  <p><em>Kelola persediaan fashion dengan lebih terstruktur, efisien, dan profesional.</em></p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/JavaScript-JSX-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Project-Warehouse-713C49?style=for-the-badge" alt="Warehouse Project" />
  </p>
</div>

---

## 🧭 Navigasi

- [Tentang FashStock](#-tentang-fashstock)
- [Fitur utama](#-fitur-utama)
- [Alur operasional](#-alur-operasional)
- [Hak akses pengguna](#-hak-akses-pengguna)
- [Teknologi](#-teknologi)
- [Database dan ERD](#-database-dan-erd)
- [Struktur direktori](#-struktur-direktori)
- [Instalasi](#-instalasi)
- [Akun demo](#-akun-demo)
- [Skenario pengujian](#-skenario-pengujian)
- [Keamanan](#-keamanan)

## 🌷 Tentang FashStock

**FashStock** merupakan sistem informasi manajemen gudang fashion berbasis web yang membantu pengelolaan persediaan, pengadaan barang, pemasok, dan transaksi keluar masuk barang dalam satu sistem terintegrasi.

Nama FashStock berasal dari gabungan **Fashion** dan **Stock**, yang menggambarkan fokus sistem pada pengelolaan stok produk fashion. Berbeda dari toko online, FashStock berfokus pada operasional internal gudang, bukan penjualan langsung kepada konsumen.

Identitas visual menggunakan warna **burgundy**, **dusty pink**, dan warna netral. Burgundy memberikan kesan profesional dan tegas, dusty pink mencerminkan karakter industri fashion, sedangkan warna netral mendukung keterbacaan informasi.

## ✨ Fitur Utama

### 1. Dashboard berbasis peran

Dashboard menyajikan informasi operasional sesuai hak akses pengguna, seperti ringkasan produk, stok kritis, nilai inventori, transaksi, dan restock order.

### 2. Manajemen produk dan kategori

- Pengelolaan data produk, SKU unik, deskripsi, harga beli, harga jual, satuan, dan batas stok.
- Pengelompokan produk ke kategori Atasan, Bawahan, Outerwear, Dress, Tas, dan Aksesori.
- Pencarian, filter, pengurutan, serta tampilan detail produk.
- Barcode dan QR sebagai identitas produk serta pencetakan label. Fitur pemindaian kamera tidak termasuk dalam versi revisi.

### 3. Pemantauan persediaan

| Status | Kondisi |
|---|---|
| Out of Stock | Stok = 0 |
| Severe | Stok lebih dari 0 hingga batas minimum |
| Low | Stok di atas minimum hingga batas low |
| Normal | Stok di atas batas low |

Informasi ini membantu menentukan kebutuhan pengadaan sebelum persediaan habis.

### 4. Autentikasi dan verifikasi supplier

- Login untuk Admin, Warehouse Manager, Staff Gudang, dan Supplier.
- Registrasi mandiri hanya untuk Supplier dengan status awal Pending.
- Admin memverifikasi akun Pending menjadi Approved atau Rejected; kedua keputusan tersebut bersifat final.
- Supplier yang telah disetujui dapat mengakses dashboard dan pesanan miliknya.
- Identitas perusahaan supplier tersimpan bersama akun pada tabel `users`.

### 5. Restock dan Purchase Order (PO)

- Manager membuat PO dengan nomor otomatis, supplier, tanggal order, estimasi kedatangan, daftar produk, kuantitas, dan catatan.
- Supplier mengonfirmasi atau menolak PO dengan alasan penolakan.
- Sistem mencatat status pengiriman dan riwayat perubahan status.
- Dokumentasi foto kedatangan dan laporan inspeksi mendukung pemeriksaan barang.
- Manager dapat memberikan rating dan feedback setelah PO Received.

### 6. Inspeksi dan transaksi barang masuk (IN)

Staff melakukan pemeriksaan jumlah dan kondisi barang berdasarkan PO. Hasil pemeriksaan menjadi dasar penerimaan atau pengembalian. Transaksi IN terkait dengan PO agar produk dan jumlah barang dapat ditelusuri. Stok bertambah setelah transaksi penerimaan disetujui Manager, bukan ketika PO dibuat.

### 7. Transaksi barang keluar (OUT)

Staff mencatat barang keluar, tujuan pengiriman, produk, jumlah, dan catatan. Manager meninjau permohonan dan memberikan keputusan. Barang yang disetujui dipersiapkan untuk pengiriman; stok berkurang saat status Shipped. Penolakan harus disertai alasan.

### 8. Riwayat, filter, dan ekspor

- Riwayat transaksi dan perubahan status PO.
- Filter otomatis tanpa tombol Terapkan pada halaman yang telah direvisi.
- Pengurutan berdasarkan nama, stok, atau tanggal sesuai modul.
- Ekspor data sesuai hak akses pengguna.
- Modal konfirmasi khusus untuk tindakan yang memerlukan konfirmasi.

## 🔄 Alur Operasional

### Restock dan penerimaan barang

```mermaid
flowchart TD
 A[Manager membuat PO] --> B[Pending]
 B --> C[Confirmed]
 B --> D[Rejected]
 C --> E[In Transit]
 E --> F[Inspecting]
 F --> G[Staff melaporkan inspeksi]
 G --> H{Hasil pemeriksaan}
 H -->|Lolos| I[Transaksi IN]
 I --> J[Manager menyetujui penerimaan]
 J --> K[Received - stok bertambah]
 H -->|Tidak lolos| L[Returned - stok tidak bertambah]
```

### Barang keluar

```mermaid
flowchart TD
 A[Staff membuat transaksi OUT] --> B[Pending]
 B --> C[Approved]
 B --> D[Rejected - alasan wajib]
 C --> E[Staff menyiapkan barang]
 E --> F[Shipped - stok berkurang]
```

## 👥 Hak Akses Pengguna

| Role | Tanggung jawab utama |
|---|---|
| Admin | Memantau inventori dan transaksi, mengelola produk dan kategori, memverifikasi supplier. |
| Warehouse Manager | Mengelola produk dan kategori, membuat PO, memantau pengiriman, meninjau inspeksi dan menyetujui atau menolak transaksi. |
| Staff Gudang | Melihat produk, memeriksa barang, membuat laporan inspeksi, mencatat transaksi dan memproses pengiriman. |
| Supplier | Registrasi, melihat PO miliknya, mengonfirmasi atau menolak pesanan, memperbarui pengiriman dan mengunggah dokumentasi kedatangan. |

Akun internal disiapkan melalui seed database; registrasi publik dikhususkan untuk Supplier.

## 🛠️ Teknologi

| Bagian | Teknologi | Fungsi |
|---|---|---|
| Framework | Next.js 15 App Router | Routing, Server Components, Server Actions, Route Handlers |
| Antarmuka | React 19 dan JavaScript JSX | Komponen dan interaksi pengguna |
| Styling | Tailwind CSS v4 | Tampilan responsif |
| Database | PostgreSQL | Penyimpanan data relasional |
| Driver | node-postgres (`pg`) | Koneksi dan query SQL |
| Password | bcryptjs | Hash dan verifikasi password |
| QR | qrcode | Pembuatan QR produk |
| Administrasi database | pgAdmin 4 | Pengelolaan dan pemeriksaan database |

## 🗃️ Database dan ERD

Database bernama `fashstock` menggunakan schema aktif `fashstock_web` dengan sembilan tabel berikut.

| Tabel | Fungsi |
|---|---|
| users | Akun seluruh role, termasuk supplier dan perusahaan |
| sessions | Sesi autentikasi |
| categories | Kategori fashion |
| products | Produk dan informasi persediaan |
| restock_orders | Data utama PO dan inspeksi |
| restock_order_items | Detail produk dalam PO |
| restock_status_logs | Riwayat perubahan status PO |
| transactions | Data utama transaksi IN dan OUT |
| transaction_items | Detail produk transaksi |

```mermaid
erDiagram
 USERS ||--o{ SESSIONS : memiliki
 USERS ||--o{ RESTOCK_ORDERS : terkait
 USERS ||--o{ TRANSACTIONS : terkait
 USERS ||--o{ RESTOCK_STATUS_LOGS : mencatat
 CATEGORIES ||--o{ PRODUCTS : mengelompokkan
 RESTOCK_ORDERS ||--o{ RESTOCK_ORDER_ITEMS : memuat
 PRODUCTS ||--o{ RESTOCK_ORDER_ITEMS : dipesan
 RESTOCK_ORDERS ||--o{ RESTOCK_STATUS_LOGS : memiliki
 RESTOCK_ORDERS o|--o{ TRANSACTIONS : terkait
 TRANSACTIONS ||--o{ TRANSACTION_ITEMS : memuat
 PRODUCTS ||--o{ TRANSACTION_ITEMS : dicatat
```

Supplier bukan tabel akun terpisah, melainkan pengguna dengan `role = 'supplier'`. ERD dibuat dari schema aktif saja agar tabel lama pada schema `public` tidak ikut tampil.

```sql
SELECT id, name, company_name, email, role, status
FROM fashstock_web.users
ORDER BY id;
```

## 📂 Struktur Direktori

```text
FashStock/
├── actions/                 # Server Actions
│   ├── auth.js
│   ├── categories.js
│   ├── products.js
│   ├── restock.js
│   ├── suppliers.js
│   └── transactions.js
├── app/
│   ├── (auth)/              # Login dan registrasi
│   ├── (main)/              # Dashboard dan modul operasional
│   │   ├── dashboard/
│   │   ├── categories/
│   │   ├── products/
│   │   ├── restock/
│   │   ├── suppliers/
│   │   ├── transactions/
│   │   ├── history/
│   │   └── export/
│   ├── api/                # Gambar, barcode, QR, restock, ekspor
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── client/             # Form dan komponen interaktif
│   ├── SupplierDecision.jsx
│   └── ui.jsx
├── database/
│   ├── SETUP-FASHSTOCK.sql
│   ├── fashstock.sql
│   ├── MIGRASI-ALUR-PJ.sql
│   ├── MIGRASI-FINAL-PJ-INSPEKSI.sql
│   ├── ERD-FASHSTOCK.md
│   └── cek_struktur.sql
├── lib/                    # Database, autentikasi, validasi, hak akses
├── public/
│   └── logo.svg
├── .env.example
├── .gitignore
├── middleware.js
├── package.json
└── README.md
```

## ⚙️ Instalasi

### 1. Clone repository

```bash
git clone https://github.com/anindyatalista7-png/FASHSTOCK-FINAL-PROJECT-WEB.git
cd FASHSTOCK-FINAL-PROJECT-WEB
npm install
```

Pastikan Node.js, npm, PostgreSQL dan pgAdmin telah terpasang.

### 2. Siapkan database

1. Buat database kosong bernama `fashstock` melalui pgAdmin.
2. Buka Query Tool pada database tersebut.
3. Buka `database/SETUP-FASHSTOCK.sql` dan jalankan dengan F5.
4. Periksa schema `fashstock_web` dan tabelnya.

Untuk database yang sudah berisi data, lakukan backup dan audit terlebih dahulu. Jangan menjalankan ulang setup atau menghapus schema lama tanpa memastikan dependensi dan data yang dibutuhkan.

### 3. Konfigurasi environment

Salin `.env.example` menjadi `.env.local` pada root project.

```env
DATABASE_URL=postgresql://postgres:GANTI_PASSWORD_POSTGRES@localhost:5432/fashstock
```

Ganti placeholder dengan password PostgreSQL lokal. Gunakan URL encoding apabila password mengandung karakter khusus. Jangan unggah `.env.local` ke GitHub.

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000/login](http://localhost:3000/login).

Untuk memeriksa build produksi:

```bash
npm run build
npm run start
```

## 🔑 Akun Demo

Akun berikut merupakan identitas data seed untuk pengujian lokal. Password demo tersedia pada `AKUN-DEMO.md` dalam paket proyek; jangan gunakan password demo pada deployment publik.

| Role | Nama | Email | Perusahaan | Status |
|---|---|---|---|---|
| Admin | Admin Utama | adminfashstock@gmail.com | — | Approved |
| Manager | Budi Manager | managerfashstock@gmail.com | — | Approved |
| Staff | Sari Staff | stafffashstock@gmail.com | — | Approved |
| Staff | Andi Staff | staff2@gmail.com | — | Approved |
| Supplier | Rudi Hartono | supplier@gmail.com | PT Sumber Makmur | Approved |
| Supplier | Linda Wijaya | supplier2@gmail.com | CV Cahaya Abadi | Approved |
| Supplier | Hendra Saputra | pending@gmail.com | UD Maju Jaya | Pending |
| Supplier | Rina Kartika | pending2@gmail.com | PT Nusantara Logistik | Pending |
| Supplier | Joko Susilo | rejected@gmail.com | CV Asal Jadi | Rejected |

Akun tambahan hasil registrasi lokal dapat berbeda dari data seed. Password pada database disimpan dalam bentuk hash bcrypt, bukan teks asli.

## 🧪 Skenario Pengujian

**Production build: berhasil (25 November 2026).** Next.js 15.5.29 menyelesaikan linting, validasi tipe, pengumpulan data halaman, generasi halaman (21/21), build traces, dan optimasi akhir tanpa error berdasarkan output terminal lokal. Pengujian fungsional end-to-end tetap perlu dikonfirmasi secara terpisah.

| No. | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Login dengan empat role | Dashboard sesuai role |
| 2 | Registrasi supplier baru | Akun berstatus Pending |
| 3 | Admin menyetujui supplier | Supplier dapat login |
| 4 | Supplier Pending atau Rejected login | Akses dashboard ditolak |
| 5 | Tambah produk dengan SKU duplikat | Sistem menolak duplikasi |
| 6 | Hapus kategori yang masih memiliki produk | Sistem menolak penghapusan |
| 7 | Filter dan urutkan produk | Daftar diperbarui sesuai pilihan |
| 8 | Buat PO dengan tanggal kedatangan sebelum tanggal order | Validasi tampil dan isian sebelumnya tetap tersedia |
| 9 | Supplier mengonfirmasi PO | Status Confirmed, stok belum berubah |
| 10 | Supplier menolak PO | Alasan tercatat, stok tetap |
| 11 | Staff melaporkan inspeksi | Hasil pemeriksaan tercatat |
| 12 | Manager menyetujui IN | Stok bertambah dan PO Received |
| 13 | Barang tidak lolos inspeksi | Pengembalian tercatat tanpa penambahan stok |
| 14 | OUT melebihi stok tersedia | Transaksi ditolak |
| 15 | Manager menyetujui OUT | Status Approved, stok belum berkurang |
| 16 | Staff menandai OUT Shipped | Stok berkurang sesuai kuantitas |
| 17 | Pengguna membuka modul di luar hak akses | Server menolak akses |
| 18 | Ekspor data | Data sesuai modul dan role |

Tabel ini merupakan rencana pengujian, bukan laporan hasil pengujian end-to-end.

## 🔒 Keamanan

- Password disimpan menggunakan bcryptjs.
- Query SQL menggunakan parameter untuk input pengguna.
- Hak akses dan validasi diperiksa pada sisi server.
- Operasi perubahan stok menggunakan transaksi PostgreSQL untuk menjaga konsistensi data.
- Jangan commit `.env.local`, kredensial PostgreSQL, backup database pribadi, atau token sesi.
- Ganti kredensial demo sebelum deployment.

---

<div align="center">
  <strong>FashStock</strong>
  <p>Individual Project 6 — Manajemen Gudang</p>
  <sub>Praktikum Pemrograman Web 2026 • Sistem Informasi • Universitas Hasanuddin</sub>
</div>

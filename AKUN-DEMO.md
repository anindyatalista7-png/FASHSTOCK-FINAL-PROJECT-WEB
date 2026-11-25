# Akun Pengujian FashStock

| Role | Email | Password |
|---|---|---|
| Admin | `adminfashstock@gmail.com` | `FashStockAdmin@2026!` |
| Manager | `managerfashstock@gmail.com` | `FashStockManager@2026!` |
| Staff | `stafffashstock@gmail.com` | `FashStockStaff@2026!` |
| Supplier | `supplier@gmail.com` | `FashStockSupplier@2026!` |

Password seed di SETUP-FASHSTOCK.sql menggunakan bcryptjs yang diverifikasi.

## Supplier (data seed)

| Perusahaan | Nama | Email | Status awal |
|---|---|---|---|
| PT Sumber Makmur | Rudi Hartono | supplier@gmail.com | Approved |
| CV Cahaya Abadi | Linda Wijaya | supplier2@gmail.com | Approved |
| UD Maju Jaya | Hendra Saputra | pending@gmail.com | Pending |
| PT Nusantara Logistik | Rina Kartika | pending2@gmail.com | Pending |
| CV Asal Jadi | Joko Susilo | rejected@gmail.com | Rejected |

Kelima akun seed menggunakan password demo Supplier pada tabel di atas (hash seed identik). Pending dan Rejected tidak memiliki akses dashboard Supplier.

Akun tambahan Taesan dan karina tercatat pada database lokal pengguna, tetapi nama perusahaan dan password tidak tersedia dalam ZIP. Gunakan query `database/cek_struktur.sql` untuk melihat nama perusahaan dan status aktual. Jangan menyalin password pribadi ke dokumen demo.

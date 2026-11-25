# ERD aktif FashStock

Gunakan hanya schema `fashstock_web` pada pgAdmin: Databases > fashstock > Schemas > fashstock_web. Generate ERD dari schema tersebut, bukan seluruh database. Supplier adalah baris `users` dengan role `supplier`, bukan tabel terpisah.

```mermaid
erDiagram
 USERS ||--o{ SESSIONS : memiliki
 USERS ||--o{ USERS : memverifikasi
 USERS ||--o{ RESTOCK_ORDERS : supplier
 USERS ||--o{ RESTOCK_ORDERS : membuat
 USERS ||--o{ RESTOCK_ORDERS : memeriksa
 CATEGORIES ||--o{ PRODUCTS : kategori
 RESTOCK_ORDERS ||--o{ RESTOCK_ORDER_ITEMS : memuat
 PRODUCTS ||--o{ RESTOCK_ORDER_ITEMS : produk
 RESTOCK_ORDERS ||--o{ RESTOCK_STATUS_LOGS : histori
 USERS ||--o{ RESTOCK_STATUS_LOGS : mengubah
 USERS ||--o{ TRANSACTIONS : supplier
 USERS ||--o{ TRANSACTIONS : membuat
 USERS ||--o{ TRANSACTIONS : meninjau
 RESTOCK_ORDERS o|--o{ TRANSACTIONS : terkait
 TRANSACTIONS ||--o{ TRANSACTION_ITEMS : memuat
 PRODUCTS ||--o{ TRANSACTION_ITEMS : produk
```

Tabel public lama tidak dihapus atau dipindahkan otomatis. Backup dan audit dependensi sebelum pembersihan. Untuk instalasi baru, jalankan hanya SETUP-FASHSTOCK.sql pada database kosong; fashstock.sql adalah salinan kompatibilitas, jangan jalankan keduanya. Database aktif tidak perlu di-reset.

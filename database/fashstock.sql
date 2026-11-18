-- ============================================================
-- FASHSTOCK
-- Fashion Warehouse Management System
-- PostgreSQL database schema
-- Jalankan pada database kosong bernama fashstock_db.
-- ============================================================

-- 1. USERS
-- Akun Admin, Manager, dan Staff dibuat melalui seed aplikasi
-- setelah mekanisme password hashing tersedia.
CREATE TABLE users (
    id_user SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('Admin', 'Manager', 'Staff')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. SUPPLIERS
-- Supplier mendaftar dan menunggu verifikasi Admin.
CREATE TABLE suppliers (
    id_supplier SERIAL PRIMARY KEY,
    company_name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    address TEXT,
    password_hash TEXT NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (verification_status IN ('Pending', 'Approved', 'Rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. CATEGORIES
CREATE TABLE categories (
    id_category SERIAL PRIMARY KEY,
    category_name VARCHAR(60) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCTS
-- Informasi umum produk; stok disimpan per varian pada product_variants.
CREATE TABLE products (
    id_product SERIAL PRIMARY KEY,
    id_category INTEGER NOT NULL
        REFERENCES categories(id_category)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    product_name VARCHAR(120) NOT NULL,
    description TEXT,
    purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (purchase_price >= 0),
    selling_price NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (selling_price >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRODUCT VARIANTS
-- Satu produk dapat memiliki banyak kombinasi ukuran dan warna.
CREATE TABLE product_variants (
    id_variant SERIAL PRIMARY KEY,
    id_product INTEGER NOT NULL
        REFERENCES products(id_product)
        ON UPDATE CASCADE ON DELETE CASCADE,
    sku VARCHAR(40) NOT NULL UNIQUE,
    size VARCHAR(15) NOT NULL,
    color VARCHAR(40) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0
        CHECK (current_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 5
        CHECK (minimum_stock >= 0),
    low_stock INTEGER NOT NULL DEFAULT 10
        CHECK (low_stock >= minimum_stock),
    rack_location VARCHAR(40),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_product, size, color)
);

-- 6. TRANSACTIONS
-- IN: barang masuk; OUT: barang keluar.
-- Stok berubah hanya saat Manager menyetujui transaksi.
CREATE TABLE transactions (
    id_transaction SERIAL PRIMARY KEY,
    transaction_code VARCHAR(40) NOT NULL UNIQUE,
    transaction_type VARCHAR(5) NOT NULL
        CHECK (transaction_type IN ('IN', 'OUT')),
    id_user INTEGER NOT NULL
        REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    id_supplier INTEGER
        REFERENCES suppliers(id_supplier)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Shipped')),
    rejection_reason TEXT,
    notes TEXT,
    approved_by INTEGER
        REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (transaction_type = 'IN' AND status <> 'Shipped')
        OR transaction_type = 'OUT'
    )
);

-- 7. TRANSACTION DETAILS
CREATE TABLE transaction_details (
    id_transaction_detail SERIAL PRIMARY KEY,
    id_transaction INTEGER NOT NULL
        REFERENCES transactions(id_transaction)
        ON UPDATE CASCADE ON DELETE CASCADE,
    id_variant INTEGER NOT NULL
        REFERENCES product_variants(id_variant)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (unit_price >= 0),
    UNIQUE (id_transaction, id_variant)
);

-- 8. RESTOCK ORDERS
CREATE TABLE restock_orders (
    id_restock SERIAL PRIMARY KEY,
    restock_code VARCHAR(40) NOT NULL UNIQUE,
    id_supplier INTEGER NOT NULL
        REFERENCES suppliers(id_supplier)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    created_by INTEGER NOT NULL
        REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN (
            'Pending', 'Confirmed', 'Rejected',
            'In Transit', 'Received'
        )),
    rejection_reason TEXT,
    notes TEXT,
    confirmed_at TIMESTAMP,
    received_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (expected_date IS NULL OR expected_date >= order_date)
);

-- 9. RESTOCK DETAILS
CREATE TABLE restock_details (
    id_restock_detail SERIAL PRIMARY KEY,
    id_restock INTEGER NOT NULL
        REFERENCES restock_orders(id_restock)
        ON UPDATE CASCADE ON DELETE CASCADE,
    id_variant INTEGER NOT NULL
        REFERENCES product_variants(id_variant)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0
        CHECK (unit_cost >= 0),
    UNIQUE (id_restock, id_variant)
);

-- Relasi satu PO hanya boleh dipakai oleh satu transaksi barang masuk.
-- Kolom ini ditambahkan setelah kedua tabel tersedia.
ALTER TABLE transactions
ADD COLUMN id_restock INTEGER
    REFERENCES restock_orders(id_restock)
    ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE UNIQUE INDEX one_incoming_transaction_per_restock
ON transactions(id_restock)
WHERE id_restock IS NOT NULL AND transaction_type = 'IN';

-- 10. SUPPLIER RATINGS
CREATE TABLE supplier_ratings (
    id_rating SERIAL PRIMARY KEY,
    id_supplier INTEGER NOT NULL
        REFERENCES suppliers(id_supplier)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    id_restock INTEGER NOT NULL UNIQUE
        REFERENCES restock_orders(id_restock)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES untuk pencarian dan filter halaman aplikasi.
CREATE INDEX idx_products_category ON products(id_category);
CREATE INDEX idx_variants_product ON product_variants(id_product);
CREATE INDEX idx_variants_stock ON product_variants(current_stock);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_user ON transactions(id_user);
CREATE INDEX idx_restock_supplier ON restock_orders(id_supplier);
CREATE INDEX idx_restock_status ON restock_orders(status);

-- DATA AWAL KATEGORI FASHION
-- Gudang FashStock mengelola produk fashion multi-kategori.
INSERT INTO categories (category_name, description) VALUES
('Atasan', 'Kaos, kemeja, blouse, sweater, dan atasan lainnya'),
('Bawahan', 'Celana panjang, celana pendek, rok, dan jeans'),
('Outerwear', 'Jaket, hoodie, cardigan, blazer, dan pakaian luar'),
('Dress & Jumpsuit', 'Dress dan pakaian terusan termasuk jumpsuit'),
('Footwear', 'Sneakers, flat shoes, sandal, dan alas kaki lainnya'),
('Tas', 'Shoulder bag, tote bag, handbag, dan backpack'),
('Aksesori', 'Topi, ikat pinggang, jam tangan, kaos kaki, dan aksesori lainnya');

-- DATA CONTOH PRODUK
INSERT INTO products
(id_category, product_name, description, purchase_price, selling_price, unit)
VALUES
((SELECT id_category FROM categories WHERE category_name = 'Atasan'),
 'Basic T-Shirt', 'Kaos basic untuk penggunaan sehari-hari', 45000, 85000, 'pcs'),
((SELECT id_category FROM categories WHERE category_name = 'Bawahan'),
 'Wide Leg Jeans', 'Celana panjang denim model wide leg', 110000, 189000, 'pcs'),
((SELECT id_category FROM categories WHERE category_name = 'Outerwear'),
 'Classic Denim Jacket', 'Jaket denim model klasik', 125000, 219000, 'pcs'),
((SELECT id_category FROM categories WHERE category_name = 'Dress & Jumpsuit'),
 'Casual Midi Dress', 'Dress kasual panjang midi', 95000, 175000, 'pcs'),
((SELECT id_category FROM categories WHERE category_name = 'Footwear'),
 'Everyday Sneakers', 'Sneakers kasual untuk penggunaan harian', 140000, 249000, 'pasang'),
((SELECT id_category FROM categories WHERE category_name = 'Tas'),
 'Canvas Shoulder Bag', 'Tas bahu berbahan kanvas', 65000, 129000, 'pcs'),
((SELECT id_category FROM categories WHERE category_name = 'Aksesori'),
 'Classic Baseball Cap', 'Topi baseball model klasik', 35000, 79000, 'pcs');

-- VARIAN CONTOH
-- Ukuran sepatu memakai nomor; tas dan aksesori dapat memakai All Size.
INSERT INTO product_variants
(id_product, sku, size, color, current_stock, minimum_stock, low_stock, rack_location)
VALUES
((SELECT id_product FROM products WHERE product_name = 'Basic T-Shirt'),
 'TOP001-M-WHT', 'M', 'Putih', 240, 10, 20, 'A-01'),
((SELECT id_product FROM products WHERE product_name = 'Wide Leg Jeans'),
 'BOT001-28-BLU', '28', 'Blue Denim', 32, 5, 10, 'B-02'),
((SELECT id_product FROM products WHERE product_name = 'Classic Denim Jacket'),
 'OUT001-L-BLU', 'L', 'Dark Blue', 12, 5, 15, 'C-01'),
((SELECT id_product FROM products WHERE product_name = 'Casual Midi Dress'),
 'DRS001-M-BLK', 'M', 'Hitam', 0, 5, 10, 'D-01'),
((SELECT id_product FROM products WHERE product_name = 'Everyday Sneakers'),
 'FTW001-38-WHT', '38', 'Putih', 5, 5, 10, 'E-02'),
((SELECT id_product FROM products WHERE product_name = 'Canvas Shoulder Bag'),
 'BAG001-F-CRM', 'All Size', 'Cream', 26, 5, 10, 'F-01'),
((SELECT id_product FROM products WHERE product_name = 'Classic Baseball Cap'),
 'ACC001-F-BLK', 'All Size', 'Hitam', 18, 5, 10, 'G-01');

-- VIEW status stok otomatis berdasarkan jumlah stok dan batas stok.
CREATE VIEW v_product_stock_status AS
SELECT
    pv.id_variant,
    p.id_product,
    p.product_name,
    c.category_name,
    pv.sku,
    pv.size,
    pv.color,
    pv.current_stock,
    pv.minimum_stock,
    pv.low_stock,
    pv.rack_location,
    CASE
        WHEN pv.current_stock = 0 THEN 'Out of Stock'
        WHEN pv.current_stock <= pv.minimum_stock THEN 'Severe'
        WHEN pv.current_stock <= pv.low_stock THEN 'Low'
        ELSE 'Normal'
    END AS stock_status
FROM product_variants pv
JOIN products p ON p.id_product = pv.id_product
JOIN categories c ON c.id_category = p.id_category;

-- SELESAI.
-- Catatan implementasi:
-- 1. Buat akun users dan supplier dengan password hash dari aplikasi.
-- 2. Jangan menyimpan password teks biasa.
-- 3. Saat Manager menyetujui transaksi, aplikasi harus menjalankan
--    BEGIN; validasi stok; UPDATE stok; UPDATE status; COMMIT.
--    Jika salah satu langkah gagal, jalankan ROLLBACK.
-- 4. Barang masuk dari PO hanya menambah stok melalui transaksi IN
--    yang disetujui Manager, bukan saat PO berstatus Received.
-- 5. Transaksi OUT mengurangi stok saat Approved. Perubahan ke Shipped
--    tidak boleh mengurangi stok lagi.

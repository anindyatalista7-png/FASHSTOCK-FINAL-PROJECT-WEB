-- =====================================================================
--  FASHSTOCK - Sistem Manajemen Gudang
--  File   : database/fashstock.sql
--  Isi    : Struktur tabel, fungsi, index, dan data awal (seed)
--  Cara   : 1) CREATE DATABASE fazhztock;
--           2) Jalankan file ini di Query Tool pgAdmin (database fazhztock)
--              atau: psql -U postgres -d fazhztock -f database/fashstock.sql
--  Semua akun awal memakai password: password berbeda untuk setiap role (lihat AKUN-DEMO.md)
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
     OR to_regclass('public.products') IS NOT NULL
     OR to_regclass('public.categories') IS NOT NULL THEN
    RAISE EXCEPTION 'Database tidak kosong. Gunakan database baru untuk schema FashStock; data lama tidak dihapus.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------
-- Fungsi bantu
-- ---------------------------------------------------------------------

-- Status stok dihitung otomatis oleh sistem (bukan diisi manual)
CREATE FUNCTION stock_status(p_stock INTEGER, p_min INTEGER, p_low INTEGER)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
           WHEN p_stock = 0      THEN 'Out of Stock'
           WHEN p_stock <= p_min THEN 'Severe'
           WHEN p_stock <= p_low THEN 'Low'
           ELSE 'Normal'
         END
$$;

CREATE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE SEQUENCE trx_number_seq START 1;
CREATE SEQUENCE po_number_seq  START 1;

-- ---------------------------------------------------------------------
-- USERS (Admin, Warehouse Manager, Staff Gudang, Supplier)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,
  password_hash  VARCHAR(100)  NOT NULL,
  role           VARCHAR(20)   NOT NULL
                 CHECK (role IN ('admin', 'manager', 'staff', 'supplier')),
  status         VARCHAR(20)   NOT NULL DEFAULT 'Approved'
                 CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  company_name   VARCHAR(150),
  phone          VARCHAR(30),
  address        TEXT,
  verified_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_company_required
    CHECK (role <> 'supplier' OR company_name IS NOT NULL)
);

-- Sesi login (token acak disimpan di cookie httpOnly)
CREATE TABLE sessions (
  token       VARCHAR(64) PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  description  TEXT         NOT NULL,
  image        BYTEA,
  image_type   VARCHAR(50),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_categories_name ON categories (LOWER(name));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  sku             VARCHAR(50)    NOT NULL,
  name            VARCHAR(150)   NOT NULL,
  category_id     INTEGER        REFERENCES categories(id) ON DELETE RESTRICT,
  description     TEXT           NOT NULL,
  purchase_price  NUMERIC(14,2)  NOT NULL CHECK (purchase_price >= 0),
  selling_price   NUMERIC(14,2)  NOT NULL CHECK (selling_price >= 0),
  min_stock       INTEGER        NOT NULL CHECK (min_stock >= 0),
  low_stock       INTEGER        NOT NULL,
  stock           INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit            VARCHAR(20)    NOT NULL,
  rack_location   VARCHAR(50)    NOT NULL,
  image           BYTEA,
  image_type      VARCHAR(50),
  deleted_at      TIMESTAMPTZ,                    -- soft delete, riwayat tetap utuh
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT low_greater_than_min CHECK (low_stock > min_stock)
);
CREATE UNIQUE INDEX uq_products_sku ON products (UPPER(sku));
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active   ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- RESTOCK ORDERS (Purchase Order ke Supplier)
-- ---------------------------------------------------------------------
CREATE TABLE restock_orders (
  id              SERIAL PRIMARY KEY,
  po_number       VARCHAR(30)  NOT NULL UNIQUE,
  supplier_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by      INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_date      DATE         NOT NULL,
  expected_date   DATE         NOT NULL,
  notes           TEXT         NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Confirmed', 'Rejected', 'In Transit', 'Received')),
  status_note     TEXT,
  rating          SMALLINT     CHECK (rating BETWEEN 1 AND 5),
  feedback        TEXT,
  rated_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT expected_after_order CHECK (expected_date >= order_date),
  CONSTRAINT rejected_needs_note  CHECK (status <> 'Rejected' OR (status_note IS NOT NULL AND LENGTH(TRIM(status_note)) > 0)),
  CONSTRAINT rating_only_received CHECK (rating IS NULL OR status = 'Received')
);
CREATE INDEX idx_restock_supplier ON restock_orders(supplier_id);
CREATE INDEX idx_restock_status   ON restock_orders(status);
CREATE TRIGGER trg_restock_updated BEFORE UPDATE ON restock_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE restock_order_items (
  id                SERIAL PRIMARY KEY,
  restock_order_id  INTEGER NOT NULL REFERENCES restock_orders(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (restock_order_id, product_id)
);

-- Riwayat perubahan status (untuk timeline progress)
CREATE TABLE restock_status_logs (
  id                SERIAL PRIMARY KEY,
  restock_order_id  INTEGER     NOT NULL REFERENCES restock_orders(id) ON DELETE CASCADE,
  status            VARCHAR(20) NOT NULL,
  note              TEXT,
  changed_by        INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_restock_logs_order ON restock_status_logs(restock_order_id);

-- ---------------------------------------------------------------------
-- TRANSACTIONS (Barang Masuk = IN, Barang Keluar = OUT)
-- ---------------------------------------------------------------------
CREATE TABLE transactions (
  id                SERIAL PRIMARY KEY,
  trx_number        VARCHAR(30)  NOT NULL UNIQUE,
  type              VARCHAR(3)   NOT NULL CHECK (type IN ('IN', 'OUT')),
  trx_date          DATE         NOT NULL,
  supplier_id       INTEGER      REFERENCES users(id) ON DELETE RESTRICT,
  restock_order_id  INTEGER      REFERENCES restock_orders(id) ON DELETE RESTRICT,
  customer_name     VARCHAR(150),
  notes             TEXT         NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Shipped')),
  reject_reason     TEXT,
  created_by        INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by       INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  shipped_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT in_needs_supplier   CHECK (type <> 'IN'  OR supplier_id IS NOT NULL),
  CONSTRAINT out_needs_customer  CHECK (type <> 'OUT' OR customer_name IS NOT NULL),
  CONSTRAINT po_only_incoming    CHECK (restock_order_id IS NULL OR type = 'IN'),
  CONSTRAINT shipped_only_out    CHECK (status <> 'Shipped' OR type = 'OUT'),
  CONSTRAINT rejected_needs_reason CHECK (status <> 'Rejected' OR (reject_reason IS NOT NULL AND LENGTH(TRIM(reject_reason)) > 0))
);
-- Satu Restock Order hanya boleh dipakai oleh satu Incoming Transaction yang belum Rejected
CREATE UNIQUE INDEX uq_trx_restock_active
  ON transactions(restock_order_id)
  WHERE restock_order_id IS NOT NULL AND status <> 'Rejected';
CREATE INDEX idx_trx_type_status ON transactions(type, status);
CREATE INDEX idx_trx_date        ON transactions(trx_date);
CREATE INDEX idx_trx_created_by  ON transactions(created_by);
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE transaction_items (
  id              SERIAL PRIMARY KEY,
  transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (transaction_id, product_id)
);
CREATE INDEX idx_trx_items_product ON transaction_items(product_id);

-- =====================================================================
--  DATA AWAL (SEED)
--  Password semua akun: password berbeda untuk setiap role (lihat AKUN-DEMO.md)
-- =====================================================================

-- Akun Admin, Warehouse Manager, dan Staff Gudang HANYA dibuat lewat file ini.
INSERT INTO users (id, name, email, password_hash, role, status, company_name, phone, address) VALUES
  (1, 'Admin Utama',        'admin@gmail.com',    '$2y$10$B9TYvcyhhu3Ng9ZHM4bBB.Hjqi0LByMTBdE0d2ycIT4k27YkB2IZa', 'admin',   'Approved', NULL, '081200000001', 'Kantor Pusat'),
  (2, 'Budi Manager',       'manager@gmail.com',  '$2y$10$/uHMfYmVAupVUszxLjnWnefzLJbcHT5x8iLJkWZ7c9KGG7PPZ.VNS', 'manager', 'Approved', NULL, '081200000002', 'Gudang Utama'),
  (3, 'Sari Staff',         'staff@gmail.com',    '$2y$10$EEyqxNypQ7zg9tIL1gerOuwI9PXtA/zY6bV2nglEAu46qO2t9OHq6', 'staff',   'Approved', NULL, '081200000003', 'Gudang Utama'),
  (4, 'Andi Staff',         'staff2@gmail.com',   '$2y$10$EEyqxNypQ7zg9tIL1gerOuwI9PXtA/zY6bV2nglEAu46qO2t9OHq6', 'staff',   'Approved', NULL, '081200000004', 'Gudang Utama'),
  (5, 'Rudi Hartono',       'supplier@gmail.com', '$2y$10$bQc5lFh03dqkR4PvA1sY/.8xdguzgdEpCpZa5YWP8IcQu9ZU.1lL2', 'supplier','Approved', 'PT Sumber Makmur', '081300000005', 'Jl. Perintis Kemerdekaan No. 10, Makassar'),
  (6, 'Linda Wijaya',       'supplier2@gmail.com','$2y$10$bQc5lFh03dqkR4PvA1sY/.8xdguzgdEpCpZa5YWP8IcQu9ZU.1lL2', 'supplier','Approved', 'CV Cahaya Abadi', '081300000006', 'Jl. Urip Sumoharjo No. 45, Makassar'),
  (7, 'Hendra Saputra',     'pending@gmail.com',  '$2y$10$bQc5lFh03dqkR4PvA1sY/.8xdguzgdEpCpZa5YWP8IcQu9ZU.1lL2', 'supplier','Pending',  'UD Maju Jaya', '081300000007', 'Jl. Sultan Alauddin No. 3, Gowa'),
  (8, 'Rina Kartika',       'pending2@gmail.com', '$2y$10$bQc5lFh03dqkR4PvA1sY/.8xdguzgdEpCpZa5YWP8IcQu9ZU.1lL2', 'supplier','Pending',  'PT Nusantara Logistik', '081300000008', 'Jl. AP Pettarani No. 88, Makassar'),
  (9, 'Joko Susilo',        'rejected@gmail.com', '$2y$10$bQc5lFh03dqkR4PvA1sY/.8xdguzgdEpCpZa5YWP8IcQu9ZU.1lL2', 'supplier','Rejected', 'CV Asal Jadi', '081300000009', 'Jl. Veteran No. 1, Maros');
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

INSERT INTO categories (id, name, description) VALUES
  (1, 'Atasan', 'Kaos, kemeja, blouse, dan knitwear'),
  (2, 'Bawahan', 'Celana panjang, jeans, dan rok'),
  (3, 'Outerwear', 'Jaket, hoodie, dan cardigan'),
  (4, 'Dress', 'Dress dan pakaian terusan'),
  (5, 'Tas', 'Handbag, tote bag, dan tas fashion'),
  (6, 'Aksesori', 'Topi, ikat pinggang, dan aksesori');
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

INSERT INTO products (id, sku, name, category_id, description, purchase_price, selling_price, min_stock, low_stock, stock, unit, rack_location, created_at) VALUES
  (1, 'FS-ATS-001', 'Basic Cotton T-Shirt', 1, 'Kaos katun basic unisex', 45000, 85000, 5, 15, 42, 'pcs', 'A-01-01', NOW() - INTERVAL '57 days'),
  (2, 'FS-ATS-002', 'Oversized Linen Shirt', 1, 'Kemeja linen oversized', 90000, 159000, 5, 15, 12, 'pcs', 'A-01-02', NOW() - INTERVAL '54 days'),
  (3, 'FS-ATS-003', 'Ribbed Knit Top', 1, 'Atasan rajut ribbed', 65000, 119000, 10, 25, 8, 'pcs', 'A-01-03', NOW() - INTERVAL '51 days'),
  (4, 'FS-ATS-004', 'Satin Blouse', 1, 'Blouse satin lengan panjang', 80000, 149000, 10, 20, 0, 'pcs', 'A-02-01', NOW() - INTERVAL '48 days'),
  (5, 'FS-BWH-001', 'Wide Leg Denim Jeans', 2, 'Celana denim potongan wide leg', 115000, 209000, 20, 50, 130, 'pcs', 'B-01-01', NOW() - INTERVAL '45 days'),
  (6, 'FS-BWH-002', 'Pleated Midi Skirt', 2, 'Rok midi lipit', 85000, 155000, 10, 30, 25, 'pcs', 'B-01-02', NOW() - INTERVAL '42 days'),
  (7, 'FS-BWH-003', 'High Waist Shorts', 2, 'Celana pendek high waist', 60000, 110000, 5, 10, 4, 'pcs', 'B-02-01', NOW() - INTERVAL '39 days'),
  (8, 'FS-OUT-001', 'Classic Denim Jacket', 3, 'Jaket denim klasik', 145000, 259000, 15, 40, 90, 'pcs', 'C-01-01', NOW() - INTERVAL '36 days'),
  (9, 'FS-OUT-002', 'Oversized Hoodie', 3, 'Hoodie fleece oversized', 110000, 199000, 20, 50, 35, 'pcs', 'C-01-02', NOW() - INTERVAL '33 days'),
  (10, 'FS-OUT-003', 'Soft Knit Cardigan', 3, 'Cardigan rajut lembut', 95000, 175000, 10, 25, 60, 'pcs', 'D-01-01', NOW() - INTERVAL '30 days'),
  (11, 'FS-DRS-001', 'Floral Midi Dress', 4, 'Dress midi motif floral', 125000, 229000, 10, 25, 9, 'pcs', 'D-01-02', NOW() - INTERVAL '27 days'),
  (12, 'FS-TAS-001', 'Mini Shoulder Bag', 5, 'Tas bahu ukuran mini', 80000, 149000, 3, 8, 20, 'pcs', 'E-01-01', NOW() - INTERVAL '24 days'),
  (13, 'FS-TAS-002', 'Canvas Tote Bag', 5, 'Tas tote berbahan kanvas', 45000, 85000, 5, 12, 0, 'pcs', 'E-01-02', NOW() - INTERVAL '21 days'),
  (14, 'FS-AKS-001', 'Leather Look Belt', 6, 'Ikat pinggang fashion', 35000, 69000, 50, 100, 240, 'pcs', 'F-01-01', NOW() - INTERVAL '18 days'),
  (15, 'FS-AKS-002', 'Classic Baseball Cap', 6, 'Topi baseball polos', 40000, 79000, 20, 40, 18, 'pcs', 'F-01-02', NOW() - INTERVAL '15 days');
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- Restock orders contoh dengan berbagai status
INSERT INTO restock_orders (id, po_number, supplier_id, created_by, order_date, expected_date, notes, status, status_note, rating, feedback, rated_at, created_at) VALUES
  (1, 'PO-20261101-00001', 5, 2, CURRENT_DATE - 19, CURRENT_DATE - 14, 'Restock rutin atasan',       'Received',   NULL, 5, 'Barang lengkap dan tepat waktu', NOW() - INTERVAL '12 days', NOW() - INTERVAL '19 days'),
  (2, 'PO-20261105-00002', 6, 2, CURRENT_DATE - 15, CURRENT_DATE - 10, 'Restock bawahan bulanan',             'Received',   NULL, NULL, NULL, NULL, NOW() - INTERVAL '15 days'),
  (3, 'PO-20261110-00003', 5, 2, CURRENT_DATE - 10, CURRENT_DATE - 3,  'Blouse habis, butuh segera',   'In Transit', NULL, NULL, NULL, NULL, NOW() - INTERVAL '10 days'),
  (4, 'PO-20261114-00004', 6, 2, CURRENT_DATE - 6,  CURRENT_DATE + 2,  'Restock dress dan cardigan',     'Confirmed',  NULL, NULL, NULL, NULL, NOW() - INTERVAL '6 days'),
  (5, 'PO-20261117-00005', 5, 2, CURRENT_DATE - 3,  CURRENT_DATE + 5,  'Restock tas dan knitwear',  'Pending',    NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days'),
  (6, 'PO-20261118-00006', 6, 2, CURRENT_DATE - 2,  CURRENT_DATE + 7,  'Restock aksesori',                  'Rejected',   'Stok aksesori di supplier sedang kosong', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
  (7, 'PO-20261119-00007', 6, 2, CURRENT_DATE - 1,  CURRENT_DATE + 6,  'Restock celana pendek',             'Pending',    NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 days'),
  (8, 'PO-20261112-00008', 5, 2, CURRENT_DATE - 8,  CURRENT_DATE - 1,  'Restock aksesori & kabel HDMI',     'Received',   NULL, NULL, NULL, NULL, NOW() - INTERVAL '8 days');
SELECT setval('restock_orders_id_seq', (SELECT MAX(id) FROM restock_orders));
SELECT setval('po_number_seq', 8);

INSERT INTO restock_order_items (restock_order_id, product_id, quantity) VALUES
  (1, 1, 30), (1, 2, 10),
  (2, 5, 100), (2, 6, 20),
  (3, 4, 40),
  (4, 11, 30), (4, 10, 20),
  (5, 13, 25), (5, 3, 30),
  (6, 15, 50),
  (7, 7, 15),
  (8, 15, 40), (8, 3, 20);

INSERT INTO restock_status_logs (restock_order_id, status, note, changed_by, changed_at) VALUES
  (1, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '19 days'),
  (1, 'Confirmed',  'Dikonfirmasi supplier', 5, NOW() - INTERVAL '18 days'),
  (1, 'In Transit', 'Barang dalam pengiriman', 2, NOW() - INTERVAL '16 days'),
  (1, 'Received',   'Barang diterima di gudang', 2, NOW() - INTERVAL '14 days'),
  (2, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '15 days'),
  (2, 'Confirmed',  'Dikonfirmasi supplier', 6, NOW() - INTERVAL '14 days'),
  (2, 'In Transit', 'Barang dalam pengiriman', 2, NOW() - INTERVAL '12 days'),
  (2, 'Received',   'Barang diterima di gudang', 2, NOW() - INTERVAL '10 days'),
  (3, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '10 days'),
  (3, 'Confirmed',  'Dikonfirmasi supplier', 5, NOW() - INTERVAL '9 days'),
  (3, 'In Transit', 'Barang dalam pengiriman', 2, NOW() - INTERVAL '4 days'),
  (4, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '6 days'),
  (4, 'Confirmed',  'Dikonfirmasi supplier', 6, NOW() - INTERVAL '5 days'),
  (5, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '3 days'),
  (6, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '2 days'),
  (6, 'Rejected',   'Stok aksesori di supplier sedang kosong', 6, NOW() - INTERVAL '1 days'),
  (7, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '1 days'),
  (8, 'Pending',    'Restock order dibuat', 2, NOW() - INTERVAL '8 days'),
  (8, 'Confirmed',  'Dikonfirmasi supplier', 5, NOW() - INTERVAL '7 days'),
  (8, 'In Transit', 'Barang dalam pengiriman', 2, NOW() - INTERVAL '3 days'),
  (8, 'Received',   'Barang diterima di gudang, menunggu pencatatan Barang Masuk', 2, NOW() - INTERVAL '3 hours');

-- Transaksi contoh
INSERT INTO transactions (id, trx_number, type, trx_date, supplier_id, restock_order_id, customer_name, notes, status, reject_reason, created_by, reviewed_by, reviewed_at, shipped_at, created_at) VALUES
  (1, 'IN-20261106-00001',  'IN',  CURRENT_DATE - 14, 5, 1,    NULL, 'Penerimaan PO-20261101-00001', 'Approved', NULL, 3, 2, NOW() - INTERVAL '14 days', NULL, NOW() - INTERVAL '14 days'),
  (2, 'OUT-20261115-00002', 'OUT', CURRENT_DATE - 5,  NULL, NULL, 'Toko Sinar Jaya', 'Pengiriman reguler', 'Shipped', NULL, 3, 2, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),
  (3, 'OUT-20261118-00003', 'OUT', CURRENT_DATE - 2,  NULL, NULL, 'Kantor Dinas Pendidikan', 'Pesanan fashion retail', 'Approved', NULL, 4, 2, NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days'),
  (4, 'OUT-20261115-00004', 'OUT', CURRENT_DATE - 5,  NULL, NULL, 'CV Berkah Mandiri', 'Pesanan dibatalkan customer', 'Rejected', 'Customer membatalkan pesanan', 3, 2, NOW() - INTERVAL '5 days', NULL, NOW() - INTERVAL '5 days'),
  (5, 'IN-20261120-00005',  'IN',  CURRENT_DATE,      6, 2,    NULL, 'Penerimaan PO-20261105-00002', 'Pending', NULL, 3, NULL, NULL, NULL, NOW() - INTERVAL '2 hours'),
  (6, 'OUT-20261120-00006', 'OUT', CURRENT_DATE,      NULL, NULL, 'Toko Rezeki', 'Kirim siang ini', 'Pending', NULL, 3, NULL, NULL, NULL, NOW() - INTERVAL '1 hours'),
  (7, 'OUT-20261120-00007', 'OUT', CURRENT_DATE,      NULL, NULL, 'PT Global Teknik', 'Pesanan tas fashion', 'Pending', NULL, 4, NULL, NULL, NULL, NOW() - INTERVAL '30 minutes'),
  (8, 'IN-20261120-00008',  'IN',  CURRENT_DATE,      5, NULL, NULL, 'Barang tambahan tanpa PO', 'Pending', NULL, 4, NULL, NULL, NULL, NOW() - INTERVAL '10 minutes'),
  (9, 'IN-20261116-00009',  'IN',  CURRENT_DATE - 4,  6, NULL, NULL, 'Pembelian langsung aksesori & cardigan', 'Approved', NULL, 4, 2, NOW() - INTERVAL '4 days', NULL, NOW() - INTERVAL '4 days');
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));
SELECT setval('trx_number_seq', 9);

INSERT INTO transaction_items (transaction_id, product_id, quantity) VALUES
  (1, 1, 30), (1, 2, 10),
  (2, 1, 5),  (2, 8, 10),
  (3, 5, 20), (3, 6, 5),
  (4, 12, 2),
  (5, 5, 100), (5, 6, 20),
  (6, 8, 15), (6, 9, 5),
  (7, 12, 3),
  (8, 14, 50),
  (9, 14, 60), (9, 10, 20);

UPDATE categories SET image = convert_to('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" rx="24" fill="#F6E8E8"/><path d="M300 74l70 40v80l-70 40-70-40v-80z" fill="none" stroke="#713E4A" stroke-width="10"/><path d="M230 114l70 40 70-40M300 154v80" fill="none" stroke="#BD858B" stroke-width="9"/></svg>', 'UTF8'), image_type='image/svg+xml';
UPDATE products SET image = convert_to('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" rx="20" fill="#F8EEEE"/><path d="M155 90l45 26 45-26 54 46-30 48-22-13v137h-94V171l-22 13-30-48z" fill="#BD858B" stroke="#713E4A" stroke-width="8" stroke-linejoin="round"/><path d="M155 90q45 66 90 0" fill="none" stroke="#713E4A" stroke-width="6"/></svg>', 'UTF8'), image_type='image/svg+xml';
COMMIT;

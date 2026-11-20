
import pool from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API untuk menambahkan varian pada produk yang sudah ada
export async function POST(request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      {
        success: false,
        message: "Fitur ini belum tersedia tanpa autentikasi.",
      },
      { status: 403 }
    );
  }

  let client;

  try {
    const body = await request.json();

    const idProduct = Number(body.id_product);
    const sku = String(body.sku ?? "").trim().toUpperCase();
    const size = String(body.size ?? "").trim();
    const color = String(body.color ?? "").trim();
    const rackLocation = String(
      body.rack_location ?? ""
    ).trim();

    const minimumStock = Number(body.minimum_stock);
    const lowStock = Number(body.low_stock);

    // Validasi data dari formulir
    if (!Number.isSafeInteger(idProduct) || idProduct <= 0) {
      return Response.json(
        {
          success: false,
          message: "Pilih produk terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    if (!sku || !size || !color) {
      return Response.json(
        {
          success: false,
          message: "SKU, ukuran, dan warna wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(minimumStock) ||
      !Number.isSafeInteger(lowStock) ||
      minimumStock < 0 ||
      lowStock < minimumStock
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Batas stok harus berupa bilangan bulat positif dan batas stok rendah tidak boleh lebih kecil dari minimum stok.",
        },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // Pastikan produk induk tersedia
    const productResult = await client.query(
      `
      SELECT id_product, product_name
      FROM products
      WHERE id_product = $1
      FOR UPDATE
      `,
      [idProduct]
    );

    if (productResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        {
          success: false,
          message: "Produk yang dipilih tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // Simpan varian baru dengan stok awal 0
    const result = await client.query(
      `
      INSERT INTO product_variants (
        id_product,
        sku,
        size,
        color,
        current_stock,
        minimum_stock,
        low_stock,
        rack_location
      )
      VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
      RETURNING *
      `,
      [
        idProduct,
        sku,
        size,
        color,
        minimumStock,
        lowStock,
        rackLocation || null,
      ]
    );

    await client.query("COMMIT");

    return Response.json(
      {
        success: true,
        message: "Varian produk berhasil ditambahkan.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    if (error.code === "23505") {
      return Response.json(
        {
          success: false,
          message:
            "SKU sudah digunakan atau kombinasi ukuran dan warna sudah terdaftar pada produk ini.",
        },
        { status: 409 }
      );
    }

    if (error.code === "23503") {
      return Response.json(
        {
          success: false,
          message: "Produk yang dipilih tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    console.error("Gagal menambahkan varian:", error);

    return Response.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menyimpan varian.",
      },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

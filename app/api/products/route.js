
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export const dynamic = "force-dynamic";

// GET: Menampilkan dan mencari produk
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim() || "";

    const result = await pool.query(
      `
      SELECT
        p.id_product,
        p.product_name,
        p.description,
        p.purchase_price,
        p.selling_price,
        p.image_url,
        c.category_name,
        COUNT(pv.id_variant)::int AS variant_count,
        COALESCE(SUM(pv.current_stock), 0)::int AS total_stock,
        CASE
          WHEN COUNT(pv.id_variant) = 0 THEN 'Out of Stock'
          WHEN COALESCE(SUM(pv.current_stock), 0) = 0
            THEN 'Out of Stock'
          WHEN BOOL_OR(pv.current_stock <= pv.minimum_stock)
            THEN 'Severe'
          WHEN BOOL_OR(pv.current_stock <= pv.low_stock)
            THEN 'Low'
          ELSE 'Normal'
        END AS stock_status,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_variant', pv.id_variant,
              'sku', pv.sku,
              'size', pv.size,
              'color', pv.color,
              'current_stock', pv.current_stock,
              'minimum_stock', pv.minimum_stock,
              'low_stock', pv.low_stock,
              'rack_location', pv.rack_location
            )
            ORDER BY pv.id_variant
          ) FILTER (WHERE pv.id_variant IS NOT NULL),
          '[]'::json
        ) AS variants
      FROM products p
      JOIN categories c
        ON c.id_category = p.id_category
      LEFT JOIN product_variants pv
        ON pv.id_product = p.id_product
      WHERE
        $1 = ''
        OR p.product_name ILIKE '%' || $1 || '%'
        OR c.category_name ILIKE '%' || $1 || '%'
        OR EXISTS (
          SELECT 1
          FROM product_variants v
          WHERE v.id_product = p.id_product
            AND v.sku ILIKE '%' || $1 || '%'
        )
      GROUP BY p.id_product, c.id_category
      ORDER BY p.id_product DESC
      `,
      [search]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET PRODUCTS:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data produk." },
      { status: 500 }
    );
  }
}

// POST: Menambahkan produk dan satu varian awal
export async function POST(request) {
  // Pengujian lokal saja, sampai login dan role tersedia.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { message: "Fitur ini memerlukan autentikasi Admin/Manager." },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 }
    );
  }

  const name = String(body.product_name || "").trim();
  const sku = String(body.sku || "").trim().toUpperCase();
  const size = String(body.size || "").trim();
  const color = String(body.color || "").trim();
  const category = Number(body.id_category);
  const purchasePrice = Number(body.purchase_price);
  const sellingPrice = Number(body.selling_price);
  const minimumStock = Number(body.minimum_stock);
  const lowStock = Number(body.low_stock);

  const validPrice = (value) =>
    Number.isFinite(value) && value >= 0 && value <= 999999999999.99;

  const validStock = (value) =>
    Number.isSafeInteger(value) && value >= 0;

  if (
    !name ||
    name.length > 120 ||
    !sku ||
    sku.length > 40 ||
    !size ||
    size.length > 15 ||
    !color ||
    color.length > 40 ||
    !Number.isSafeInteger(category) ||
    category <= 0 ||
    !validPrice(purchasePrice) ||
    !validPrice(sellingPrice) ||
    !validStock(minimumStock) ||
    !validStock(lowStock) ||
    lowStock < minimumStock
  ) {
    return NextResponse.json(
      { message: "Data produk tidak valid. Periksa semua kolom." },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `
      INSERT INTO products (
        id_category,
        product_name,
        description,
        purchase_price,
        selling_price,
        unit,
        image_url
      )
      VALUES ($1, $2, $3, $4, $5, 'pcs', $6)
      RETURNING id_product
      `,
      [
        category,
        name,
        String(body.description || "").trim(),
        purchasePrice,
        sellingPrice,
        body.image_url
          ? String(body.image_url).trim()
          : null,
      ]
    );

    const idProduct = productResult.rows[0].id_product;

    await client.query(
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
      `,
      [
        idProduct,
        sku,
        size,
        color,
        minimumStock,
        lowStock,
        String(body.rack_location || "").trim() || null,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Produk berhasil ditambahkan.",
        id_product: idProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST PRODUCTS:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { message: "SKU sudah digunakan. Gunakan SKU lain." },
        { status: 409 }
      );
    }

    if (error.code === "23503") {
      return NextResponse.json(
        { message: "Kategori tidak ditemukan." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Produk gagal disimpan." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}


import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || "";

    const result = await pool.query(
      `
      SELECT
        p.id_product,
        p.product_name,
        p.description,
        p.purchase_price,
        p.selling_price,
        p.unit,
        p.image_url,
        c.category_name,

        COUNT(pv.id_variant)::int AS variant_count,
        COALESCE(SUM(pv.current_stock), 0)::int AS total_stock,

        CASE
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
              'rack_location', pv.rack_location,
              'stock_status',
                CASE
                  WHEN pv.current_stock = 0 THEN 'Out of Stock'
                  WHEN pv.current_stock <= pv.minimum_stock THEN 'Severe'
                  WHEN pv.current_stock <= pv.low_stock THEN 'Low'
                  ELSE 'Normal'
                END
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
        p.product_name ILIKE $1
        OR c.category_name ILIKE $1
        OR EXISTS (
          SELECT 1
          FROM product_variants pv2
          WHERE pv2.id_product = p.id_product
            AND pv2.sku ILIKE $1
        )

      GROUP BY
        p.id_product,
        p.product_name,
        p.description,
        p.purchase_price,
        p.selling_price,
        p.unit,
        p.image_url,
        c.category_name

      ORDER BY p.id_product DESC
      `,
      [`%${search}%`]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data produk.",
      },
      { status: 500 }
    );
  }
}

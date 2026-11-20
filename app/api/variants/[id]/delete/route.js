
import { NextResponse } from "next/server";
import pool from "../../../../../lib/db";

export async function DELETE(request, { params }) {
  // Sementara hanya untuk pengujian lokal.
  // Sebelum deployment, ganti dengan autentikasi dan otorisasi Admin.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { message: "Penghapusan memerlukan autentikasi Admin." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const variantId = Number(id);

  if (!Number.isSafeInteger(variantId) || variantId <= 0) {
    return NextResponse.json(
      { message: "ID varian tidak valid." },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Mengunci data varian yang akan dihapus.
    const variantResult = await client.query(
      `
      SELECT
        id_product,
        sku,
        current_stock
      FROM product_variants
      WHERE id_variant = $1
      FOR UPDATE
      `,
      [variantId]
    );

    if (variantResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Varian tidak ditemukan." },
        { status: 404 }
      );
    }

    const variant = variantResult.rows[0];

    // Varian yang masih memiliki stok tidak boleh dihapus.
    if (Number(variant.current_stock) !== 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "Varian masih memiliki stok. Selesaikan pengelolaan stok terlebih dahulu.",
        },
        { status: 409 }
      );
    }

    // Periksa apakah varian memiliki riwayat transaksi.
    const transactionResult = await client.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM transaction_details
        WHERE id_variant = $1
      ) AS has_history
      `,
      [variantId]
    );

    if (transactionResult.rows[0].has_history) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "Varian memiliki riwayat transaksi sehingga tidak dapat dihapus.",
        },
        { status: 409 }
      );
    }

    // Periksa apakah varian pernah masuk permintaan restock.
    const restockResult = await client.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM restock_details
        WHERE id_variant = $1
      ) AS has_restock
      `,
      [variantId]
    );

    if (restockResult.rows[0].has_restock) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "Varian sudah digunakan dalam permintaan restock sehingga tidak dapat dihapus.",
        },
        { status: 409 }
      );
    }

    // Hapus varian yang memenuhi seluruh persyaratan.
    await client.query(
      `
      DELETE FROM product_variants
      WHERE id_variant = $1
      `,
      [variantId]
    );

    // Periksa apakah produk masih mempunyai varian lain.
    const remainingResult = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM product_variants
      WHERE id_product = $1
      `,
      [variant.id_product]
    );

    let productDeleted = false;

    // Jika tidak ada varian tersisa, hapus produk induknya.
    if (remainingResult.rows[0].total === 0) {
      await client.query(
        `
        DELETE FROM products
        WHERE id_product = $1
        `,
        [variant.id_product]
      );

      productDeleted = true;
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: productDeleted
        ? "Varian dan produk berhasil dihapus."
        : "Varian berhasil dihapus.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("DELETE VARIANT:", error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          message:
            "Data masih digunakan oleh bagian lain dalam sistem sehingga tidak dapat dihapus.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Gagal menghapus varian." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

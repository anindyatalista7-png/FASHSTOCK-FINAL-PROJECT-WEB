
import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Mengambil daftar kategori dari PostgreSQL
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        c.id_category,
        c.category_name,
        c.description,
        COUNT(p.id_product)::int AS total_products
      FROM categories c
      LEFT JOIN products p
        ON p.id_category = c.id_category
      GROUP BY
        c.id_category,
        c.category_name,
        c.description
      ORDER BY c.category_name ASC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET CATEGORY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil kategori.",
      },
      { status: 500 }
    );
  }
}

// POST: Menambahkan kategori baru
export async function POST(request) {
  // Sementara hanya untuk pengembangan lokal.
  // Hak akses Admin dan Manager dibuat pada tahap autentikasi.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        success: false,
        message: "Penambahan kategori memerlukan autentikasi.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const categoryName = String(
      body.category_name ?? ""
    ).trim();

    const description = String(
      body.description ?? ""
    ).trim();

    // Validasi input kategori
    if (!categoryName || !description) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama kategori dan deskripsi wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (categoryName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama kategori maksimal 100 karakter.",
        },
        { status: 400 }
      );
    }

    // Memeriksa kategori dengan nama yang sama
    const existing = await pool.query(
      `
      SELECT id_category
      FROM categories
      WHERE LOWER(category_name) = LOWER($1)
      LIMIT 1
      `,
      [categoryName]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama kategori sudah digunakan.",
        },
        { status: 409 }
      );
    }

    // Menyimpan kategori baru ke database
    const result = await pool.query(
      `
      INSERT INTO categories (
        category_name,
        description
      )
      VALUES ($1, $2)
      RETURNING
        id_category,
        category_name,
        description
      `,
      [categoryName, description]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Kategori berhasil ditambahkan.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST CATEGORY ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Nama kategori sudah digunakan.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menambahkan kategori.",
      },
      { status: 500 }
    );
  }
}

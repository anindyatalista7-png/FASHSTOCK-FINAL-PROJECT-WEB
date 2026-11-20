import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id_category, category_name
      FROM categories
      ORDER BY category_name ASC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("CATEGORY ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil kategori." },
      { status: 500 }
    );
  }
}

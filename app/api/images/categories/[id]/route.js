import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

// GET /api/images/categories/:id -> gambar kategori (disimpan sebagai BYTEA)
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await queryOne("SELECT image, image_type, updated_at FROM categories WHERE id = $1", [parseInt(id, 10) || 0]);
  if (!row?.image) return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 404 });
  return new Response(row.image, {
    headers: {
      "Content-Type": row.image_type || "application/octet-stream",
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Last-Modified": new Date(row.updated_at).toUTCString(),
    },
  });
}

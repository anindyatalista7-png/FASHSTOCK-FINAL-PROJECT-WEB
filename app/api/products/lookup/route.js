import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProductBySku } from "@/lib/data";

// GET /api/products/lookup?sku=ELK-001 -> data ringkas produk (untuk fitur scan)
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user || !["admin", "manager", "staff"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sku = (request.nextUrl.searchParams.get("sku") || "").trim();
  if (!sku) return NextResponse.json({ error: "Parameter sku wajib diisi" }, { status: 400 });
  if (sku.length > 50) return NextResponse.json({ error: "SKU tidak valid" }, { status: 400 });

  const product = await getProductBySku(sku);
  if (!product) return NextResponse.json({ error: `Produk dengan SKU "${sku}" tidak ditemukan` }, { status: 404 });
  return NextResponse.json({ product });
}

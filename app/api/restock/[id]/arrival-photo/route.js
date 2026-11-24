import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await queryOne("SELECT supplier_id, arrival_photo, arrival_photo_mime FROM restock_orders WHERE id = $1", [id]);
  if (!order) return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
  if (user.role === "supplier" && user.id !== order.supplier_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!order.arrival_photo) return NextResponse.json({ error: "Foto belum diunggah" }, { status: 404 });
  return new Response(new Uint8Array(order.arrival_photo), {
    headers: { "Content-Type": order.arrival_photo_mime, "Cache-Control": "private, no-store", "Content-Disposition": "inline" }
  });
}

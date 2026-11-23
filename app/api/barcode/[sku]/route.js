import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { code128Svg } from "@/lib/code128";

function safeDecode(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

// GET /api/barcode/:sku -> Barcode Code 128 (SVG) berisi SKU produk
//   ?text=0 untuk menyembunyikan teks SKU di bawah barcode
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sku } = await params;
  const text = safeDecode(sku).trim().toUpperCase();
  if (!text || text.length > 50 || !/^[\x20-\x7F]+$/.test(text)) {
    return NextResponse.json({ error: "SKU tidak valid" }, { status: 400 });
  }
  const showText = request.nextUrl.searchParams.get("text") !== "0";
  const svg = code128Svg(text, { module: 2, height: 64, showText });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

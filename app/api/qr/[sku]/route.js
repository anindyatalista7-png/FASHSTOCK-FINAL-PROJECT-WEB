import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

function safeDecode(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

// GET /api/qr/:sku -> QR Code (SVG) berisi SKU produk
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sku } = await params;
  const text = safeDecode(sku).trim().toUpperCase();
  if (!text || text.length > 50) return NextResponse.json({ error: "SKU tidak valid" }, { status: 400 });
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextResponse } from "next/server";

const SESSION_COOKIE = "fashstock_session";
const PUBLIC_PATHS = ["/login", "/register"];

// Lapisan proteksi pertama: halaman privat wajib punya cookie sesi.
// Validasi sesi sesungguhnya (token, role, status supplier) dilakukan di server (lib/auth.js).
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isPublic && !hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|robots.txt).*)"],
};

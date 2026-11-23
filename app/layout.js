import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata = {
  title: { default: "FashStock", template: "%s · FashStock" },
  description: "Sistem Manajemen Gudang - inventori, stok, transaksi, dan restock.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#713E4A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

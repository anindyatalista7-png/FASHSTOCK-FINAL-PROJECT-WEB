
import "./globals.css";

export const metadata = {
  title: "FashStock | Fashion Warehouse",
  description:
    "Sistem Informasi Manajemen Gudang Fashion dan Pakaian",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

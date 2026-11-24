/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg & bcryptjs dijalankan apa adanya di server (tidak di-bundle)
  serverExternalPackages: ["pg", "bcryptjs", "qrcode"],
  experimental: {
    serverActions: {
      // gambar produk/kategori dikirim lewat Server Action (maks 2 MB per file)
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;

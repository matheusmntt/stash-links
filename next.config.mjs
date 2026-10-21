/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Cliente do Turso/libSQL tem partes nativas: fica fora do bundle do servidor
  serverExternalPackages: ["@libsql/client", "libsql"],
  // Garante que a pasta da extensão vá junto no deploy (download em /api/extension)
  outputFileTracingIncludes: {
    "/api/extension": ["./extension/**/*"],
  },
}

export default nextConfig

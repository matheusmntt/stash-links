/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Garante que a pasta da extensão vá junto no build (download em /api/extension)
  outputFileTracingIncludes: {
    "/api/extension": ["./extension/**/*"],
  },
}

export default nextConfig

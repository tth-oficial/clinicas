import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir imagens externas (logos das clínicas no Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },

  // Ignorar ESLint no build da Vercel para não travar o deploy
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

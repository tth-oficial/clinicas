import type { NextConfig } from "next";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '')

const csp = [
  "default-src 'self'",
  `connect-src 'self' ${SUPABASE_URL} wss://${supabaseHost} https://api.openai.com https://*.upstash.io`,
  "img-src 'self' data: blob: https://*.supabase.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy',    value: csp },
  { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options',     value: 'nosniff' },
  { key: 'X-Frame-Options',            value: 'DENY' },
  { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

/** @see https://nextjs.org/docs/app/api-reference/config/next-config-js */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ]
  },
};

export default nextConfig;

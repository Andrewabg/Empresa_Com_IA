import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'





const rootDir = dirname(fileURLToPath(import.meta.url))







const securityHeaders: Array<{ key: string; value: string }> = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), browsing-topics=()' },
  
]

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' })
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: rootDir,
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },

  
  
  
  serverExternalPackages: [
    'simple-git', 
    'unpdf',      
    '@napi-rs/canvas', 
    '@mastra/core',
    '@composio/core',
    'sharp',      
  ],

  experimental: {
    
    
    optimizePackageImports: [
      'motion',
      'ogl',
      '@radix-ui/react-dialog',
      '@radix-ui/react-visually-hidden',
    ],
  },
}

export default nextConfig

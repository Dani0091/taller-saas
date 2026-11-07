import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Raíz del proyecto para tracing de archivos (Next.js 16+)
  outputFileTracingRoot: process.cwd(),

  // Output standalone para deploy optimizado (Docker, VPS, etc.)
  output: 'standalone',

  // Variables de entorno del servidor (accesibles en API routes)
  // IMPORTANTE: Las variables sin NEXT_PUBLIC_ solo están en el servidor
  serverExternalPackages: ['tesseract.js'],

  // Configuración de entorno para Railway/producción
  env: {
    // Las variables TELEGRAM_* se leen de process.env en runtime
    // No necesitan estar aquí, pero documentamos que son requeridas
  },

  // Optimizaciones de producción
  poweredByHeader: false,

  // Compresión habilitada
  compress: true,

  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.telegram.org',
      },
    ],
    // Formatos optimizados
    formats: ['image/avif', 'image/webp'],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    // Optimizar imports de paquetes grandes
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'date-fns',
    ],
  },
};

export default nextConfig;

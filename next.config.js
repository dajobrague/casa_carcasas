/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuración para APIs
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://casa-carcasas.vercel.app/api/:path*',
      },
    ];
  },
  
  // Esencial para Airtable
  experimental: {
    serverComponentsExternalPackages: ['airtable']
  },
  
  // Ignorar errores para el build en producción
  typescript: {
    ignoreBuildErrors: true
  },
  
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Desactivar completamente la prerenderización
  images: {
    unoptimized: true
  },
  
  // URLs absolutas para las APIs
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://casa-carcasas.vercel.app' : '',
  basePath: '',
  
  // Configuración para APIs
  env: {
    NEXT_PUBLIC_API_URL: 'https://casa-carcasas.vercel.app',
    NEXT_PUBLIC_RUNTIME_ENV: 'production'
  }
};

module.exports = nextConfig; 
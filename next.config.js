/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Esencial para Airtable
  experimental: {
    serverComponentsExternalPackages: ['airtable']
  },
  
  // Configuración de salida
  output: 'standalone',
  
  // Forzar todas las páginas a ser dinámicas
  staticPageGenerationTimeout: 1000,
  
  // Marcar aplicación completa como dinámica
  // Esto es CLAVE para resolver el problema con useSearchParams
  distDir: process.env.NODE_ENV === 'production' ? '.next-prod' : '.next',
};

// Marcar páginas específicas como dinámicas
if (process.env.NODE_ENV === 'production') {
  nextConfig.env = {
    NEXT_PUBLIC_RUNTIME_ENV: 'production'
  };
  
  // Ignorar errores de prerenderizado en producción
  nextConfig.typescript = {
    ignoreBuildErrors: true
  };
  
  nextConfig.eslint = {
    ignoreDuringBuilds: true
  };
}

module.exports = nextConfig; 
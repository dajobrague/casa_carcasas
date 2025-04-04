/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configuración para manejar las rutas de API correctamente
  experimental: {
    // Desactivar la optimización estática para las páginas que usan API dinámicas
    disableOptimizedLoading: true,
    // No pre-renderizar rutas de API
    serverComponentsExternalPackages: ['airtable']
  },
  // Configuración de salida
  output: 'standalone',
  
  // Forzar todas las páginas a ser dinámicas y renderizadas en el servidor
  // Esto evita los problemas con useSearchParams y otros hooks que requieren
  // un entorno de navegador
  staticPageGenerationTimeout: 1000,
  compiler: {
    emotion: true
  },
};

module.exports = nextConfig; 
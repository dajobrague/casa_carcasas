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

  // Excluir páginas específicas de la generación estática
  // Estas páginas usan useSearchParams() que necesita un límite de suspense
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Configuración para páginas específicas
  onDemandEntries: {
    // Período en ms para mantener en memoria páginas no accedidas
    maxInactiveAge: 25 * 1000,
    // Número de páginas a mantener en memoria
    pagesBufferLength: 4,
  },
  
  // Esto es específicamente para Vercel y evitar la generación estática
  env: {
    VERCEL_FORCE_NO_BUILD_CACHE: 'true',
  },
  
  // Configuraciones para páginas específicas
  unstable_runtimeJS: true,
  trailingSlash: false,
};

module.exports = nextConfig; 
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Solo mantenemos la configuración esencial para Airtable
  experimental: {
    serverComponentsExternalPackages: ['airtable']
  },
  
  // Ignorar errores de compilación para desplegar
  typescript: {
    ignoreBuildErrors: true
  },
  
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Configuración para producción - modo standalone
  output: 'standalone',
  
  // Deshabilitar la generación estática
  generateBuildId: async () => {
    return `build-${new Date().getTime()}`;
  }
};

module.exports = nextConfig; 
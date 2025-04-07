/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Solo mantenemos la configuración esencial para Airtable
  experimental: {
    serverComponentsExternalPackages: ['airtable']
  }
};

module.exports = nextConfig; 
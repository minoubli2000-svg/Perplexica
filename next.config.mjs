/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  output: 'standalone',
  devIndicators: isDev ? false : undefined, // Désactive l'UI dev en local
  reactStrictMode: true,                    // Active les contraintes React
  swcMinify: true,                          // Minification rapide
  images: {
    domains: ['localhost'],                 // Ajoute ici tes domaines d'images
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',                    // Applique les headers sur toutes les routes
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' }
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/auth', destination: '/' }
    ];
  },
};

export default nextConfig;


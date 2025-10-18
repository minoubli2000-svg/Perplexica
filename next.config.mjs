/** next.config.mjs */
/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // Génération d’un build autonome
  output: 'standalone',

  // Indicateurs de dev désactivés en local
  devIndicators: isDev ? false : undefined,

  // Mode strict React
  reactStrictMode: true,

  // Configuration des images
  images: {
    domains: ['localhost', 'host.docker.internal'],
    formats: ['image/webp', 'image/avif'],
  },

  // Ajout des en-têtes de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },

  // Réécriture d’URL simple
  async rewrites() {
    return [{ source: '/auth', destination: '/' }];
  },

  // Pour autoriser les origines en dev, lance Next.js avec :
  // npx next dev --experimental-allowed-dev-origins=http://localhost:3000,http://host.docker.internal:3000
};

export default nextConfig;








/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração para rotas públicas
  async rewrites() {
    return [
      {
        source: '/formulario-publico',
        destination: '/FormularioPublico',
      },
      {
        source: '/api/submit-public-form',
        destination: '/api/submit-public-form',
      },
    ];
  },
}

module.exports = nextConfig

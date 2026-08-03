import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // PROVISIONAL: la raíz sirve el mockup estático de Design para poder
      // compartir un enlace limpio. Cuando la landing se implemente de
      // verdad como página, se borra este bloque y la raíz vuelve a
      // src/app/page.tsx.
      beforeFiles: [{ source: '/', destination: '/landing.html' }],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig

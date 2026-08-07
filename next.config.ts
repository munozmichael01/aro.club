import type { NextConfig } from 'next'

/**
 * Las cinco pantallas de la entrega se sirven tal cual desde `public/`, con
 * su nombre de archivo original: se enlazan entre sí por ese nombre y
 * renombrarlas obligaría a editar los enlaces dentro del HTML de diseño.
 *
 * Encima van rutas limpias, que son las que se comparten. Los enlaces
 * internos siguen resolviendo contra la raíz, así que no hay que tocarlos.
 */
const PANTALLAS: Array<[string, string]> = [
  // Entrega 1 · captación
  ['/', '/Aro Club - Landing v3.dc.html'],
  ['/cuestionario', '/Aro Club - Cuestionario.dc.html'],
  ['/gracias', '/Aro Club - Agradecimiento.dc.html'],
  ['/legal', '/Aro Club - Legal.dc.html'],
  ['/sistema', '/Aro Club - Sistema v3.dc.html'],
  // Entrega 2 · área de miembro
  ['/entrar', '/Aro Club - Entrar.dc.html'],
  ['/verificacion', '/Aro Club - Verificacion.dc.html'],
  ['/cuenta', '/Aro Club - Mi cuenta.dc.html'],
  ['/perfil', '/Aro Club - Mi perfil.dc.html'],
  // Entrega 3 · datos base y la revelación
  ['/datos', '/Aro Club - Datos base.dc.html'],
  ['/mesa', '/Aro Club - Mi mesa.dc.html'],
]

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: PANTALLAS.map(([source, destination]) => ({ source, destination })),
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig

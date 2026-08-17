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
  ['/', '/Aro Club - Landing v4.dc.html'],
  ['/cuestionario', '/Aro Club - Cuestionario.dc.html'],
  ['/gracias', '/Aro Club - Agradecimiento.dc.html'],
  ['/legal', '/Aro Club - Legal.dc.html'],
  ['/sistema', '/Aro Club - Sistema v3.dc.html'],
  // Entrega 2 · área de miembro
  ['/entrar', '/Aro Club - Entrar.dc.html'],
  ['/clave', '/Aro Club - Clave.dc.html'],
  ['/verificacion', '/Aro Club - Verificacion.dc.html'],
  ['/cuenta', '/Aro Club - Mi cuenta.dc.html'],
  ['/perfil', '/Aro Club - Mi perfil.dc.html'],
  // Entrega 3 · datos base y la revelación
  ['/datos', '/Aro Club - Datos base.dc.html'],
  ['/mesa', '/Aro Club - Mi mesa.dc.html'],
  // Entrega 4 · la transacción y la operación
  ['/pago', '/Aro Club - Pago.dc.html'],
  ['/cancelar', '/Aro Club - Cancelar.dc.html'],
  ['/operacion', '/Aro Club - Operacion.dc.html'],
  // Entrega 7 y 8 · la ficha de miembro y los locales, ambas de operación
  ['/miembro', '/Aro Club - Perfil miembro.dc.html'],
  ['/locales', '/Aro Club - Locales.dc.html'],
  // Entrega 11 · la segunda landing.
  //
  // Vive aquí y NO se enlaza desde ningún sitio: la v3 sigue siendo la
  // pública. No hay reparto de tráfico ni cookie de variante —eso se define
  // cuando se decida arrancar el test—; lo único montado es que cada página
  // dice de cuál viene el lead.
  // La v3 sigue servida y entera, pero ya no la enlaza nadie: se entra a
  // mano por /v3. No se borra porque es la que ha visto todo el trafico
  // hasta hoy y los leads existentes estan atribuidos a ella.
  ['/v3', '/Aro Club - Landing v3.dc.html'],
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

import type { NextConfig } from 'next'

/**
 * Las pantallas de la entrega se sirven tal cual desde `public/`, con su
 * nombre de archivo original, y encima van las rutas limpias, que son las que
 * se comparten.
 *
 * Durante nueve entregas los enlaces internos apuntaron al nombre del
 * fichero. Funcionaba, y por eso no se vio: las rutas limpias existían y no
 * llegaba nadie por ellas, y la misma página respondía en dos URLs distintas
 * —las dos con 200—. Un producto que enseña `Aro Club - Mi cuenta.dc.html` en
 * la barra está contando cómo está hecho por dentro, y dos direcciones para
 * una página es lo que parte las estadísticas y lo que un buscador indexa dos
 * veces.
 *
 * Desde el 18 de agosto:
 *
 *   · los enlaces internos usan la ruta limpia, la de aquí abajo;
 *   · el nombre del fichero redirige a ella, permanente, para que la URL fea
 *     deje de estar viva aunque siga compartida por ahí.
 *
 * **El efecto secundario, dicho y no escondido:** las maquetas de Design ya no
 * navegan al abrirlas con doble clic desde el disco, porque `/legal` no existe
 * en `file://`. Se previsualizan levantando el servidor. A cambio el producto
 * deja de enseñar nombres de fichero.
 */

/** Ruta limpia → fichero que la sirve. */
const PANTALLAS: Array<[string, string]> = [
  // Entrega 1 · captación
  ['/', '/Aro Club - Landing v4.dc.html'],
  ['/cuestionario', '/Aro Club - Cuestionario.dc.html'],
  ['/gracias', '/Aro Club - Agradecimiento.dc.html'],
  ['/sistema', '/Aro Club - Sistema v3.dc.html'],
  // Lo legal es UNA pantalla con tres secciones, y cada una tiene su URL.
  // `/privacidad` es la que se enlaza desde el alta y hasta hoy daba 404:
  // existía solo como ancla, así que el enlace del formulario llevaba a
  // ningún sitio. Las tres entran por rutas propias y la pantalla se coloca
  // en la sección que le toca leyendo su propia dirección.
  ['/legal', '/Aro Club - Legal.dc.html'],
  ['/reglas', '/Aro Club - Legal.dc.html'],
  ['/terminos', '/Aro Club - Legal.dc.html'],
  ['/privacidad', '/Aro Club - Legal.dc.html'],
  // Entrega 2 · área de miembro
  ['/entrar', '/Aro Club - Entrar.dc.html'],
  // Las dos pantallas sin sesión viven en el mismo fichero: comparten fondo
  // verde, campo y estados —vale / caducado / hecho— y separarlas sería
  // mantener dos veces lo mismo. La URL decide cuál se abre.
  ['/clave', '/Aro Club - Sin sesion.dc.html'],
  ['/baja', '/Aro Club - Sin sesion.dc.html'],
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
  // Vive aquí y NO se enlaza desde ningún sitio: la v4 es la pública. No hay
  // reparto de tráfico ni cookie de variante —eso se define cuando se decida
  // arrancar el test—; lo único montado es que cada página dice de cuál viene
  // el lead. La v3 sigue servida y entera, pero ya no la enlaza nadie: se
  // entra a mano por /v3. No se borra porque es la que ha visto todo el
  // tráfico hasta hoy y los leads existentes están atribuidos a ella.
  ['/v3', '/Aro Club - Landing v3.dc.html'],
]

/**
 * Fichero → la ruta limpia a la que redirige.
 *
 * Se deriva del mapa de arriba para que no haya una segunda lista que
 * mantener. Cuando un fichero sirve a varias rutas gana la primera, salvo el
 * de sin sesión: un nombre de fichero suelto no dice si venías a darte de
 * baja o a cambiar la clave, y sin token las dos acaban en el mismo sitio
 * —«este enlace ya no vale»—, así que se manda a la que ya elige por defecto.
 */
const CANONICA: Record<string, string> = { '/Aro Club - Sin sesion.dc.html': '/baja' }
for (const [limpia, fichero] of PANTALLAS) {
  if (!CANONICA[fichero]) CANONICA[fichero] = limpia
}

const nextConfig: NextConfig = {
  async redirects() {
    // 308 y no 307: es permanente. Un temporal deja que el buscador siga
    // prefiriendo la URL con el nombre del fichero dentro.
    return Object.entries(CANONICA).map(([fichero, limpia]) => ({
      // `source` se compara contra la ruta TAL COMO LLEGA, y un navegador
      // manda los espacios como %20. Con el nombre sin codificar la regla no
      // casa nunca y la URL fea sigue devolviendo 200 tan tranquila: no falla,
      // simplemente no redirige. Comprobado a mano antes de darlo por bueno.
      source: encodeURI(fichero),
      destination: limpia,
      permanent: true,
    }))
  },
  async rewrites() {
    return {
      beforeFiles: PANTALLAS.map(([source, destination]) => ({ source, destination })),
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig

/**
 * Los enlaces de aro.club que abren la app (los de los correos).
 *
 * La app se declara dueña de estas rutas (`associatedDomains` en iOS,
 * `intentFilters` en Android, en `app.json`) y la web publica los ficheros de
 * `/.well-known/` que lo confirman. Si una ruta se añade aquí, va también en
 * `app.json` y en esos ficheros: las tres listas son la misma.
 *
 * Solo las del área de miembro. La landing, lo legal, `/clave` y `/baja`
 * (que llevan un token de un solo uso de la web) y la operación siguen en el
 * navegador.
 */
export const RUTAS_DE_LA_WEB: Record<string, string> = {
  '/cuenta': '/cuenta',
  '/perfil': '/perfil',
  '/mesa': '/mesa',
  // La que lleva el correo del día después; en la app es la misma pantalla.
  '/mi-mesa': '/mesa',
  '/pago': '/pago',
  '/cancelar': '/cancelar',
  '/verificacion': '/verificacion',
  // Datos y cuestionario los decide el embudo (`index`), no el enlace: la app
  // tiene su propio orden y un correo viejo no sabe por dónde vas.
  '/datos': '/',
  '/cuestionario': '/',
}

/** Solo estos parámetros pasan del enlace a la pantalla. */
const PARAMETROS = ['evento', 'mesa']

/**
 * La ruta de la app para un enlace que la abre. `https://aro.club/mi-mesa?evento=…`
 * → `/mesa?evento=…`. Lo que no es de aro.club (el esquema `aroclub://`, los
 * enlaces internos de Expo) se deja como llega.
 */
export function rutaDeEnlace(enlace: string): string {
  let url: URL
  try {
    url = new URL(enlace)
  } catch {
    return enlace
  }
  if (url.protocol !== 'https:' || (url.hostname !== 'aro.club' && url.hostname !== 'www.aro.club')) return enlace
  const ruta = RUTAS_DE_LA_WEB[url.pathname.replace(/\/+$/, '') || '/']
  if (!ruta) return '/'
  const q = new URLSearchParams()
  for (const p of PARAMETROS) {
    const v = url.searchParams.get(p)
    if (v && /^[0-9a-f-]{36}$/i.test(v)) q.set(p, v)
  }
  const resto = q.toString()
  return resto ? `${ruta}?${resto}` : ruta
}

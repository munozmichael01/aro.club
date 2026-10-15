import { createHash } from 'node:crypto'

import { SITIO } from '@/lib/remitente'

/**
 * La dirección de la foto de la entrada de un local.
 *
 * Una sola función porque la piden tres sitios —Mi mesa de la web, la
 * respuesta que lee la app y los dos correos de la mesa— y tienen que pedir
 * exactamente la misma: si cada uno la arma a su manera, el día que cambie la
 * ruta hay tres sitios donde acordarse.
 *
 * Absoluta, no relativa: la app no está en nuestro dominio y un correo
 * tampoco. `SITIO` es lo mismo que usan los enlaces de los veintidós correos.
 *
 * La `v` es la caché, y es lo que permite guardarla para siempre. Sale de la
 * ruta del fichero, que cambia en cada subida: con otra foto, otra `v`, otra
 * dirección y nadie viendo la vieja. Sin esto habría que elegir entre que un
 * cambio tardara un día en verse o servir la foto sin caché a todo el mundo.
 */
export function urlDeFotoDeLocal(
  id: string | null | undefined,
  ruta: string | null | undefined,
): string | null {
  if (!id || !ruta) return null
  const v = createHash('sha1').update(ruta).digest('hex').slice(0, 8)
  return `${SITIO}/api/local/foto?id=${encodeURIComponent(id)}&v=${v}`
}

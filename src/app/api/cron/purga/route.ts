import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Borrar las cédulas viejas, todas las noches.
 *
 * La pantalla de verificación le promete a quien sube su documento cuatro
 * cosas, y esta era la única que no cumplía nadie: «se borra a los 90 días».
 * La función estaba escrita en la base desde el 9 de agosto y no la llamaba
 * ninguna ruta ni ningún cron. La promesa existía, el mecanismo existía, y el
 * documento se quedaba ahí para siempre.
 *
 * De las cuatro promesas, esta es la que más cuesta descubrir que está rota
 * —no falla nada, no da error, simplemente no pasa— y la peor el día que
 * alguien mire dentro del bucket.
 *
 * Y al ejecutarla salió que tampoco habría funcionado: Supabase prohíbe
 * borrar de `storage.objects` con SQL, porque eso deja el fichero huérfano.
 * Así que la base dice QUÉ borrar y aquí se borra con la API.
 *
 * El orden importa: primero el fichero, después vaciar la ruta. Si el borrado
 * falla, la fila conserva la ruta y mañana se vuelve a intentar. Al revés
 * perderíamos la pista del fichero con el fichero todavía ahí.
 *
 * Corre a las 3:30 de la mañana de Caracas: no compite con la tasa ni con el
 * recordatorio, y a esa hora no hay nadie subiendo fotos.
 */

/** De cien en cien: `remove` acepta una lista, no diez mil rutas. */
const POR_TANDA = 100

async function purgar() {
  const admin = createAdminClient()

  const { data: viejas, error } = await admin.rpc('documentos_a_purgar')

  if (error) {
    console.error('[purga] no se pudo leer qué borrar', error)
    return NextResponse.json({ error: 'No se pudo purgar.' }, { status: 500 })
  }

  const pendientes = (viejas ?? []) as { id: string; storage_path: string }[]
  if (!pendientes.length) return NextResponse.json({ borradas: 0 })

  let borradas = 0
  const fallidas: string[] = []

  for (let i = 0; i < pendientes.length; i += POR_TANDA) {
    const tanda = pendientes.slice(i, i + POR_TANDA)
    const rutas = tanda.map((v) => v.storage_path)

    const { error: errorBorrado } = await admin.storage.from('verificaciones').remove(rutas)

    if (errorBorrado) {
      // No se vacía la ruta: el fichero sigue ahí y mañana se reintenta.
      console.error('[purga] no se borraron los ficheros', errorBorrado)
      fallidas.push(...rutas)
      continue
    }

    // La fila se queda: la marca de que la verificación ocurrió —y de que se
    // rechazó, y por qué— es justo lo que hay que conservar. El escaneo de
    // una cédula no.
    const { error: errorFilas } = await admin
      .from('verifications')
      .update({ storage_path: null } as never)
      .in('id', tanda.map((v) => v.id))

    if (errorFilas) {
      // El fichero ya no está. Que la fila siga apuntando a una ruta muerta
      // es feo, pero es recuperable y no expone nada.
      console.error('[purga] ficheros borrados pero filas sin actualizar', errorFilas)
    }

    borradas += tanda.length
  }

  console.log('[purga] documentos borrados:', borradas, fallidas.length ? '· fallaron ' + fallidas.length : '')

  return NextResponse.json({ borradas, fallidas: fallidas.length })
}

/**
 * Vercel llama por GET con `Authorization: Bearer <CRON_SECRET>`. Sin el
 * secreto no existe: 404 y no 401, porque un 401 confirma que la ruta está.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  return purgar()
}

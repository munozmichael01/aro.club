import { NextResponse } from 'next/server'

import { despacharPendientes } from '@/lib/correos'

/**
 * El otro lado de la cola: leerla y mandar.
 *
 * `scheduled_emails` llevaba desde el principio siendo un cuaderno. Se
 * apuntaba qué habría que mandar, a quién y cuándo —y eso está bien, es lo
 * que permite programar la mesa para el jueves a mediodía en vez de mandarla
 * al publicar— pero nadie lo leía. Esto lo lee.
 *
 * Tres reglas:
 *
 *   **Nada sale antes de su hora.** `send_at` manda. El correo de la mesa se
 *   programa al publicar y sale en la revelación; adelantarlo rompe el
 *   producto entero.
 *
 *   **Nada sale dos veces.** `sent_at` se escribe al mandarlo, y solo se
 *   toman las que lo tienen vacío. Un correo repetido es peor que uno que no
 *   llega: el que no llega se puede reenviar.
 *
 *   **Un fallo no para la cola.** Si uno no se puede armar —el perfil se dio
 *   de baja, la mesa ya no existe— se anota y se sigue con el siguiente.
 *
 * Sin `RESEND_API_KEY` no manda nada y lo dice. Se puede ejecutar entero para
 * ver qué saldría sin escribirle a nadie.
 */

/**
 * Cinco minutos de margen para la vuelta.
 *
 * Ninguna ruta del proyecto declaraba su tope y todas corrían con el de por
 * defecto, que es el que había que adivinar cada vez que se tocaba el tamaño
 * del lote. Con el bulto en cien por vuelta —el resumen de los lunes son
 * seiscientos correos— una vuelta tarda cerca de un minuto, y eso merece un
 * número escrito en vez de una suposición.
 *
 * De cuántos en cuántos lo decide `despacharPendientes`, que es quien manda:
 * aquí vivía una constante `POR_VUELTA = 50` que no usaba nadie y que decía
 * un número distinto del real. Una cifra muerta que contradice a la viva es
 * la forma barata de tomar una decisión equivocada dentro de un año.
 */
export const maxDuration = 300

/**
 * Vercel llama por GET con `Authorization: Bearer <CRON_SECRET>`.
 *
 * Con `?seco=1` arma y pinta todo sin mandar nada: es como se comprueba que
 * las trece plantillas se rellenan con datos de verdad sin escribirle a
 * nadie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  // Se delega en `lib/correos`, que es el mismo despachador que usa `encolar`
  // para mandar al momento.
  //
  // Antes esta ruta tenia su propia copia del bucle, y en cuanto aparecio la
  // baja de correos quedo un despachador que la respetaba y otro que no: la
  // misma cola daba dos resultados segun quien la pasara, y el ensayo en seco
  // —justo lo que se usa para comprobar que todo esta bien— era el que no la
  // respetaba. Dos copias de una regla es una regla y media.
  const seco = url.searchParams.get('seco') === '1'
  // `?seco=1&fila=<id>` ensaya UNA fila por su id, tenga la hora que tenga.
  // Es como se comprueba un aviso nuevo sin dejarlo vencido en la cola de
  // producción, donde el cron de cada cuarto de hora lo mandaría de verdad.
  const r = await despacharPendientes(seco, seco ? (url.searchParams.get('fila') ?? undefined) : undefined)
  return NextResponse.json(r)
}

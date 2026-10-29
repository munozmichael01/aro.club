import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * «Es hoy». El recordatorio del día de la cena.
 *
 * Es la cuarta plantilla de Design y no la encolaba nadie: la única de las
 * ocho que necesita que alguien mire el reloj, y no había quien lo mirara.
 * En un producto donde la dirección se revela el mismo día, el recordatorio
 * no es cortesía —es cómo sabe la gente dónde presentarse.
 *
 * Se manda a quien tiene mesa asignada en una cena de HOY. No a quien
 * reservó y se quedó sin mesa: a esa persona no hay dónde decirle que vaya.
 *
 * Idempotente por partida doble: se filtra por lo que ya está encolado para
 * ese evento, y `send_at` se fija a la hora de la cena. Si el cron corre dos
 * veces —o alguien lo llama a mano— no se duplica.
 */

export const dynamic = 'force-dynamic'

async function recordar(seco: boolean) {
  const admin = createAdminClient()

  /**
   * LAS DE MAÑANA, por el calendario de Caracas.
   *
   * Michael, 29-10: «la víspera hay que mandársela a todos, con mesa o sin
   * mesa; hasta las 11:59 tengo para elegir local, esa es la gracia».
   *
   * Salía el MISMO DÍA a las nueve, y eso lo ataba a que el reparto ya
   * estuviera publicado a esa hora. El 29-10 las mesas se crearon a las
   * 10:02 y el cron había pasado a las 9:00: miró, no encontró a nadie
   * sentado, y las ocho personas que cenaban esa noche se quedaron sin
   * aviso. Pasa una vez al día y no vuelve.
   *
   * La víspera no depende de nada de eso: la fecha existe desde que se
   * abre, y quien reservó ya sabe que tiene plan. El local llega después.
   *
   * El día se calcula en Caracas y no en UTC. Vercel corre en UTC, y una
   * cena de las siete de la tarde de Caracas es la una de la madrugada del
   * día siguiente en UTC: preguntando por «mañana» en UTC se cuela la de
   * pasado mañana y se escapa la de mañana.
   */
  const ahora = new Date()
  const enCaracas = (t: number) => new Date(t - 4 * 3600_000)
  const hoyCcs = enCaracas(ahora.getTime())
  // Medianoche de MAÑANA en Caracas, y la de pasado mañana, en instantes.
  const medianocheManana = Date.UTC(
    hoyCcs.getUTCFullYear(), hoyCcs.getUTCMonth(), hoyCcs.getUTCDate() + 1,
  ) + 4 * 3600_000
  const desde = new Date(medianocheManana)
  const hasta = new Date(medianocheManana + 24 * 3600_000)

  const { data: eventos } = await admin
    .from('events')
    .select('id, starts_at')
    .gte('starts_at', desde.toISOString())
    .lt('starts_at', hasta.toISOString())
    // Las de prueba no le salen a nadie, y esta ruta no las filtraba.
    .eq('es_prueba', false)
    /**
     * Cualquiera menos una cancelada, y no `matched` a secas.
     *
     * Filtraba por `['matched','running']`, y eso ataba el recordatorio a que
     * alguien hubiera publicado DESPUÉS del cierre: era `publicar` quien ponía
     * `matched`. Desde que publicar no cierra la fecha —no debe, porque eso
     * dejaba a la gente sin poder reservar días antes de tiempo— una fecha con
     * todas sus mesas publicadas temprano se habría quedado en `open` y sus
     * comensales sin recordatorio la mañana de la cena.
     *
     * A quién se le recuerda no lo dice el estado: lo dice estar sentado en
     * una mesa. Eso se mira tres líneas más abajo y es la única condición que
     * importa. Lo único que el estado tiene que decir aquí es que la cena se
     * hace, y para eso basta con que no esté cancelada.
     */
    .neq('status', 'cancelled')

  if (!eventos?.length) return NextResponse.json({ eventos: 0, encolados: 0, seco })

  let encolados = 0

  for (const ev of eventos) {
    /**
     * QUIEN RESERVÓ, tenga mesa o no. Michael, 29-10.
     *
     * Miraba `table_members`, o sea solo a quien ya estaba sentado, y eso
     * es justo lo que no se sabe la víspera: el reparto puede no estar
     * hecho todavía y el local se elige hasta las 11:59 del día.
     *
     * `pending_payment` entra a propósito: quien apartó su puesto y aún no
     * ha reportado el pago es a quien más le sirve que le recuerden que es
     * mañana. A quien canceló, no.
     *
     * Se piden los `profile_id` y NADA MÁS. Esta consulta traía antes el
     * restaurante, su dirección y el número de mesa, y los metía en el
     * payload del correo: el dato salía de la zona segura por la puerta de
     * atrás y se quedaba escrito en `scheduled_emails.payload` horas antes
     * de la revelación. Lo que no se lee no se puede filtrar. Lo cazó
     * cowork, y por eso esto pide una sola columna.
     */
    const { data: reservados } = await admin
      .from('bookings')
      .select('profile_id')
      .eq('event_id', ev.id)
      .in('status', ['confirmed', 'pending_payment'])

    if (!reservados?.length) continue

    // Lo ya encolado para esta cena, para no repetir.
    const { data: yaHay } = await admin
      .from('scheduled_emails')
      .select('profile_id')
      .eq('event_id', ev.id)
      .eq('kind', 'recordatorio')

    const yaTienen = new Set((yaHay ?? []).map((r) => r.profile_id))

    for (const s of reservados) {
      if (!s.profile_id || yaTienen.has(s.profile_id)) continue

      // El payload va vacío a propósito. La hora se lee del evento al
      // componer, como todo lo demás: `empiezaEn` era una copia de
      // `events.starts_at` que además podía quedarse vieja si la fecha se
      // movía entre encolar y enviar.
      if (seco) {
        encolados++
        continue
      }

      await encolar({ perfil: s.profile_id }, 'recordatorio', {}, { eventoId: ev.id })
      encolados++
    }
  }

  return NextResponse.json({ eventos: eventos.length, encolados, seco })
}

/**
 * Mismo candado que el cron de la tasa: sin el secreto no se entra, y 404 en
 * vez de 401 para no confirmar que la ruta existe.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  // `?seco=1`: cuenta a cuanta gente iria y no escribe. Lo pide la regla de
  // la casa —no hay staging, y encolar es mandar— y aqui ademas hacia falta
  // para comprobar el texto nuevo sin escribirle a la mesa del viernes.
  return recordar(new URL(request.url).searchParams.get('seco') === '1')
}

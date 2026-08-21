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

async function recordar() {
  const admin = createAdminClient()

  // Una ventana explícita, no «hasta el final del día».
  //
  // `setHours(23,59)` usa la hora LOCAL DEL SERVIDOR, que en Vercel es UTC
  // mientras las cenas son hora de Caracas —cuatro horas menos—. Una cena de
  // las nueve de la noche cae en el día siguiente en UTC y se quedaba fuera:
  // justo la gente a la que hay que recordarle dónde va.
  //
  // El cron corre a las nueve de la mañana de Caracas y las cenas son a las
  // siete de la tarde, así que veinte horas cubren el día entero sin depender
  // de en qué zona horaria corra esto.
  const ahora = new Date()
  const hasta = new Date(ahora.getTime() + 20 * 3600_000)

  const { data: eventos } = await admin
    .from('events')
    .select('id, starts_at')
    .gte('starts_at', ahora.toISOString())
    .lte('starts_at', hasta.toISOString())
    .in('status', ['matched', 'running'])

  if (!eventos?.length) return NextResponse.json({ eventos: 0, encolados: 0 })

  let encolados = 0

  for (const ev of eventos) {
    // Quien tiene sitio, no quien reservó: a quien no se sentó no se le
    // recuerda una cena que no tiene.
    //
    // Se piden los `profile_id` y NADA MÁS. Antes esta consulta traía también
    // el restaurante, su dirección y el número de mesa, y los metía en el
    // payload del correo. `correos-datos` ya no los sirve —el recordatorio
    // dejó de llamar a `laMesaDe()`—, pero el dato salía igual de la zona
    // segura por este otro camino y se quedaba en `scheduled_emails.payload`
    // tres horas antes de la revelación. Hoy no se ve porque la plantilla no
    // lo imprime; el día que alguien añada un campo a este correo, la fuga
    // vuelve sin que nadie se entere. Lo que no se lee no se puede filtrar.
    //
    // Lo cazó cowork.
    const { data: sentados } = await admin
      .from('table_members')
      .select('profile_id, dinner_tables!inner(event_id)')
      .eq('dinner_tables.event_id', ev.id)

    if (!sentados?.length) continue

    // Lo ya encolado para esta cena, para no repetir.
    const { data: yaHay } = await admin
      .from('scheduled_emails')
      .select('profile_id')
      .eq('event_id', ev.id)
      .eq('kind', 'recordatorio')

    const yaTienen = new Set((yaHay ?? []).map((r) => r.profile_id))

    for (const s of sentados) {
      if (yaTienen.has(s.profile_id)) continue

      // El payload va vacío a propósito. La hora se lee del evento al
      // componer, como todo lo demás: `empiezaEn` era una copia de
      // `events.starts_at` que además podía quedarse vieja si la fecha se
      // movía entre encolar y enviar.
      await encolar({ perfil: s.profile_id }, 'recordatorio', {}, { eventoId: ev.id })
      encolados++
    }
  }

  return NextResponse.json({ eventos: eventos.length, encolados })
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

  return recordar()
}

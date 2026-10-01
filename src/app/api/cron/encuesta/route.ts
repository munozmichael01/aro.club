import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { createAdminClient } from '@/lib/supabase/admin'
import { FIN_CENA, VENTANA_VALORAR } from '@/lib/ventana-mesa'

/**
 * «¿Qué tal estuvo?». La encuesta del día siguiente.
 *
 * La plantilla existe desde su entrega —`16-encuesta-despues.html`—, el tipo
 * existe, los datos existen, y **nadie la encolaba**. Era el único momento del
 * recorrido con la pieza escrita y sin remitente.
 *
 * Y no es cortesía: de ahí salen las dos únicas señales que el producto no
 * puede deducir solo. La nota del LOCAL —que decide si se vuelve a reservar
 * ahí— y el «no me vuelvas a sentar con esta persona», que es el veto de tres
 * meses. Sin esto, el reparto repite sitios malos y vuelve a juntar a quien no
 * quiere verse.
 *
 * **Se manda a quien se SENTÓ**, no a quien reservó: a quien no tuvo mesa no
 * se le pregunta qué tal una cena a la que no fue.
 *
 * **Y dentro de la ventana en que todavía se puede valorar.** Las dos cifras
 * salen de `ventana-mesa.ts`, las mismas que usan Mi cuenta y Mi mesa para
 * decidir si enseñan el botón: un correo que invita a valorar cuando la
 * pantalla ya no deja es peor que no mandarlo.
 *
 * Idempotente: se filtra por lo ya encolado para esa fecha. Si el cron corre
 * dos veces no se duplica.
 *
 * **`?seco=1` calcula sin escribir.** No hay staging: esta base es la de
 * producción y `/api/cron/correos` la recorre cada quince minutos, así que una
 * fila encolada de prueba se manda de verdad. Para probar, en seco.
 */

export const dynamic = 'force-dynamic'

async function preguntar(seco: boolean) {
  const admin = createAdminClient()

  // Las cenas que YA terminaron y que todavía se pueden valorar.
  //
  // Se cuenta en instantes, no en días de calendario: `starts_at` es un
  // momento y la comparación no depende de en qué zona corra el cron, que es
  // de donde salieron los días de más del panel.
  const ahora = Date.now()
  const desde = new Date(ahora - VENTANA_VALORAR).toISOString()
  const hasta = new Date(ahora - FIN_CENA).toISOString()

  const { data: eventos } = await admin
    .from('events')
    .select('id, starts_at')
    .gte('starts_at', desde)
    .lte('starts_at', hasta)

  if (!eventos?.length) return NextResponse.json({ eventos: 0, encolados: 0, seco })

  let encolados = 0

  for (const ev of eventos) {
    // Quien se sentó. Solo el `profile_id`: el nombre del sitio lo resuelve
    // `correos-datos` al componer, leyéndolo de la mesa. Traerlo aquí lo
    // dejaría copiado en `scheduled_emails.payload`, que es por donde ya se
    // coló una vez la dirección del restaurante antes de la revelación.
    const { data: sentados } = await admin
      .from('table_members')
      .select('profile_id, dinner_tables!inner(event_id)')
      .eq('dinner_tables.event_id', ev.id)

    if (!sentados?.length) continue

    // Quien ya la tiene encolada, para no repetir.
    const { data: yaHay } = await admin
      .from('scheduled_emails')
      .select('profile_id')
      .eq('event_id', ev.id)
      .eq('kind', 'encuesta_despues')

    const yaTienen = new Set((yaHay ?? []).map((r) => r.profile_id))

    // Y quien YA valoró: pedirle que valore algo que acaba de valorar es
    // decirle que no lo recibimos.
    const { data: yaValoraron } = await admin
      .from('table_feedback')
      .select('profile_id, dinner_tables!inner(event_id)')
      .eq('dinner_tables.event_id', ev.id)

    const hecho = new Set((yaValoraron ?? []).map((r) => r.profile_id))

    for (const s of sentados) {
      if (yaTienen.has(s.profile_id) || hecho.has(s.profile_id)) continue
      if (!seco) {
        await encolar({ perfil: s.profile_id }, 'encuesta_despues', {}, { eventoId: ev.id })
      }
      encolados++
    }
  }

  return NextResponse.json({ eventos: eventos.length, encolados, seco })
}

/**
 * Mismo candado que los demás crons: sin el secreto no se entra, y 404 en vez
 * de 401 para no confirmar que la ruta existe.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  // `?seco=1` calcula y NO escribe. Ver la nota de arriba.
  const seco = new URL(request.url).searchParams.get('seco') === '1'

  return preguntar(seco)
}

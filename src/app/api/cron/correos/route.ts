import { NextResponse } from 'next/server'

import { prepararCorreo, type FilaDeCola } from '@/lib/correos-datos'
import { componer, enviar } from '@/lib/remitente'
import { createAdminClient } from '@/lib/supabase/admin'

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

/** De cuántos en cuántos. Resend deja 100 al día en la cuenta gratis. */
const POR_VUELTA = 50

async function despachar(seco: boolean) {
  const admin = createAdminClient()

  const { data: pendientes, error } = await admin
    .from('scheduled_emails')
    .select('id, profile_id, email, kind, event_id, payload')
    .is('sent_at', null)
    .lte('send_at', new Date().toISOString())
    .order('send_at')
    .limit(POR_VUELTA)

  if (error) {
    console.error('[correos] no se pudo leer la cola', error)
    return NextResponse.json({ error: 'No se pudo leer la cola.' }, { status: 500 })
  }

  const cola = (pendientes ?? []) as FilaDeCola[]
  if (!cola.length) return NextResponse.json({ mandados: 0, quedan: 0 })

  let mandados = 0
  const problemas: { id: string; kind: string; motivo: string }[] = []
  // Lo que se ve en seco: qué asunto sale y si quedó algún hueco sin
  // rellenar. Es la comprobación que importa —una plantilla con un {{ }} a
  // medias se manda igual y se lee fatal— y no enseña el contenido de nadie.
  const enSeco: { kind: string; asunto: string; huecos: number }[] = []

  for (const fila of cola) {
    const listo = await prepararCorreo(fila)

    if ('error' in listo) {
      // No se puede armar y no se va a poder mañana tampoco: se marca como
      // resuelta para que no se reintente cada hora para siempre. Queda el
      // motivo en el log.
      problemas.push({ id: fila.id, kind: fila.kind, motivo: listo.error })
      await admin
        .from('scheduled_emails')
        .update({ sent_at: new Date().toISOString() } as never)
        .eq('id', fila.id)
      continue
    }

    const pintado = await componer(fila.kind, listo.datos)
    if (!pintado) {
      problemas.push({ id: fila.id, kind: fila.kind, motivo: 'sin plantilla' })
      continue
    }

    if (seco) {
      enSeco.push({
        kind: fila.kind,
        asunto: pintado.asunto,
        huecos: (pintado.html.match(/\{\{/g) ?? []).length,
      })
      mandados++
      continue
    }

    const r = await enviar(listo.a, pintado.asunto, pintado.html)

    if (r.estado === 'sin-remitente') {
      // Todavía no hay dominio. Se para entera: la cola se queda como está y
      // saldrá el día que exista, sin haber perdido nada.
      return NextResponse.json({
        mandados: 0,
        quedan: cola.length,
        aviso: 'No hay remitente configurado. La cola se queda intacta.',
      })
    }

    if (r.estado === 'de-prueba') {
      // Se marca como resuelta: no se va a poder mandar nunca y reintentarla
      // cada quince minutos para siempre no ayuda a nadie.
      await admin
        .from('scheduled_emails')
        .update({ sent_at: new Date().toISOString() } as never)
        .eq('id', fila.id)
      problemas.push({ id: fila.id, kind: fila.kind, motivo: 'dirección de prueba: no se manda' })
      continue
    }

    if (r.estado === 'error') {
      // Este SÍ se reintenta: un fallo de red o un límite de la cuenta se
      // arregla solo. No se marca enviado.
      problemas.push({ id: fila.id, kind: fila.kind, motivo: r.motivo })
      continue
    }

    await admin
      .from('scheduled_emails')
      .update({ sent_at: new Date().toISOString() } as never)
      .eq('id', fila.id)

    mandados++
  }

  if (problemas.length) console.error('[correos] no salieron', problemas)

  const { count } = await admin
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .is('sent_at', null)
    .lte('send_at', new Date().toISOString())

  return NextResponse.json({
    mandados,
    quedan: count ?? 0,
    problemas: problemas.length ? problemas : undefined,
    seco: seco ? enSeco : undefined,
  })
}

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

  return despachar(url.searchParams.get('seco') === '1')
}

import { NextResponse } from 'next/server'

import { componerAviso, mandarAviso } from '@/lib/avisos-equipo'
import { partesDe, horaDe, ZONA_POR_DEFECTO } from '@/lib/reglas'
import { problemasDe } from '@/lib/revision-previa'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Diez minutos antes de revelar: qué se va a quedar fuera.
 *
 * El 17-10 cinco personas pagaron, tuvieron su mesa armada, y esa mesa no se
 * publicó nunca: rompía tres reglas y el panel la frena a propósito, porque
 * forzar es una decisión de alguien. A las doce salió la revelación de las
 * otras cuatro mesas y a ellas no les llegó nada —ni mesa, ni «esta vez no»,
 * ni el crédito de vuelta— porque las dos cosas van pegadas a publicar. Se
 * supo porque una de ellas escribió por Instagram.
 *
 * El panel lo enseñaba. Lo que faltaba era que alguien lo estuviera mirando
 * en ese momento, y eso no es una tarea que se pueda pedir: es una alarma.
 *
 * **Diez minutos** porque es lo que da tiempo a forzar una mesa o a mover a
 * alguien antes de que salgan treinta correos diciéndole a la gente con
 * quién cena. Con más margen el reparto todavía puede cambiar y el aviso
 * avisa de algo que no va a pasar; con menos, no da tiempo a hacer nada.
 *
 * Una sola vez por fecha: `events.aviso_previo_at`. Este cron pasa cada cinco
 * minutos y sin la marca el mismo aviso saldría dos veces.
 *
 * Y solo si hay algo que decir. Un aviso que llega siempre, también cuando
 * todo está bien, es un aviso que se deja de abrir, y entonces no sirve
 * justo el día que trae algo.
 *
 * `?seco=1` calcula y enseña el correo sin mandarlo ni marcar nada.
 */

export const dynamic = 'force-dynamic'

/** Cuánto antes de la revelación se avisa. */
const ANTES = 10 * 60 * 1000

/** Y hasta cuándo se sigue avisando, si el cron se saltó una pasada. */
const TARDE = 2 * 60 * 1000

async function revisar(seco: boolean, soloEsta?: string | null) {
  const admin = createAdminClient()
  const ahora = Date.now()

  // Las fechas cuya revelación está dentro de la ventana y a las que no se
  // ha avisado todavía. `es_prueba` fuera: nadie se queda sin cena ahí.
  const consulta = admin
    .from('events')
    .select('id, starts_at, reveal_at, city_slug, aviso_previo_at, es_prueba')

  const { data: eventos } = soloEsta
    ? await consulta.eq('id', soloEsta)
    : await consulta
        .gte('reveal_at', new Date(ahora - TARDE).toISOString())
        .lte('reveal_at', new Date(ahora + ANTES).toISOString())
        .is('aviso_previo_at', null)
        .eq('es_prueba', false)

  const salida: { evento: string; problemas: number; avisado: boolean; correo?: string }[] = []

  for (const ev of eventos ?? []) {
    const problemas = await problemasDe(admin, ev.id)

    if (!problemas.length) {
      // Nada que decir. Se marca igual: si a las 11:55 estaba todo bien, no
      // hace falta volver a mirarlo a las 12:00, y dejarlo sin marcar haría
      // que la siguiente pasada lo revisara otra vez para callarse otra vez.
      if (!seco) {
        await admin
          .from('events')
          .update({ aviso_previo_at: new Date().toISOString() } as never)
          .eq('id', ev.id)
      }
      salida.push({ evento: ev.id, problemas: 0, avisado: false })
      continue
    }

    const partes = partesDe(ev.starts_at, ZONA_POR_DEFECTO)
    const dia = partes ? `${partes.dia} ${partes.numero}` : 'la próxima fecha'
    const hora = horaDe(ev.reveal_at, ZONA_POR_DEFECTO)

    const aviso = {
      asunto: `Antes de revelar · ${dia}`,
      titulo:
        problemas.length === 1
          ? `Hay algo sin cerrar y la revelación sale a las ${hora}`
          : `Hay ${problemas.length} cosas sin cerrar y la revelación sale a las ${hora}`,
      parrafos: problemas,
      filas: [] as [string, string][],
      pestana: 'mesas' as const,
      deRevision: false,
    }

    if (seco) {
      salida.push({ evento: ev.id, problemas: problemas.length, avisado: false, correo: componerAviso(aviso).html })
      continue
    }

    await mandarAviso(aviso)
    await admin
      .from('events')
      .update({ aviso_previo_at: new Date().toISOString() } as never)
      .eq('id', ev.id)

    salida.push({ evento: ev.id, problemas: problemas.length, avisado: true })
  }

  return NextResponse.json({ fechas: salida.length, seco, detalle: salida })
}

/** Mismo candado que los demás crons: sin el secreto, 404. */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  const url = new URL(request.url)
  const seco = url.searchParams.get('seco') === '1'

  /**
   * En seco se puede pedir una fecha concreta, aunque su revelación no esté
   * en la ventana. Es la única forma de ver qué diría el aviso sin esperar a
   * que falten diez minutos para una revelación de verdad, y sin tocar nada.
   */
  const soloEsta = seco ? url.searchParams.get('evento') : null
  return revisar(seco, soloEsta)
}

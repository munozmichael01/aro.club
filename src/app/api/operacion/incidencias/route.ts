import { NextResponse } from 'next/server'
import { z } from 'zod'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La cola de incidencias.
 *
 * F11 le promete a quien reporta: «lo lee una persona hoy mismo y te
 * escribimos cuando esté revisado». Hasta aquí esa promesa no la cumplía
 * nadie: el reporte se guardaba en `incident_reports` y no había ni una
 * pantalla que lo enseñara. Solo aparecía si alguien abría por casualidad
 * la ficha de esa persona.
 *
 * Un reporte sin cola es un reporte que no existe, y este es el único
 * mecanismo de seguridad que tiene el producto.
 *
 * Resolver NO es un botón de «visto». Hay que decir qué se hizo, porque el
 * historial de una persona a la que reportaron tres veces solo sirve si
 * cada vez dice qué se decidió.
 */

const decision = z.object({
  incidenciaId: z.string().uuid(),
  // Cerrado a propósito: escribir la acción a mano hace que dos personas
  // de operación registren lo mismo de dos maneras y no se pueda contar.
  accion: z.enum(['hablado', 'aviso', 'expulsada', 'sin-fundamento']),
})

const QUE_SE_HIZO: Record<string, string> = {
  hablado: 'Hablamos con quien reportó',
  aviso: 'Aviso a la persona reportada',
  expulsada: 'Fuera del club',
  'sin-fundamento': 'Sin fundamento',
}

export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  // Las dos claves apuntan a `profiles`, así que hay que nombrar la
  // relación: sin el nombre del constraint, PostgREST no sabe cuál de las
  // dos es y devuelve un embed ambiguo.
  const { data, error } = await admin
    .from('incident_reports')
    // En una sola cadena literal, aunque sea larga: concatenar rompe la
    // inferencia de tipos de Supabase y todo el resultado degrada a error.
    .select('id, severity, description, created_at, action_taken, resolved_at, reporter:profiles!incident_reports_reporter_id_fkey(id, display_name, full_name), sujeto:profiles!incident_reports_subject_id_fkey(id, display_name, full_name), events(starts_at)')
    .order('resolved_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[incidencias] cola', error)
    return NextResponse.json({ error: 'No pudimos leer la cola.' }, { status: 500 })
  }

  const nombre = (p: { display_name: string | null; full_name: string | null } | null) =>
    p?.display_name || p?.full_name?.split(' ')[0] || '—'

  // Cuántas veces reportaron a cada persona: una sola vez es un incidente,
  // tres es un patrón, y quien revisa tiene que verlo sin salir de la cola.
  const veces = new Map<string, number>()
  for (const r of data ?? []) {
    const s = (r.sujeto as unknown as { id: string } | null)?.id
    if (s) veces.set(s, (veces.get(s) ?? 0) + 1)
  }

  return NextResponse.json({
    cola: (data ?? []).map((r) => {
      const quien = r.reporter as unknown as {
        id: string; display_name: string | null; full_name: string | null
      } | null
      const sobre = r.sujeto as unknown as {
        id: string; display_name: string | null; full_name: string | null
      } | null
      const ev = r.events as unknown as { starts_at: string } | null

      return {
        id: r.id,
        gravedad: r.severity,
        motivo: r.description,
        cuando: r.created_at,
        cena: ev?.starts_at ?? null,
        quienReporta: nombre(quien),
        quienReportaId: quien?.id ?? null,
        sobreQuien: nombre(sobre),
        sobreQuienId: sobre?.id ?? null,
        vecesReportada: sobre?.id ? (veces.get(sobre.id) ?? 1) : 1,
        resuelta: !!r.resolved_at,
        // Lo que se hizo, ya legible: quien lo mira no tiene que traducir
        // un código con una tabla al lado.
        seHizo: r.action_taken ? (QUE_SE_HIZO[r.action_taken] ?? r.action_taken) : null,
        resueltaEn: r.resolved_at,
      }
    }),
    acciones: Object.entries(QUE_SE_HIZO).map(([codigo, label]) => ({ codigo, label })),
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = decision.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data

  const { data: incidencia } = await admin
    .from('incident_reports')
    .select('id, subject_id, resolved_at')
    .eq('id', d.incidenciaId)
    .maybeSingle()

  if (!incidencia) {
    return NextResponse.json({ error: 'Esa incidencia no existe.' }, { status: 404 })
  }
  if (incidencia.resolved_at) {
    return NextResponse.json({ error: 'Esa incidencia ya estaba resuelta.' }, { status: 409 })
  }

  const { error } = await admin
    .from('incident_reports')
    .update({
      action_taken: d.accion,
      resolved_by: actor,
      resolved_at: new Date().toISOString(),
    } as never)
    .eq('id', d.incidenciaId)

  if (error) {
    console.error('[incidencias] resolver', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  // Expulsar es lo único que cambia el estado de la persona, y se hace
  // aquí para que no dependa de que alguien se acuerde de ir a otro sitio.
  if (d.accion === 'expulsada' && incidencia.subject_id) {
    await admin.from('profiles').update({ status: 'banned' }).eq('id', incidencia.subject_id)
  }

  return NextResponse.json({ estado: 'resuelta' })
}

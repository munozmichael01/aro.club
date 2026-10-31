import { NextResponse } from 'next/server'

import { nombresDe } from '@/lib/contacto'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * «Seguir en contacto»: cómo vamos (Michael, 31-10: «esto hay que llevar un
 * conteo»).
 *
 * Las cifras del embudo —quién marca, cuántas coincidencias, cuántas se
 * cruzan, cuántas se cierran sin cruce— y la lista de coincidencias, con lo
 * que hizo cada persona, si ya le llegó el aviso y si ya lo vio en su mesa.
 *
 * Lo que NO enseña: los teléfonos ni las redes que se compartieron. Son de
 * las dos personas, y operación no los necesita para saber si esto funciona.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await exigirOps())) return new NextResponse(null, { status: 404 })
  const admin = createAdminClient()

  const [{ data: marcas }, { data: lista }] = await Promise.all([
    admin.from('peer_feedback').select('table_id, rater_id, rated_id').eq('signal', 'connect'),
    admin
      .from('contacto_coincidencias')
      .select('id, table_id, persona_a, persona_b, creada_en, cierra_en, estado_a, estado_b, cruzada_en, cerrada_en, visto_a_en, visto_b_en, dinner_tables(events(starts_at), restaurants(name))')
      .order('creada_en', { ascending: false }),
  ])

  const coincidencias = lista ?? []
  const personas = [...new Set(coincidencias.flatMap((c) => [c.persona_a, c.persona_b]))]
  const nombres = await nombresDe(admin, personas)

  // Si ya le llegó el aviso de coincidencia: `sent_at` es que Resend lo
  // aceptó, no que lo abriera. Lo que dice que lo VIO es entrar a su mesa.
  const { data: avisos } = personas.length
    ? await admin.from('scheduled_emails').select('profile_id, sent_at, payload').eq('kind', 'contacto_coincidencia').in('profile_id', personas)
    : { data: [] as { profile_id: string | null; sent_at: string | null; payload: unknown }[] }
  const avisado = (quien: string, mesa: string) =>
    (avisos ?? []).find((a) => a.profile_id === quien && (a.payload as { mesa?: string } | null)?.mesa === mesa)?.sent_at ?? null

  const ahora = Date.now()
  const lado = (quien: string, estado: string, visto: string | null, mesa: string) => ({
    nombre: nombres.get(quien) ?? 'Alguien',
    estado,
    avisadoEn: avisado(quien, mesa),
    vioEn: visto,
  })

  return NextResponse.json({
    total: {
      marcas: (marcas ?? []).length,
      quienesMarcaron: new Set((marcas ?? []).map((m) => m.rater_id)).size,
      coincidencias: coincidencias.length,
      abiertas: coincidencias.filter((c) => !c.cruzada_en && !c.cerrada_en && Date.parse(c.cierra_en) > ahora).length,
      cruzadas: coincidencias.filter((c) => c.cruzada_en).length,
      sinCruce: coincidencias.filter((c) => !c.cruzada_en && (c.cerrada_en || Date.parse(c.cierra_en) <= ahora)).length,
      confirmaron: coincidencias.reduce((t, c) => t + (c.estado_a === 'confirmado' ? 1 : 0) + (c.estado_b === 'confirmado' ? 1 : 0), 0),
    },
    lista: coincidencias.map((c) => {
      const t = c.dinner_tables as unknown as { events: { starts_at: string } | null; restaurants: { name: string } | null } | null
      return {
        id: c.id,
        cena: t?.events?.starts_at ?? null,
        sitio: t?.restaurants?.name ?? null,
        creadaEn: c.creada_en,
        cierraEn: c.cierra_en,
        cruzadaEn: c.cruzada_en,
        cerradaEn: c.cerrada_en,
        a: lado(c.persona_a, c.estado_a, c.visto_a_en, c.table_id),
        b: lado(c.persona_b, c.estado_b, c.visto_b_en, c.table_id),
      }
    }),
  })
}

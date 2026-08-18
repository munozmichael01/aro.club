import { NextResponse } from 'next/server'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La lista de leads, con el correo entero, para llevársela fuera.
 *
 * Existe porque las campañas se hacen desde otra herramienta y ahí hay que
 * meter direcciones. El panel enmascara el correo en la lista y lo enseña
 * entero solo en la ficha, de una en una; esto es la puerta declarada para
 * sacarlos todos, en vez de que alguien acabe copiándolos a mano de la base.
 *
 * **Solo admin.** Un ops trabaja con la cola del día; sacar la base de
 * correos a un fichero es otra cosa, y el fichero ya no vuelve.
 *
 * **Y deja rastro.** Es la única acción del panel cuyo resultado se va del
 * producto: después no sabemos quién abre ese fichero ni qué se manda desde
 * él. Lo que sí se puede saber es quién lo sacó y cuándo.
 *
 * ## Lo único que hay que hacer a propósito
 *
 * **Quien se dio de baja de los correos NO sale.** La baja vive aquí, en
 * `bajas_correo`, y no viaja dentro de un CSV: si se exporta a alguien que
 * pidió no recibir nada, la herramienta de campañas no tiene forma de
 * saberlo y le escribe igual. El filtro va en el servidor y no en una
 * instrucción de «acuérdate de quitar a estos», porque de eso nadie se
 * acuerda el tercer mes.
 *
 * Tampoco salen los que ya tienen cuenta: esos son miembros y reciben los
 * correos del producto. Es la misma definición de lead que usa la pestaña
 * Gente, para que el número de la pantalla y el del fichero coincidan.
 */

/** El teléfono no sale: las campañas son por correo y esto se va del producto. */
const COLUMNAS = [
  'correo', 'nombre', 'zonas', 'arraigo', 'genero', 'ciudad',
  'se_apunto', 'de_donde_vino', 'por_donde_va',
] as const

/**
 * Punto y coma, que es lo que abre bien un Excel en español sin pedir nada.
 * Y BOM delante, o los acentos salen rotos.
 */
function csv(filas: string[][]): string {
  const escapar = (v: string) => {
    const t = String(v ?? '')
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t
  }
  return '﻿' + filas.map((f) => f.map(escapar).join(';')).join('\r\n') + '\r\n'
}

async function exigirAdmin(): Promise<string | null> {
  const actor = await exigirOps()
  if (!actor) return null

  const { data } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', actor)
    .maybeSingle()

  return data?.role === 'admin' ? actor : null
}

export async function GET(request: Request) {
  const actor = await exigirAdmin()
  // 404 y no 403: a quien no es admin esta ruta no le existe.
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const [{ data: leads, error }, { data: bajas }, { data: zonas }] = await Promise.all([
    admin
      .from('waitlist')
      .select('email, full_name, display_name, zones, rootedness, gender, city_slug, source, variante, created_at, quiz_completed_at, profile_completed_at, base_completed_at')
      .is('converted_profile_id', null)
      .order('created_at', { ascending: false }),
    admin.from('bajas_correo').select('correo, deshecha_at'),
    admin.from('zones').select('slug, name'),
  ])

  if (error) {
    console.error('[leads] no se pudieron leer', error)
    return NextResponse.json({ error: 'No se pudo leer.' }, { status: 500 })
  }

  // Quien se dio de baja y no lo deshizo. Se compara en minúsculas porque la
  // baja se guarda normalizada y una dirección con mayúsculas se colaría.
  const deBaja = new Set(
    (bajas ?? []).filter((b) => !b.deshecha_at).map((b) => String(b.correo).trim().toLowerCase()),
  )
  const nombreZona = new Map((zonas ?? []).map((z) => [z.slug, z.name]))

  const dentro = (leads ?? []).filter((l) => !deBaja.has(String(l.email).trim().toLowerCase()))
  const fuera = (leads ?? []).length - dentro.length

  const filas = dentro.map((l) => [
    l.email,
    l.full_name || l.display_name || '',
    (l.zones ?? []).map((z: string) => nombreZona.get(z) ?? z).join(' · '),
    l.rootedness ?? '',
    l.gender ?? '',
    l.city_slug ?? '',
    String(l.created_at).slice(0, 10),
    l.source || (l.variante ? 'landing ' + l.variante : ''),
    l.base_completed_at
      ? 'datos base'
      : l.profile_completed_at
        ? 'cuestionario'
        : l.quiz_completed_at
          ? 'quiz'
          : 'solo el correo',
  ])

  // Se anota lo que salió y lo que se quedó fuera. El segundo número es el
  // que permite responder «¿se te coló alguien que se había dado de baja?».
  await anotar(actor, 'leads_exportados', 'leads', null, {
    exportados: filas.length,
    excluidos_por_baja: fuera,
  })

  const hoy = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv([[...COLUMNAS], ...filas]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aro-leads-${hoy}.csv"`,
      // Una lista de correos no se guarda en ninguna caché intermedia.
      'Cache-Control': 'no-store, private',
    },
  })
}

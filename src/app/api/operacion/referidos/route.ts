import { NextResponse } from 'next/server'

import { exigirOps } from '@/lib/ops'
import { POR_CADA } from '@/lib/referidos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Quién ha traído a quién.
 *
 * Michael, 31-10, cerrando los referidos: faltaba poder verlo. El miembro ve
 * lo suyo en Perfil —su código y su cuenta— y nadie veía el conjunto: cuánta
 * gente ha entrado por un código, quién los trae y cuántas reservas gratis
 * se han dado ya.
 *
 * Se cuenta aquí y no en la pantalla porque son cuatro tablas cruzadas
 * —códigos, perfiles, reservas y el libro mayor— y hacerlo delante
 * significaría bajarlas enteras al navegador.
 *
 * LO QUE NO ENSEÑA, A PROPÓSITO: a quién invitó cada quien, por nombre. El
 * miembro nunca lo ve —en Perfil es un número— y operación tampoco lo
 * necesita para decidir nada. Lo que sí hace falta es lo de arriba: si esto
 * trae gente o no, y a quién hay que premiar.
 */

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await exigirOps())) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: codigos } = await admin
    .from('coupons')
    .select('code, creado_por, usados, created_at')
    .not('creado_por', 'is', null)
    .order('created_at', { ascending: false })

  const duenos = (codigos ?? [])
    .map((c) => (c as { creado_por?: string | null }).creado_por)
    .filter((x): x is string => !!x)

  if (!duenos.length) {
    return NextResponse.json({ lista: [], total: { codigos: 0, apuntados: 0, asistieron: 0, premios: 0 }, porCada: POR_CADA })
  }

  // Quién llegó con el código de quién. Es la columna que escribe el alta.
  const { data: invitados } = await admin
    .from('profiles')
    .select('id, invitado_por, created_at')
    .not('invitado_por', 'is', null)

  // Y de esos, quién ya se sentó: el premio cuenta la PRIMERA cena, no la
  // reserva (Michael, 31-10: «no basta con que reserven»).
  const idsInvitados = (invitados ?? []).map((p) => p.id)
  const { data: cenaron } = idsInvitados.length
    ? await admin
      .from('bookings')
      .select('profile_id')
      .in('profile_id', idsInvitados)
      .eq('status', 'attended')
    : { data: [] as { profile_id: string }[] }

  const yaFueron = new Set((cenaron ?? []).map((b) => b.profile_id))

  const { data: perfiles } = await admin
    .from('profiles')
    .select('id, display_name, full_name, premios_referido')
    .in('id', duenos)

  const nombreDe = new Map(
    (perfiles ?? []).map((p) => [p.id, p.display_name || p.full_name || 'Sin nombre']),
  )
  const premiosDe = new Map(
    (perfiles ?? []).map((p) => [p.id, (p as { premios_referido?: number | null }).premios_referido ?? 0]),
  )

  const suyos = new Map<string, { apuntados: number; asistieron: number }>()
  for (const p of invitados ?? []) {
    const quien = (p as { invitado_por?: string | null }).invitado_por
    if (!quien) continue
    const y = suyos.get(quien) ?? { apuntados: 0, asistieron: 0 }
    y.apuntados += 1
    if (yaFueron.has(p.id)) y.asistieron += 1
    suyos.set(quien, y)
  }

  const lista = (codigos ?? []).map((c) => {
    const dueno = (c as { creado_por?: string | null }).creado_por as string
    const cuenta = suyos.get(dueno) ?? { apuntados: 0, asistieron: 0 }
    const premios = premiosDe.get(dueno) ?? 0
    return {
      id: dueno,
      nombre: nombreDe.get(dueno) ?? 'Sin nombre',
      codigo: c.code,
      desde: c.created_at,
      apuntados: cuenta.apuntados,
      asistieron: cuenta.asistieron,
      premios,
      /** Lo que lleva hacia la siguiente gratis, de 0 a POR_CADA - 1. */
      avance: cuenta.asistieron % POR_CADA,
      /** Si le toca una y no se le ha dado: no debería pasar, y se ve. */
      debiendo: Math.max(0, Math.floor(cuenta.asistieron / POR_CADA) - premios),
    }
  })

  /**
   * Primero los que traen gente. Un código recién creado y uno que ya trajo
   * cuatro personas no se miran igual, y con doce códigos el orden por fecha
   * ya escondía el único que importaba.
   */
  lista.sort((a, b) => (b.asistieron - a.asistieron) || (b.apuntados - a.apuntados)
    || (a.nombre < b.nombre ? -1 : 1))

  return NextResponse.json({
    lista,
    porCada: POR_CADA,
    total: {
      codigos: lista.length,
      // Cuántos códigos han traído al menos a una persona. Es la cifra que
      // dice si esto funciona: tener código no es invitar.
      conGente: lista.filter((x) => x.apuntados > 0).length,
      apuntados: lista.reduce((t, x) => t + x.apuntados, 0),
      asistieron: lista.reduce((t, x) => t + x.asistieron, 0),
      premios: lista.reduce((t, x) => t + x.premios, 0),
      debiendo: lista.reduce((t, x) => t + x.debiendo, 0),
    },
  })
}

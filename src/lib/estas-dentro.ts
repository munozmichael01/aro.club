import 'server-only'

import { DESCUENTO_PCT, codigoDe } from '@/lib/referidos'
import type { PlanDentro } from '@/lib/reglas'
import type { createAdminClient } from '@/lib/supabase/admin'
import { FIN_CENA } from '@/lib/ventana-mesa'
import { masUnoDeLaReserva, type MasUno } from '@/lib/mas-uno'
import { zonaDeCiudad } from '@/lib/zona-ciudad'

type Admin = ReturnType<typeof createAdminClient>

/**
 * La reserva de «Estás dentro», y lo que se cuenta de ella.
 *
 * La leen tres: la pantalla (`/api/estas-dentro`), las tarjetas para
 * historias (`/api/historia`) y el calendario (`/api/calendario`). Si cada
 * una armara su fecha por su lado, la tarjeta podría decir una zona y la
 * pantalla otra.
 *
 * Solo una reserva VIVA —apartada o confirmada, sin cancelar— y de una fecha
 * que no ha terminado: compartir una cena de la semana pasada no invita a
 * nadie. Con `eventoId`, esa; sin él, la próxima.
 */
export type Dentro = {
  reservaId: string
  eventoId: string
  /** Con el pago reportado y sin cuadrar: el sello dice «Puesto apartado». */
  pendiente: boolean
  revelado: boolean
  /** Ya vio «Estás dentro», al reportar o al confirmarse. */
  visto: boolean
  plan: PlanDentro
  /**
   * Fecha +1 (Michael, 01-11): la invitación es la acción principal de
   * «Estás dentro» para quien reserva, y el acompañante ve con quién viene.
   * Nulos en una fecha normal.
   */
  masUno: MasUno | null
  vienesCon: string | null
}

export async function reservaDentro(admin: Admin, perfilId: string, eventoId?: string | null): Promise<Dentro | null> {
  let q = admin
    .from('bookings')
    .select('id, event_id, status, cancelled_at, dentro_visto_en, events!inner(starts_at, reveal_at, format, city_slug, mas_uno)')
    .eq('profile_id', perfilId)
    .in('status', ['pending_payment', 'confirmed'])
    .is('cancelled_at', null)
  if (eventoId) q = q.eq('event_id', eventoId)
  const { data } = await q

  const ahora = Date.now()
  const vivas = (data ?? [])
    .map((b) => ({ b, ev: b.events as unknown as { starts_at: string; reveal_at: string | null; format: string | null; city_slug: string; mas_uno: boolean } }))
    .filter((x) => x.ev && Date.parse(x.ev.starts_at) + FIN_CENA > ahora)
    .sort((a, c) => Date.parse(a.ev.starts_at) - Date.parse(c.ev.starts_at))
  const viva = vivas[0]
  if (!viva) return null

  // Las zonas que ELLA aceptó, cruzadas con las que abrió la fecha: lo mismo
  // que enseña Mi mesa cerrada (su comentario cuenta por qué el cruce).
  const [{ data: suyas }, { data: abiertas }] = await Promise.all([
    admin.from('booking_zones').select('zone_slug').eq('booking_id', viva.b.id),
    admin.from('event_venues').select('zone_slug').eq('event_id', viva.b.event_id),
  ])
  const deLaFecha = new Set((abiertas ?? []).map((z) => z.zone_slug))
  const suyasSlugs = (suyas ?? []).map((z) => z.zone_slug)
  const cruzadas = suyasSlugs.filter((z) => deLaFecha.has(z))
  const slugs = cruzadas.length ? cruzadas : suyasSlugs
  const { data: nombres } = await admin
    .from('zones')
    .select('name')
    .in('slug', slugs.length ? slugs : ['__ninguna__'])
    .order('sort_order')

  return {
    reservaId: viva.b.id,
    eventoId: viva.b.event_id,
    pendiente: viva.b.status === 'pending_payment',
    revelado: !!viva.ev.reveal_at && Date.parse(viva.ev.reveal_at) <= ahora,
    visto: !!viva.b.dentro_visto_en,
    plan: {
      empiezaEn: viva.ev.starts_at,
      revelaEn: viva.ev.reveal_at,
      zonaHoraria: await zonaDeCiudad(viva.ev.city_slug),
      formato: viva.ev.format,
      zonas: (nombres ?? []).map((z) => z.name),
      // Sin la tarjeta 4 en las historias: `DENTRO.variantes(…, masUno)`.
      masUno: !!viva.ev.mas_uno,
    },
    ...(await masUnoDeLaReserva(admin, viva.b.id)),
  }
}

/**
 * Su código para invitar, el mismo que enseña Perfil. Quien tiene una reserva
 * viva está verificada (sin verificar no hay puesto), así que aquí se crea si
 * aún no lo tiene, como en `/api/mi-perfil`.
 */
export async function invitacionDe(admin: Admin, perfilId: string) {
  const codigo = await codigoDe(admin, perfilId)
  if (!codigo) return null
  return { codigo, enlace: 'https://aro.club/i/' + codigo, pct: DESCUENTO_PCT }
}

/**
 * La reserva viva que todavía no ha visto «Estás dentro», si hay.
 *
 * Es la tercera puerta de la entrega (B3): si no tocó la push ni el correo,
 * se abre sola la primera vez que entra. La miran Mi cuenta, Mi mesa y Pago
 * ANTES de pintar nada, para llevarla directo y no enseñar una pantalla y
 * saltar a otra.
 *
 * SE VE UNA SOLA VEZ, Y AL REPORTAR CUENTA (Michael, 31-10: «solo al
 * reportarse, que en la app sea igual»). Reportar el pago ya es estar dentro:
 * quien la vio con «Puesto apartado» no la vuelve a ver al confirmarse. Por
 * eso vale una reserva apartada (`pending_payment`) igual que una confirmada.
 *
 * Solo hasta la revelación: con la mesa abierta, lo que le importa es el
 * sitio, no celebrar que entró.
 */
export async function dentroPorVer(admin: Admin, perfilId: string): Promise<string | null> {
  const { data } = await admin
    .from('bookings')
    .select('event_id, events!inner(starts_at, reveal_at)')
    .eq('profile_id', perfilId)
    .in('status', ['pending_payment', 'confirmed'])
    .is('cancelled_at', null)
    .is('dentro_visto_en', null)
  const ahora = Date.now()
  const porVer = (data ?? [])
    .map((b) => ({ id: b.event_id, ev: b.events as unknown as { starts_at: string; reveal_at: string | null } }))
    .filter((x) => x.ev && x.ev.reveal_at && Date.parse(x.ev.reveal_at) > ahora)
    .sort((a, b) => Date.parse(a.ev.starts_at) - Date.parse(b.ev.starts_at))[0]
  return porVer?.id ?? null
}

/** Ya la vio: con el pago reportado o confirmado, las dos cuentan. */
export async function marcarVisto(admin: Admin, perfilId: string, reservaId: string) {
  await admin
    .from('bookings')
    .update({ dentro_visto_en: new Date().toISOString() })
    .eq('id', reservaId)
    .eq('profile_id', perfilId)
    .in('status', ['pending_payment', 'confirmed'])
    .is('dentro_visto_en', null)
}

import 'server-only'

import { randomBytes } from 'node:crypto'

import { encolar } from '@/lib/correos'
import { situacionDePerfil } from '@/lib/embudo'
import { DENTRO, MAS_UNO, partesDe, type CorreoMasUno } from '@/lib/reglas'
import { SITIO } from '@/lib/remitente'
import { createAdminClient } from '@/lib/supabase/admin'
import { zonaDeCiudad } from '@/lib/zona-ciudad'

/**
 * «+1 acompañante»: el enlace, quién se queda el puesto y qué pasa al cierre.
 *
 * Michael, 01-11 (app-mobile/Design/BRIEF-mas-uno-acompanante.md, sobre
 * docs/entrega/DISENO-plan-mas-uno.md):
 *
 *  · Quien reserva paga LOS DOS puestos. La fecha lo dice sola: `credit_cost`
 *    2 y `price_usd` el doble, así que reservar, pagar y canjear un cupón no
 *    tienen que saber nada del +1 para cobrar lo que toca.
 *  · Al reservar hay un ENLACE, y quien reserva no nos da ningún dato.
 *  · El acompañante hace el alta completa y se verifica como cualquiera. El
 *    puesto es de la primera persona cuya verificación se APRUEBA.
 *  · Al cierre sin acompañante aprobado se cancelan los dos puestos y se
 *    abonan dos créditos. No se le manda a una mesa normal: si quería ir con
 *    alguien, sola o solo no va.
 *
 * El acompañante tiene SU reserva (`bookings.mas_uno_de`), sin cargo. Con
 * eso le sirve todo lo que ya existe —Mi mesa, recordatorios, la encuesta,
 * la asistencia y el veto de tres meses, que escribe un disparador sobre
 * `table_members`— sin enseñarle a ninguna de esas piezas qué es un +1.
 */

type Admin = ReturnType<typeof createAdminClient>

/** Las reservas que tienen un puesto apartado. */
const VIVAS = ['pending_payment', 'confirmed'] as const

/** El motivo con el que el cierre cancela una reserva sin acompañante. */
export const MOTIVO_SIN_ACOMPANANTE = 'mas-uno-sin-acompanante'

export type EstadoMasUno = 'sin-usar' | 'registrado' | 'confirmado' | 'cancelada'

/** Lo que va en `/api/mi-mesa`, `/api/mi-cuenta` y «Estás dentro» de quien reserva. */
export type MasUno = {
  /** La reserva de quien invita: la que se manda para cambiar de acompañante. */
  reservaId: string
  /** El día de la fecha y su zona horaria: la tarjeta cancelada (4E) los dice sin otra reserva a mano. */
  empiezaEn: string
  zonaHoraria: string
  enlace: string | null
  estado: EstadoMasUno
  /** El nombre de pila de quien se registró o viene. */
  nombre: string | null
  cierraEn: string
  /** «el viernes 6 a medianoche»: el plazo, ya dicho. */
  plazo: string
  /** El texto para compartir con el enlace dentro. */
  mensaje: string | null
}

export function enlaceDe(token: string): string {
  return `${SITIO}/m/${token}`
}

/** 16 bytes en base64url: no se adivina y cabe en un WhatsApp. */
function tokenNuevo(): string {
  return randomBytes(16).toString('base64url')
}

function nombreDePila(p: { display_name?: string | null; full_name?: string | null } | null | undefined) {
  return (p?.display_name || p?.full_name?.split(' ')[0] || '').trim() || null
}

type Reserva = { id: string; profile_id: string; event_id: string; status: string; mas_uno_de: string | null }

/** La reserva y su fecha, si es la de QUIEN RESERVA en una fecha +1. */
async function reservaDeQuienInvita(admin: Admin, bookingId: string) {
  const { data: r } = await admin
    .from('bookings')
    .select('id, profile_id, event_id, status, mas_uno_de, cancel_reason, events(id, mas_uno, starts_at, booking_closes_at, status, city_slug)')
    .eq('id', bookingId)
    .maybeSingle()

  const ev = (r as unknown as { events: { mas_uno: boolean; starts_at: string; booking_closes_at: string; status: string; city_slug: string | null } | null } | null)?.events
  if (!r || !ev?.mas_uno || r.mas_uno_de) return null
  return { reserva: r as unknown as Reserva & { cancel_reason: string | null }, evento: ev }
}

/**
 * El enlace vivo de una reserva, creándolo si no lo hay.
 *
 * Perezoso a propósito: la reserva nace por cuatro puertas —crédito, pago,
 * cupón y operación— y crear el enlace en las cuatro es cuatro sitios donde
 * olvidarlo. Aquí se pide al enseñarlo, y el único de «una viva por reserva»
 * hace que dos pestañas a la vez no creen dos.
 */
export async function invitacionViva(admin: Admin, bookingId: string): Promise<{ id: string; token: string } | null> {
  const { data: ya } = await admin
    .from('mas_uno_invitaciones')
    .select('id, token')
    .eq('booking_id', bookingId)
    .is('anulada_en', null)
    .maybeSingle()
  if (ya) return ya

  const { data: nueva, error } = await admin
    .from('mas_uno_invitaciones')
    .insert({ booking_id: bookingId, token: tokenNuevo() })
    .select('id, token')
    .single()

  if (!error && nueva) return nueva
  // 23505: otra llamada la acaba de crear. Se devuelve esa.
  if (error?.code === '23505') {
    const { data: otra } = await admin
      .from('mas_uno_invitaciones')
      .select('id, token')
      .eq('booking_id', bookingId)
      .is('anulada_en', null)
      .maybeSingle()
    return otra ?? null
  }
  console.error('[mas-uno] no se pudo crear el enlace', bookingId, error)
  return null
}

/** El acompañante vivo de una reserva, si lo hay. */
async function acompananteVivo(admin: Admin, bookingId: string) {
  const { data, error } = await admin
    .from('bookings')
    .select('id, profile_id, status, profiles!bookings_profile_id_fkey(display_name, full_name)')
    .eq('mas_uno_de', bookingId)
    .in('status', [...VIVAS, 'attended', 'no_show'])
    .maybeSingle()
  // Una consulta que falla NO es «no hay acompañante»: el cierre cancelaría
  // dos puestos pagados por un error de lectura. Se para y se grita.
  if (error) throw new Error('[mas-uno] no se pudo leer el acompañante de ' + bookingId + ': ' + error.message)
  return data as unknown as { id: string; profile_id: string; status: string; profiles: { display_name: string | null; full_name: string | null } | null } | null
}

/**
 * Lo que ve QUIEN RESERVA de su +1. Null si la reserva no es de una fecha +1
 * o es la del acompañante.
 */
export async function masUnoDe(admin: Admin, bookingId: string): Promise<MasUno | null> {
  const r = await reservaDeQuienInvita(admin, bookingId)
  if (!r) return null
  const { reserva, evento } = r
  const zona = await zonaDeCiudad(evento.city_slug)
  const plazo = MAS_UNO.plazo(evento.booking_closes_at, zona)
  const base = { reservaId: bookingId, empiezaEn: evento.starts_at, zonaHoraria: zona, cierraEn: evento.booking_closes_at, plazo }

  if (reserva.status === 'cancelled_by_ops' && reserva.cancel_reason === MOTIVO_SIN_ACOMPANANTE) {
    return { ...base, enlace: null, estado: 'cancelada', nombre: null, mensaje: null }
  }
  if (!(VIVAS as readonly string[]).includes(reserva.status) && reserva.status !== 'attended' && reserva.status !== 'no_show') {
    return null
  }

  const viene = await acompananteVivo(admin, bookingId)
  if (viene) {
    return { ...base, enlace: null, estado: 'confirmado', nombre: nombreDePila(viene.profiles), mensaje: null }
  }

  const inv = await invitacionViva(admin, bookingId)
  if (!inv) return null
  const enlace = enlaceDe(inv.token)

  // Quién se registró con este enlace: el último, que es por quien se
  // pregunta. Si son dos, el puesto será del primero que se apruebe.
  const { data: unidos } = await admin
    .from('mas_uno_candidatos')
    .select('profile_id, unido_en, profiles(display_name, full_name)')
    .eq('invitacion_id', inv.id)
    .order('unido_en', { ascending: false })
    .limit(1)

  const ultimo = (unidos ?? [])[0] as unknown as { profiles: { display_name: string | null; full_name: string | null } | null } | undefined

  // El mensaje dice el día, la hora y las zonas de la fecha (3B).
  const partes = partesDe(evento.starts_at, zona)
  const { data: sedes } = await admin.from('event_venues').select('zone_slug, zones(name)').eq('event_id', reserva.event_id)
  const zonas = [...new Set((sedes ?? []).map((v) => (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug))]

  return {
    ...base,
    enlace,
    estado: ultimo ? 'registrado' : 'sin-usar',
    nombre: ultimo ? nombreDePila(ultimo.profiles) : null,
    mensaje: MAS_UNO.mensaje({
      dia: partes ? partes.dia + ' ' + partes.numero : '',
      hora: partes?.hora ?? '',
      zonas: DENTRO.zonasEnTexto(zonas),
      plazo,
      enlace,
    }),
  }
}

/** Del lado del acompañante: con quién viene. Null si su reserva no es de +1. */
export async function vienesConDe(admin: Admin, bookingId: string): Promise<string | null> {
  const { data: suya } = await admin
    .from('bookings')
    .select('mas_uno_de')
    .eq('id', bookingId)
    .maybeSingle()
  if (!suya?.mas_uno_de) return null

  const { data: de } = await admin
    .from('bookings')
    .select('profiles!bookings_profile_id_fkey(display_name, full_name)')
    .eq('id', suya.mas_uno_de)
    .maybeSingle()
  return nombreDePila((de as unknown as { profiles: { display_name: string | null; full_name: string | null } | null } | null)?.profiles)
}

/**
 * Qué es un enlace, para la pantalla de quien lo abre.
 *
 * `propia`: lo abrió quien reserva. `usada`: alguien ya se quedó el puesto.
 * `anulada`: se cambió de acompañante. `cerrada`: la fecha ya cerró o la
 * reserva ya no existe.
 */
export type Invitacion = {
  estado: 'valida' | 'propia' | 'usada' | 'anulada' | 'cerrada' | 'aceptada' | 'tuya'
  invita: string | null
  fecha: { id: string; empiezaEn: string; cierraEn: string; revelaEn: string | null; formato: string; zonas: string[] } | null
  plazo: string
  zonaHoraria: string
}

export async function leerInvitacion(
  admin: Admin,
  token: string,
  quienMira: string | null,
): Promise<Invitacion | null> {
  const { data: inv } = await admin
    .from('mas_uno_invitaciones')
    .select('id, booking_id, anulada_en, usada_por')
    .eq('token', token)
    .maybeSingle()
  if (!inv) return null

  const r = await reservaDeQuienInvita(admin, inv.booking_id)
  if (!r) return null
  const { reserva, evento } = r
  const zona = await zonaDeCiudad(evento.city_slug)

  const { data: quien } = await admin
    .from('profiles')
    .select('display_name, full_name')
    .eq('id', reserva.profile_id)
    .maybeSingle()

  const { data: zonas } = await admin
    .from('event_venues')
    .select('zone_slug, zones(name)')
    .eq('event_id', reserva.event_id)

  const { data: ev } = await admin.from('events').select('format, reveal_at').eq('id', reserva.event_id).maybeSingle()

  const fecha = {
    id: reserva.event_id,
    empiezaEn: evento.starts_at,
    cierraEn: evento.booking_closes_at,
    revelaEn: ev?.reveal_at ?? null,
    formato: ev?.format ?? 'dinner',
    zonas: [...new Set((zonas ?? []).map((z) => (z.zones as unknown as { name: string } | null)?.name ?? z.zone_slug))],
  }
  const base = { invita: nombreDePila(quien), fecha, plazo: MAS_UNO.plazo(evento.booking_closes_at, zona), zonaHoraria: zona }

  if (quienMira && quienMira === reserva.profile_id) return { ...base, estado: 'propia' }
  if (inv.usada_por) return { ...base, estado: quienMira && inv.usada_por === quienMira ? 'tuya' : 'usada' }
  if (inv.anulada_en) return { ...base, estado: 'anulada' }

  const cerrada =
    !(VIVAS as readonly string[]).includes(reserva.status) ||
    Date.parse(evento.booking_closes_at) <= Date.now() ||
    !['open', 'draft'].includes(evento.status)
  if (cerrada) return { ...base, estado: 'cerrada' }

  if (quienMira) {
    const { data: unido } = await admin
      .from('mas_uno_candidatos')
      .select('profile_id')
      .eq('invitacion_id', inv.id)
      .eq('profile_id', quienMira)
      .maybeSingle()
    if (unido) return { ...base, estado: 'aceptada' }
  }
  return { ...base, estado: 'valida' }
}

/**
 * Unirse a un enlace. Deja la invitación pendiente en su perfil y, si ya
 * cumple todo —verificada y con el alta completa—, el puesto queda al
 * instante.
 */
export async function aceptarInvitacion(
  admin: Admin,
  token: string,
  perfilId: string,
): Promise<{ estado: 'aceptada' | 'confirmada' | 'propia' | 'usada' | 'anulada' | 'cerrada' | 'ya-va' | 'no-existe' }> {
  const { data: inv } = await admin
    .from('mas_uno_invitaciones')
    .select('id, booking_id, anulada_en, usada_por')
    .eq('token', token)
    .maybeSingle()
  if (!inv) return { estado: 'no-existe' }

  const r = await reservaDeQuienInvita(admin, inv.booking_id)
  if (!r) return { estado: 'no-existe' }
  const { reserva, evento } = r

  if (reserva.profile_id === perfilId) return { estado: 'propia' }
  if (inv.usada_por) return { estado: inv.usada_por === perfilId ? 'confirmada' : 'usada' }
  if (inv.anulada_en) return { estado: 'anulada' }
  if (
    !(VIVAS as readonly string[]).includes(reserva.status) ||
    Date.parse(evento.booking_closes_at) <= Date.now() ||
    !['open', 'draft'].includes(evento.status)
  ) {
    return { estado: 'cerrada' }
  }

  // Si ya tiene puesto en esa fecha —reservó por su cuenta, o viene con otra
  // persona— no puede ocupar este: serían dos sillas para una persona.
  const { data: propia } = await admin
    .from('bookings')
    .select('id')
    .eq('event_id', reserva.event_id)
    .eq('profile_id', perfilId)
    .in('status', [...VIVAS])
    .maybeSingle()
  if (propia) return { estado: 'ya-va' }

  const { error } = await admin
    .from('mas_uno_candidatos')
    .upsert({ invitacion_id: inv.id, profile_id: perfilId }, { onConflict: 'invitacion_id,profile_id', ignoreDuplicates: true })
  if (error) {
    console.error('[mas-uno] no se pudo unir', inv.id, perfilId, error)
    return { estado: 'cerrada' }
  }

  const sentada = await reclamarPuesto(admin, perfilId)
  return { estado: sentada ? 'confirmada' : 'aceptada' }
}

/**
 * La persona quedó lista —se le aprobó la verificación o aceptó ya estando
 * verificada—: si está unida a un enlace que sigue libre, el puesto es suyo.
 *
 * El candado es el `update … where usada_por is null`: dos aprobaciones a la
 * vez sobre el mismo enlace, y solo una cambia la fila. La otra persona
 * queda como socia normal y su pantalla dirá «Esta invitación ya se usó».
 *
 * Devuelve si se sentó.
 */
export async function reclamarPuesto(admin: Admin, perfilId: string): Promise<boolean> {
  const { data: unidas } = await admin
    .from('mas_uno_candidatos')
    .select('invitacion_id, unido_en')
    .eq('profile_id', perfilId)
    .order('unido_en', { ascending: true })
  if (!unidas?.length) return false

  // El alta COMPLETA, no solo la verificación: la misma pregunta que se le
  // hace a quien reserva por su cuenta.
  const situacion = await situacionDePerfil(perfilId)
  if (!situacion.puedeReservar) return false

  for (const u of unidas) {
    const { data: inv } = await admin
      .from('mas_uno_invitaciones')
      .select('id, booking_id')
      .eq('id', u.invitacion_id)
      .is('anulada_en', null)
      .is('usada_por', null)
      .maybeSingle()
    if (!inv) continue

    const r = await reservaDeQuienInvita(admin, inv.booking_id)
    if (!r) continue
    const { reserva, evento } = r
    if (
      !(VIVAS as readonly string[]).includes(reserva.status) ||
      Date.parse(evento.booking_closes_at) <= Date.now() ||
      reserva.profile_id === perfilId
    ) {
      continue
    }

    const { data: propia } = await admin
      .from('bookings')
      .select('id')
      .eq('event_id', reserva.event_id)
      .eq('profile_id', perfilId)
      .in('status', [...VIVAS])
      .maybeSingle()
    if (propia) continue

    const ahora = new Date().toISOString()
    const { data: ganada } = await admin
      .from('mas_uno_invitaciones')
      .update({ usada_por: perfilId, usada_en: ahora })
      .eq('id', inv.id)
      .is('usada_por', null)
      .is('anulada_en', null)
      .select('id')
      .maybeSingle()
    if (!ganada) continue

    const sentada = await sentarAcompanante(admin, reserva, perfilId)
    if (!sentada) {
      // Sin reserva no hay puesto: se suelta el enlace para que no quede
      // marcado como usado por alguien que no se sienta.
      await admin.from('mas_uno_invitaciones').update({ usada_por: null, usada_en: null }).eq('id', inv.id)
      continue
    }

    await contarComoReferido(admin, perfilId, reserva.profile_id)
    await encolar({ perfil: reserva.profile_id }, 'mas_uno_confirmado', { bookingId: reserva.id }, { eventoId: reserva.event_id })
    return true
  }
  return false
}

/** La reserva del acompañante: nueva, o la suya de antes revivida. */
async function sentarAcompanante(admin: Admin, deQuien: Reserva, perfilId: string): Promise<boolean> {
  const ahora = new Date().toISOString()
  const { data: previa } = await admin
    .from('bookings')
    .select('id')
    .eq('event_id', deQuien.event_id)
    .eq('profile_id', perfilId)
    .maybeSingle()

  let id: string | null = null
  if (previa) {
    const { error } = await admin
      .from('bookings')
      .update({ status: 'confirmed', confirmed_at: ahora, cancelled_at: null, cancel_reason: null, mas_uno_de: deQuien.id })
      .eq('id', previa.id)
    if (error) {
      console.error('[mas-uno] no se pudo revivir la reserva del acompañante', previa.id, error)
      return false
    }
    id = previa.id
  } else {
    const { data: creada, error } = await admin
      .from('bookings')
      .insert({ event_id: deQuien.event_id, profile_id: perfilId, status: 'confirmed', confirmed_at: ahora, mas_uno_de: deQuien.id })
      .select('id')
      .single()
    if (error || !creada) {
      console.error('[mas-uno] no se pudo crear la reserva del acompañante', deQuien.id, error)
      return false
    }
    id = creada.id
  }

  // Las mismas zonas que quien le invita: van juntos, así que se sientan
  // donde se sienta esa reserva.
  const { data: zonas } = await admin.from('booking_zones').select('zone_slug').eq('booking_id', deQuien.id)
  await admin.from('booking_zones').delete().eq('booking_id', id)
  if (zonas?.length) {
    await admin.from('booking_zones').insert(zonas.map((z) => ({ booking_id: id as string, zone_slug: z.zone_slug })))
  }
  return true
}

/**
 * El +1 cuenta para el premio de referidos (Michael, 01-11): es alguien que
 * llega a su primera cena porque le trajo quien reserva.
 *
 * Solo si es su PRIMERA cena y nadie le había invitado antes: a una socia
 * que ya cenó no la trajo nadie, y quien ya tiene padrino lo conserva.
 */
async function contarComoReferido(admin: Admin, perfilId: string, quienInvita: string) {
  const { count } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', perfilId)
    .eq('status', 'attended')
  if ((count ?? 0) > 0) return

  const { error } = await admin
    .from('profiles')
    .update({ invitado_por: quienInvita } as never)
    .eq('id', perfilId)
    .is('invitado_por', null)
  if (error) console.error('[mas-uno] no se pudo apuntar como referido', perfilId, error)
}

/**
 * Cambiar de acompañante: el enlace de ahora deja de valer, sale otro, y
 * quien estuviera unido —registrado o ya confirmado— queda fuera de esta
 * cena.
 */
export async function cambiarAcompanante(admin: Admin, bookingId: string, perfilId: string): Promise<'ok' | 'no-es-tuya' | 'cerrada'> {
  const r = await reservaDeQuienInvita(admin, bookingId)
  if (!r || r.reserva.profile_id !== perfilId) return 'no-es-tuya'
  if (!(VIVAS as readonly string[]).includes(r.reserva.status) || Date.parse(r.evento.booking_closes_at) <= Date.now()) {
    return 'cerrada'
  }

  const viene = await acompananteVivo(admin, bookingId)
  await soltarAcompanante(admin, bookingId, 'cambio-de-acompanante')
  await invitacionViva(admin, bookingId)
  // Quien ya estaba confirmado se entera de que ya no tiene puesto. Quien
  // solo se había registrado no tenía puesto todavía: su pantalla dirá que
  // el enlace ya no vale.
  if (viene && (VIVAS as readonly string[]).includes(viene.status)) {
    await admin.from('table_members').delete().eq('booking_id', viene.id)
    await encolar(
      { perfil: viene.profile_id },
      'mas_uno_sin_puesto',
      { motivo: 'cambio', deReserva: bookingId },
      { eventoId: r.reserva.event_id },
    )
  }
  return 'ok'
}

/**
 * Anula el enlace vivo y cancela al acompañante si lo había. Lo usan cambiar
 * de acompañante, la cancelación de quien reserva y el cierre.
 */
export async function soltarAcompanante(admin: Admin, bookingId: string, motivo: string): Promise<void> {
  const ahora = new Date().toISOString()
  await admin.from('mas_uno_invitaciones').update({ anulada_en: ahora }).eq('booking_id', bookingId).is('anulada_en', null)

  const viene = await acompananteVivo(admin, bookingId)
  if (viene && (VIVAS as readonly string[]).includes(viene.status)) {
    await admin
      .from('bookings')
      .update({ status: 'cancelled_by_ops', cancelled_at: ahora, cancel_reason: motivo })
      .eq('id', viene.id)
  }
}

/**
 * Se bajó el acompañante ya aprobado (Michael, 01-11): el puesto vuelve a
 * «sin usar» con un enlace nuevo, y quien reserva se entera. Si llega el
 * cierre sin nadie, aplica la regla del cierre.
 */
export async function seBajoElAcompanante(admin: Admin, reservaDelAcompanante: string): Promise<void> {
  const { data: suya } = await admin
    .from('bookings')
    .select('mas_uno_de, event_id')
    .eq('id', reservaDelAcompanante)
    .maybeSingle()
  if (!suya?.mas_uno_de) return

  const r = await reservaDeQuienInvita(admin, suya.mas_uno_de)
  if (!r || !(VIVAS as readonly string[]).includes(r.reserva.status)) return

  await admin
    .from('mas_uno_invitaciones')
    .update({ anulada_en: new Date().toISOString() })
    .eq('booking_id', suya.mas_uno_de)
    .is('anulada_en', null)
  await invitacionViva(admin, suya.mas_uno_de)
  const { data: quien } = await admin.from('bookings').select('profile_id').eq('id', reservaDelAcompanante).maybeSingle()
  await encolar(
    { perfil: r.reserva.profile_id },
    'mas_uno_se_bajo',
    { bookingId: suya.mas_uno_de, quien: quien?.profile_id ?? null },
    { eventoId: suya.event_id },
  )
}

/** Lo que cuesta una reserva en créditos: lo que se le cobró, o lo que vale la fecha. */
export async function creditosDeLaReserva(admin: Admin, bookingId: string): Promise<number> {
  const { data: cargo } = await admin
    .from('credit_ledger')
    .select('delta')
    .eq('booking_id', bookingId)
    .eq('reason', 'event_charge')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (cargo) return Math.abs(cargo.delta)

  const { data: r } = await admin.from('bookings').select('mas_uno_de, events(credit_cost)').eq('id', bookingId).maybeSingle()
  // La del acompañante no costó nada: los dos puestos los pagó quien reserva.
  if (r?.mas_uno_de) return 0
  return (r as unknown as { events: { credit_cost: number | null } | null } | null)?.events?.credit_cost ?? 1
}

// ---------------------------------------------------------------------
// Los dos momentos del reloj: el aviso del día antes y el cierre.
// ---------------------------------------------------------------------

type Pendiente = { bookingId: string; perfilId: string; eventoId: string; cierraEn: string; status: string }

/** Las reservas de quien invita, en fechas +1, sin acompañante sentado. */
async function sinAcompanante(admin: Admin, filtro: { cierranAntesDe: string; cierranDespuesDe?: string }): Promise<Pendiente[]> {
  let q = admin
    .from('events')
    .select('id, booking_closes_at')
    .eq('mas_uno', true)
    .neq('status', 'cancelled')
    .lte('booking_closes_at', filtro.cierranAntesDe)
  if (filtro.cierranDespuesDe) q = q.gt('booking_closes_at', filtro.cierranDespuesDe)
  const { data: fechas } = await q
  if (!fechas?.length) return []

  const salida: Pendiente[] = []
  for (const f of fechas) {
    const { data: reservas } = await admin
      .from('bookings')
      .select('id, profile_id, status')
      .eq('event_id', f.id)
      .is('mas_uno_de', null)
      .in('status', [...VIVAS])
    for (const r of reservas ?? []) {
      if (await acompananteVivo(admin, r.id)) continue
      salida.push({ bookingId: r.id, perfilId: r.profile_id, eventoId: f.id, cierraEn: f.booking_closes_at, status: r.status })
    }
  }
  return salida
}

/**
 * Como mínimo el día antes del cierre, a quien todavía no tiene acompañante
 * aprobado. Una vez por reserva.
 */
export async function recordarAntesDelCierre(admin: Admin, seco = false): Promise<Pendiente[]> {
  const ahora = Date.now()
  const pendientes = await sinAcompanante(admin, {
    cierranAntesDe: new Date(ahora + 24 * 3600_000).toISOString(),
    cierranDespuesDe: new Date(ahora).toISOString(),
  })

  const avisar: Pendiente[] = []
  for (const p of pendientes) {
    const { data: ya } = await admin
      .from('scheduled_emails')
      .select('id')
      .eq('profile_id', p.perfilId)
      .eq('event_id', p.eventoId)
      .eq('kind', 'mas_uno_recordatorio')
      .limit(1)
      .maybeSingle()
    if (ya) continue
    avisar.push(p)
    if (!seco) await encolar({ perfil: p.perfilId }, 'mas_uno_recordatorio', { bookingId: p.bookingId }, { eventoId: p.eventoId })
  }
  return avisar
}

/**
 * El cierre: sin acompañante aprobado se cancelan los DOS puestos y se
 * abonan dos créditos normales. No se pregunta, no hay crédito dúo y no se
 * le manda a una mesa normal (Michael, 01-11).
 *
 * El abono son créditos, también para quien pagó en bolívares: lo dice el
 * aviso que marcó antes de pagar. Si su pago sigue en revisión, el crédito
 * espera a que operación lo confirme, como en cualquier cancelación.
 */
export async function cerrarSinAcompanante(admin: Admin, seco = false): Promise<Pendiente[]> {
  const pendientes = await sinAcompanante(admin, { cierranAntesDe: new Date().toISOString() })
  if (seco) return pendientes

  for (const p of pendientes) {
    const ahora = new Date().toISOString()
    const { data: cancelada } = await admin
      .from('bookings')
      .update({ status: 'cancelled_by_ops', cancelled_at: ahora, cancel_reason: MOTIVO_SIN_ACOMPANANTE })
      .eq('id', p.bookingId)
      .in('status', [...VIVAS])
      .select('id')
      .maybeSingle()
    if (!cancelada) continue

    await soltarAcompanante(admin, p.bookingId, MOTIVO_SIN_ACOMPANANTE)

    const { data: pago } = await admin
      .from('payments')
      .select('status')
      .eq('booking_id', p.bookingId)
      .in('status', ['awaiting_proof', 'under_review'])
      .limit(1)
      .maybeSingle()

    if (!pago) {
      const creditos = await creditosDeLaReserva(admin, p.bookingId)
      if (creditos > 0) {
        const { error } = await admin.from('credit_ledger').insert({
          profile_id: p.perfilId,
          delta: creditos,
          reason: 'refund',
          booking_id: p.bookingId,
          note: 'Fecha +1: el acompañante no se verificó antes del cierre',
        })
        if (error) console.error('[mas-uno] no se abonó el cierre', p.bookingId, error)
      }
    }

    await encolar({ perfil: p.perfilId }, 'mas_uno_cancelada', { bookingId: p.bookingId }, { eventoId: p.eventoId })
  }
  return pendientes
}

/**
 * La casilla del aviso, en las tres puertas que apartan puesto: reservar con
 * crédito, reportar un pago y canjear un cupón del 100 %. Una casilla que
 * solo vigila la pantalla no es una condición.
 */
export const MOTIVO_SIN_CONDICIONES = 'falta-aceptar-condiciones'

export function faltanCondiciones(
  evento: { mas_uno?: boolean | null },
  acepta: boolean | undefined,
): { error: string; motivo: string } | null {
  if (!evento.mas_uno || acepta === true) return null
  return { error: MAS_UNO.aviso.falta, motivo: MOTIVO_SIN_CONDICIONES }
}

/**
 * Para la cola de verificación: de estas personas, quién está unida a un
 * enlace +1 todavía libre, con el cierre de esa fecha y quién le invita.
 */
export async function masUnoEnLaCola(
  admin: Admin,
  ids: string[],
): Promise<Map<string, { cierraEn: string; zonaHoraria: string; invita: string | null }>> {
  const salida = new Map<string, { cierraEn: string; zonaHoraria: string; invita: string | null }>()
  if (!ids.length) return salida

  const { data: unidas } = await admin
    .from('mas_uno_candidatos')
    .select('profile_id, mas_uno_invitaciones!inner(booking_id, anulada_en, usada_por)')
    .in('profile_id', ids)

  for (const u of unidas ?? []) {
    const inv = u.mas_uno_invitaciones as unknown as { booking_id: string; anulada_en: string | null; usada_por: string | null }
    if (inv.anulada_en || inv.usada_por) continue
    const r = await reservaDeQuienInvita(admin, inv.booking_id)
    if (!r || !(VIVAS as readonly string[]).includes(r.reserva.status)) continue
    if (Date.parse(r.evento.booking_closes_at) <= Date.now()) continue

    const previa = salida.get(u.profile_id)
    if (previa && previa.cierraEn <= r.evento.booking_closes_at) continue

    const { data: quien } = await admin
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', r.reserva.profile_id)
      .maybeSingle()
    salida.set(u.profile_id, {
      cierraEn: r.evento.booking_closes_at,
      zonaHoraria: await zonaDeCiudad(r.evento.city_slug),
      invita: nombreDePila(quien),
    })
  }
  return salida
}

/**
 * El enlace abierto por alguien que todavía no tiene sesión se guarda aquí
 * hasta que entra o se da de alta, como el código de referido. Lo lee
 * `trasEntrar`, que es la puerta común de las tres formas de entrar.
 */
export const COOKIE_MAS_UNO = 'aro_mas_uno'

/**
 * Lo que va en Mi mesa, Mi cuenta y «Estás dentro» de una reserva:
 * `masUno` para quien reserva y `vienesCon` para el acompañante. Los dos
 * nulos en una fecha normal, así que una respuesta de siempre no cambia de
 * forma: solo gana dos campos.
 */
export async function masUnoDeLaReserva(
  admin: Admin,
  bookingId: string,
): Promise<{ masUno: MasUno | null; vienesCon: string | null; miNombre?: string | null }> {
  const [masUno, vienesCon] = await Promise.all([masUnoDe(admin, bookingId), vienesConDe(admin, bookingId)])
  if (!masUno && !vienesCon) return { masUno, vienesCon }
  // Y el nombre de pila de quien mira: las dos iniciales de «Laura viene
  // contigo» (4C). Solo en una +1, que es donde se pinta.
  const { data: r } = await admin
    .from('bookings')
    .select('profiles!bookings_profile_id_fkey(display_name, full_name)')
    .eq('id', bookingId)
    .maybeSingle()
  const miNombre = nombreDePila((r as unknown as { profiles: { display_name: string | null; full_name: string | null } | null } | null)?.profiles)
  return { masUno, vienesCon, miNombre }
}

/**
 * La fecha +1 que el cierre le canceló por falta de acompañante, mientras
 * esa fecha no haya pasado. Es lo que dice la tarjeta en su estado
 * «cancelada»: qué pasó y los dos créditos.
 */
export async function masUnoCanceladoDe(admin: Admin, perfilId: string): Promise<MasUno | null> {
  const { data: r } = await admin
    .from('bookings')
    .select('id, events!inner(starts_at)')
    .eq('profile_id', perfilId)
    .eq('status', 'cancelled_by_ops')
    .eq('cancel_reason', MOTIVO_SIN_ACOMPANANTE)
    .gt('events.starts_at', new Date().toISOString())
    .order('cancelled_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return r ? masUnoDe(admin, r.id) : null
}

/**
 * Quién viene con quién en una mesa: perfil → perfil de su dúo. Vacío en
 * una mesa normal. Para que la mesa revelada pueda decir «vienen juntas».
 */
export async function duosDeLaMesa(admin: Admin, tableId: string): Promise<Map<string, string>> {
  const { data: miembros } = await admin.from('table_members').select('profile_id, booking_id').eq('table_id', tableId)
  const ids = (miembros ?? []).map((m) => m.booking_id).filter((x): x is string => !!x)
  const salida = new Map<string, string>()
  if (!ids.length) return salida

  const { data: reservas } = await admin.from('bookings').select('id, profile_id, mas_uno_de').in('id', ids)
  const perfilDe = new Map((reservas ?? []).map((r) => [r.id, r.profile_id]))
  for (const r of reservas ?? []) {
    const otra = r.mas_uno_de ? perfilDe.get(r.mas_uno_de) : undefined
    if (!otra) continue
    salida.set(r.profile_id, otra)
    salida.set(otra, r.profile_id)
  }
  return salida
}


/**
 * Lo que dicen los cinco avisos, para el correo y la push. El texto vive en
 * `AroReglas.MAS_UNO.correos`; aquí se buscan los datos. Se arma AL MANDAR,
 * no al encolar: si entre medias el acompañante se verificó, el «todavía no
 * se ha verificado» ya no sale.
 */
export async function datosDeCorreoMasUno(
  admin: Admin,
  tipo: CorreoMasUno,
  eventoId: string | null,
  p: Record<string, unknown>,
): Promise<(ReturnType<(typeof MAS_UNO.correos)[CorreoMasUno]> & { aMesa: boolean; aAgenda: boolean }) | { error: string }> {
  if (!eventoId) return { error: 'sin fecha' }
  const { data: ev } = await admin
    .from('events')
    .select('starts_at, booking_closes_at, city_slug')
    .eq('id', eventoId)
    .maybeSingle()
  if (!ev) return { error: 'sin fecha' }
  const zona = await zonaDeCiudad(ev.city_slug)
  const partes = partesDe(ev.starts_at, zona)
  const d = {
    nombre: null as string | null,
    invita: null as string | null,
    plazo: MAS_UNO.plazo(ev.booking_closes_at, zona),
    dia: partes ? partes.dia + ' ' + partes.numero : '',
    estado: null as string | null,
    enRevision: false,
    motivo: typeof p.motivo === 'string' ? p.motivo : null,
  }
  const bookingId = typeof p.bookingId === 'string' ? p.bookingId : null

  const nombreDe = async (id: unknown) => {
    if (typeof id !== 'string') return null
    const { data } = await admin.from('profiles').select('display_name, full_name').eq('id', id).maybeSingle()
    return nombreDePila(data)
  }

  if (tipo === 'mas_uno_recordatorio') {
    if (!bookingId) return { error: 'sin reserva' }
    const m = await masUnoDe(admin, bookingId)
    // Ya está confirmado, o la reserva ya no existe: no hay nada que recordar.
    if (!m || m.estado === 'confirmado' || m.estado === 'cancelada') return { error: 'ya no hace falta' }
    d.estado = m.estado
    d.nombre = m.nombre
  } else if (tipo === 'mas_uno_confirmado') {
    if (!bookingId) return { error: 'sin reserva' }
    const viene = await acompananteVivo(admin, bookingId)
    if (!viene) return { error: 'ya no viene' }
    d.nombre = nombreDePila(viene.profiles)
  } else if (tipo === 'mas_uno_se_bajo') {
    d.nombre = await nombreDe(p.quien)
  } else if (tipo === 'mas_uno_cancelada') {
    if (bookingId) {
      const { data: pago } = await admin
        .from('payments')
        .select('id')
        .eq('booking_id', bookingId)
        .in('status', ['awaiting_proof', 'under_review'])
        .limit(1)
        .maybeSingle()
      d.enRevision = !!pago
    }
  } else if (tipo === 'mas_uno_sin_puesto') {
    if (typeof p.deReserva === 'string') {
      const { data: de } = await admin.from('bookings').select('profile_id').eq('id', p.deReserva).maybeSingle()
      d.invita = await nombreDe(de?.profile_id)
    }
  }

  const texto = MAS_UNO.correos[tipo](d)
  // El botón va a uno de dos sitios, y la plantilla los lleva escritos: un
  // enlace armado con una variable no lo puede comprobar nadie.
  return { ...texto, aMesa: texto.ruta === '/mesa', aAgenda: texto.ruta === '/agenda' }
}

/**
 * Cuántos PUESTOS tiene cada fecha, que es lo que dice «12 apuntados».
 *
 * En una fecha +1 cada reserva son dos puestos —el acompañante, confirmado
 * o no, ya está pagado— y la reserva del acompañante no suma otra vez: su
 * silla la contó quien le invitó.
 */
export function puestosPorFecha(
  reservas: { event_id: string; mas_uno_de?: string | null }[],
  fechasMasUno: Set<string>,
): Map<string, number> {
  const cuenta = new Map<string, number>()
  for (const b of reservas) {
    if (b.mas_uno_de) continue
    cuenta.set(b.event_id, (cuenta.get(b.event_id) ?? 0) + (fechasMasUno.has(b.event_id) ? 2 : 1))
  }
  return cuenta
}

/**
 * 5D · Quien entró por un enlace y todavía no se ha verificado: su puesto
 * le espera. No tiene reserva todavía —el puesto es de la primera persona
 * cuya verificación se aprueba—, así que Mi mesa lo enseña desde aquí.
 *
 * La invitación más próxima que siga libre, con la fecha y quién invita.
 */
export type InvitacionPendiente = {
  invita: string | null
  eventoId: string
  formato: string
  empiezaEn: string
  revelaEn: string | null
  cierraEn: string
  plazo: string
  zonaHoraria: string
  zonas: string[]
}

export async function invitacionPendienteDe(admin: Admin, perfilId: string): Promise<InvitacionPendiente | null> {
  const { data: unidas } = await admin
    .from('mas_uno_candidatos')
    .select('mas_uno_invitaciones!inner(booking_id, anulada_en, usada_por)')
    .eq('profile_id', perfilId)

  let mejor: InvitacionPendiente | null = null
  for (const u of unidas ?? []) {
    const inv = u.mas_uno_invitaciones as unknown as { booking_id: string; anulada_en: string | null; usada_por: string | null }
    if (inv.anulada_en || inv.usada_por) continue
    const r = await reservaDeQuienInvita(admin, inv.booking_id)
    if (!r || !(VIVAS as readonly string[]).includes(r.reserva.status)) continue
    if (Date.parse(r.evento.booking_closes_at) <= Date.now()) continue
    if (mejor && mejor.empiezaEn <= r.evento.starts_at) continue

    const zona = await zonaDeCiudad(r.evento.city_slug)
    const [{ data: quien }, { data: ev }, { data: sedes }] = await Promise.all([
      admin.from('profiles').select('display_name, full_name').eq('id', r.reserva.profile_id).maybeSingle(),
      admin.from('events').select('format, reveal_at').eq('id', r.reserva.event_id).maybeSingle(),
      admin.from('event_venues').select('zone_slug, zones(name)').eq('event_id', r.reserva.event_id),
    ])
    mejor = {
      invita: nombreDePila(quien),
      eventoId: r.reserva.event_id,
      formato: ev?.format ?? 'dinner',
      empiezaEn: r.evento.starts_at,
      revelaEn: ev?.reveal_at ?? null,
      cierraEn: r.evento.booking_closes_at,
      plazo: MAS_UNO.plazo(r.evento.booking_closes_at, zona),
      zonaHoraria: zona,
      zonas: [...new Set((sedes ?? []).map((v) => (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug))],
    }
  }
  return mejor
}

/**
 * «Con quién cenas» por dúos (6B): el tuyo primero, y cada dúo junto. Una
 * mesa normal se queda como venía.
 */
export function ordenarPorDuos<T extends { id: string; vieneCon: string | null }>(companeros: T[], yo: string): T[] {
  if (!companeros.some((c) => c.vieneCon)) return companeros
  const salida: T[] = []
  const mio = companeros.find((c) => c.vieneCon === yo)
  if (mio) salida.push(mio)
  for (const c of companeros) {
    if (salida.includes(c)) continue
    salida.push(c)
    const suya = companeros.find((o) => o.id === c.vieneCon)
    if (suya && !salida.includes(suya)) salida.push(suya)
  }
  return salida
}

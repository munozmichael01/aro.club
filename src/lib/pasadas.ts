import 'server-only'

import { contactoPorMesa, nombresDe, type ContactoDeCena } from '@/lib/contacto'
import { claveDeMesa, claveDeNumero, mesasUnicas, numeroQueSeDice } from '@/lib/mesa-unica'
import type { createAdminClient } from '@/lib/supabase/admin'
import { FIN_CENA, sePuedeValorar } from '@/lib/ventana-mesa'
import { zonaDeCiudad } from '@/lib/zona-ciudad'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Las cenas pasadas de una persona, con lo de cada una.
 *
 * Entrega mi-mesa-pasadas de Design (31-10). Michael: «que el servidor dé las
 * cenas pasadas de cada persona con lo de cada una (con quién, valoración,
 * estado de contacto) y qué hay sin ver».
 *
 * La usan la pestaña Pasadas, la línea de Próxima, el punto de «hay algo
 * nuevo» y Mis cenas de Perfil. Antes Mi mesa dejaba de enseñar una cena en
 * cuanto se contestaba la encuesta, y para coincidir con alguien hay que
 * haberla contestado: el contacto no se habría visto casi nunca.
 *
 * Solo las que tuvo MESA: una reserva sin mesa no es una cena a la que fue.
 */
export type Pendiente = 'contacto' | 'encuesta' | null

export type Pasada = {
  mesaId: string
  eventoId: string
  empiezaEn: string
  zonaHoraria: string
  formato: string | null
  sitio: string | null
  zona: string | null
  numeroMesa: number | null
  companeros: { id: string; nombre: string; inicial: string }[]
  /** La encuesta: pendiente, o cuándo la contó. `saltada` es «Ahora no»: sigue pendiente. */
  encuesta: { pendiente: boolean; contadaEn: string | null }
  contacto: ContactoDeCena | null
  /** Lo que falta hacer en esa cena. El contacto manda: caduca. */
  pendiente: Pendiente
  /** Hay algo que no ha visto (brief, punto 5). */
  nuevo: boolean
  /**
   * La tarjeta «¿Con quién de esta mesa te gustaría seguir en contacto?»: su
   * encuesta es de antes de que existiera la pregunta y todavía no la ha
   * contestado aparte (Michael, 31-10: solo aquí, sin correo ni push).
   */
  preguntarContacto: boolean
}

/**
 * Desde cuándo la encuesta trae «¿seguir en contacto?» (0c09467, 29-10 a las
 * 3:23 a.m. de Caracas, y su despliegue). Una encuesta contada antes de esto
 * no la tuvo delante.
 */
export const PREGUNTA_CONTACTO_DESDE = '2026-10-29T07:30:00Z'

export async function cenasPasadas(admin: Admin, yo: string): Promise<Pasada[]> {
  const ahora = Date.now()
  const { data: suyas } = await admin
    .from('table_members')
    .select('table_id, booking_id, bookings!inner(status, cancelled_at), dinner_tables!inner(event_id, table_number, restaurant_id, restaurants(name, zones(name)), events!inner(starts_at, format, city_slug))')
    .eq('profile_id', yo)

  type Fila = {
    table_id: string
    bookings: { status: string; cancelled_at: string | null }
    dinner_tables: {
      event_id: string
      table_number: number | null
      restaurant_id: string | null
      restaurants: { name: string; zones: { name: string } | null } | null
      events: { starts_at: string; format: string | null; city_slug: string }
    }
  }
  const filas = ((suyas ?? []) as unknown as Fila[]).filter(
    (f) =>
      ['confirmed', 'attended'].includes(f.bookings.status) &&
      !f.bookings.cancelled_at &&
      Date.parse(f.dinner_tables.events.starts_at) + FIN_CENA < ahora,
  )
  if (!filas.length) return []

  const mesas = filas.map((f) => f.table_id)
  const [{ data: gente }, { data: contadas }, contacto] = await Promise.all([
    admin.from('table_members').select('table_id, profile_id, seat_order').in('table_id', mesas).neq('profile_id', yo).order('seat_order'),
    admin.from('table_feedback').select('table_id, created_at, saltada_at').eq('profile_id', yo).in('table_id', mesas),
    contactoPorMesa(admin, yo),
  ])
  const nombres = await nombresDe(admin, [...new Set((gente ?? []).map((g) => g.profile_id))])

  // Lo que hace falta para la tarjeta de las cenas de antes del 29-10: si ya
  // la contestó aparte, y si ya marcó a alguien de esa mesa. Consulta aparte
  // y tolerante: si falla, la tarjeta no sale, que es lo prudente.
  const [{ data: respondidas, error: eResp }, { data: misMarcas }] = await Promise.all([
    admin.from('table_feedback').select('table_id, contacto_respondido_en').eq('profile_id', yo).in('table_id', mesas),
    admin.from('peer_feedback').select('table_id').eq('rater_id', yo).eq('signal', 'connect').in('table_id', mesas),
  ])
  const yaRespondio = new Set(
    eResp ? mesas : (respondidas ?? []).filter((r) => r.contacto_respondido_en).map((r) => r.table_id),
  )
  const yaMarco = new Set((misMarcas ?? []).map((m) => m.table_id))
  const contadaEn = new Map((contadas ?? []).filter((c) => !c.saltada_at).map((c) => [c.table_id, c.created_at]))

  /**
   * El número de mesa, con las mismas dos reglas que Mi mesa: el número que
   * se dice en el sitio, y ninguno si es la única mesa de Aro esa noche ahí
   * («di que vas a la mesa de Aro»). Dos criterios para el mismo número son
   * como se acaba enseñando «Mesa 04» en un sitio y nada en el otro.
   */
  const pares = filas.map((f) => ({ eventoId: f.dinner_tables.event_id, sitioId: f.dinner_tables.restaurant_id, numero: f.dinner_tables.table_number ?? 0 }))
  const [unicas, dichos] = await Promise.all([mesasUnicas(pares), numeroQueSeDice(pares.filter((x) => x.numero))])
  const numeroDe = (f: Fila) => {
    const t = f.dinner_tables
    if (!t.table_number || unicas.has(claveDeMesa(t.event_id, t.restaurant_id))) return null
    return dichos.get(claveDeNumero(t.event_id, t.table_number)) ?? t.table_number
  }

  const zonas = new Map<string, string>()
  for (const slug of new Set(filas.map((f) => f.dinner_tables.events.city_slug))) zonas.set(slug, await zonaDeCiudad(slug))

  return filas
    .map((f): Pasada => {
      const ev = f.dinner_tables.events
      const c = contacto.get(f.table_id) ?? null
      const encuestaPendiente = sePuedeValorar(ev.starts_at, ahora) && !contadaEn.has(f.table_id)
      const pendiente: Pendiente = c?.porConfirmar.length ? 'contacto' : encuestaPendiente ? 'encuesta' : null
      return {
        mesaId: f.table_id,
        eventoId: f.dinner_tables.event_id,
        empiezaEn: ev.starts_at,
        zonaHoraria: zonas.get(ev.city_slug) ?? '',
        formato: ev.format,
        sitio: f.dinner_tables.restaurants?.name ?? null,
        zona: f.dinner_tables.restaurants?.zones?.name ?? null,
        numeroMesa: numeroDe(f),
        companeros: (gente ?? [])
          .filter((g) => g.table_id === f.table_id)
          .map((g) => {
            const n = nombres.get(g.profile_id) ?? 'Alguien'
            return { id: g.profile_id, nombre: n, inicial: n.charAt(0).toUpperCase() }
          }),
        encuesta: { pendiente: encuestaPendiente, contadaEn: contadaEn.get(f.table_id) ?? null },
        contacto: c,
        pendiente,
        nuevo: !!c?.nuevo,
        preguntarContacto:
          !!contadaEn.get(f.table_id) &&
          Date.parse(contadaEn.get(f.table_id)!) < Date.parse(PREGUNTA_CONTACTO_DESDE) &&
          !yaRespondio.has(f.table_id) &&
          !yaMarco.has(f.table_id) &&
          !c &&
          (gente ?? []).some((g) => g.table_id === f.table_id),
      }
    })
    .sort((a, b) => Date.parse(b.empiezaEn) - Date.parse(a.empiezaEn))
}

/**
 * La línea de Próxima (brief, punto 2): lo pendiente de una cena pasada, que
 * va encima de la reserva activa sin taparla. El contacto manda sobre la
 * encuesta, porque caduca; con varias cenas, la más reciente.
 */
export function lineaDePendientes(pasadas: Pasada[]) {
  const con = (p: Pendiente) => pasadas.filter((x) => x.pendiente === p)[0]
  const elegida = con('contacto') ?? con('encuesta')
  if (!elegida) return null
  return {
    tipo: elegida.pendiente as 'contacto' | 'encuesta',
    mesaId: elegida.mesaId,
    empiezaEn: elegida.empiezaEn,
    zonaHoraria: elegida.zonaHoraria,
    // Para «Andrea también quiere seguir en contacto · quedan 6 días».
    nombres: elegida.contacto?.porConfirmar ?? [],
    cierraEn: elegida.contacto?.cierraEn ?? null,
  }
}

/** El punto: cualquier pendiente o novedad de cualquier cena (entrega, N). */
export const hayQueMirar = (pasadas: Pasada[]) => pasadas.some((p) => p.nuevo || !!p.pendiente)

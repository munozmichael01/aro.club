import { NextResponse } from 'next/server'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Histórico de mesas: todo lo que se ha sentado alguna vez.
 *
 * Hasta ahora una mesa solo existía mientras era futuro. En cuanto pasaba la
 * fecha desaparecía de la pantalla: el panel enseña el reparto de las fechas
 * abiertas y nada más. Eso deja a operación sin poder contestar tres
 * preguntas que se hacen todas las semanas —«¿con quién ha cenado ya esta
 * persona?», «¿cuántas veces hemos ido a este restaurante?», «¿qué pasó en
 * Las Mercedes el mes pasado?»— y la única forma de responderlas hoy es
 * abrir la base a mano.
 *
 * La tercera importa más de lo que parece: el reparto tiene un veto por
 * repetición —no volver a sentar juntos a quienes ya cenaron— y ese veto se
 * aplica a ciegas. Cuando salta, el panel dice «rompe reglas duras» y no
 * enseña de qué mesa viene. Aquí sí se ve.
 *
 * ## Qué es una mesa aquí
 *
 * Una fila de `dinner_tables`, que solo existe cuando el reparto ya corrió.
 * Van TODAS, no solo las pasadas: si el histórico empezara en la fecha de
 * ayer, la pestaña estaría vacía justo el día que hay algo que mirar. Las que
 * todavía no se han celebrado salen marcadas `porCelebrar`, y ordenadas
 * primero por ser las que están vivas.
 *
 * Lo que NO sale es un reparto sin publicar. `repartir` deja la propuesta en
 * `matching_runs` y no toca `dinner_tables` a propósito —el disparador de
 * `table_members` apunta los pares en `pair_encounters`, y una propuesta que
 * se rehace no puede dejar a dos personas marcadas como que ya cenaron—, así
 * que aquí una fila es siempre una mesa publicada. Para ver una propuesta
 * está la pestaña de Reparto, que es donde se puede cambiar.
 *
 * ## La búsqueda
 *
 * Una sola caja que mira zona, restaurante y persona a la vez, porque es
 * cómo se pregunta: quien escribe «altamira» no está eligiendo entre buscar
 * por zona o por local, está buscando altamira. Se compara sin tildes y sin
 * mayúsculas —«Chacaíto» y «chacaito» son la misma zona escrita por dos
 * personas distintas—, y de la persona valen el nombre, el trato y el correo,
 * que es lo que operación tiene a mano cuando llega una consulta.
 *
 * Se filtra AQUÍ y no en el navegador, por lo mismo que en Gente: la lista va
 * paginada, y filtrar delante filtraría solo la página que se ve.
 *
 * ## El techo, dicho claro
 *
 * Esto lee las mesas enteras y cruza en memoria. Con las mesas de un año de
 * cenas semanales son unos cientos de filas, y no se nota. El día que sean
 * miles hay que bajar la búsqueda a SQL —una vista con nombre de zona, de
 * local y de comensales ya concatenados, e `ilike` sobre ella—, y ese día
 * esta ruta deja de derivar nada: si la vista arma el texto de búsqueda y
 * esto también, vuelven a ser dos verdades. Está anotado en `docs/BACKLOG.md`.
 *
 * **No exporta y no manda nada.** Es de lectura: la ficha de cada persona
 * sigue siendo `/api/operacion/miembro`.
 */

/** Cuántas mesas por página si nadie dice otra cosa. */
const TAM = 12
const TAM_MAX = 100

/** El tope de PostgREST, que obliga a leer por tramos. */
const TRAMO = 1000

async function todasLasFilas<T>(
  leer: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += TRAMO) {
    const { data, error } = await leer(desde, desde + TRAMO - 1)
    if (error) throw error
    const tramo = data ?? []
    filas.push(...tramo)
    if (tramo.length < TRAMO) return filas
  }
}

/**
 * Sin tildes y en minúscula, para comparar.
 *
 * `normalize('NFD')` separa la letra de su acento y el rango borra los
 * acentos sueltos. Sin esto, buscar «chacaito» no encuentra «Chacaíto», que
 * es justo lo que escribe quien tiene prisa.
 */
function plano(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/** Lo que la pantalla pinta de cada comensal. */
type Comensal = {
  id: string
  nombre: string
  /** `attended`, `no_show`, `confirmed`… tal cual la reserva. */
  estado: string
  /** Vino, no vino, o todavía no se sabe. Lo que se pinta. */
  vino: 'si' | 'no' | 'pendiente'
  /** La reserva, que es lo que se marca. Sin esto el interruptor no sabe a
   * qué fila escribir: la asistencia vive en `bookings`, no en la mesa. */
  reservaId: string
}

type Mesa = {
  id: string
  numero: number
  fecha: string
  formato: string
  zona: string
  zonaSlug: string
  restaurante: string
  restauranteId: string | null
  score: number | null
  notas: string
  comensales: Comensal[]
  /** Media de NPS de quienes valoraron, y cuántos fueron. */
  nps: number | null
  valoraron: number
  porCelebrar: boolean
}

const FORMATO_TXT: Record<string, string> = {
  dinner: 'Cena', lunch: 'Almuerzo', brunch: 'Brunch',
  drinks: 'Drinks', coffee: 'Café', activity: 'Plan',
}

/** Las reservas que significan que esa persona sí se sentó. */
const VINO = new Set(['attended'])
const NO_VINO = new Set(['no_show', 'cancelled_by_user', 'cancelled_by_ops'])

export async function GET(request: Request) {
  const actor = await exigirOps()
  // 404 y no 403: a quien no es de operación esta ruta no le existe.
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()
  const url = new URL(request.url)

  // Todo de una vez: ninguna de estas consultas necesita el resultado de
  // otra, y en cadena son cinco idas y vueltas que se notan en cada tecla.
  let mesasRaw, miembros, eventos, locales, zonas, perfiles, reservas, valoraciones
  try {
    [mesasRaw, miembros, eventos, locales, zonas, perfiles, reservas, valoraciones] = await Promise.all([
      todasLasFilas<{ id: string; event_id: string; table_number: number; score: number | null; restaurant_id: string | null; notes_ops: string | null; created_at: string }>(
        (d, h) => admin.from('dinner_tables')
          .select('id, event_id, table_number, score, restaurant_id, notes_ops, created_at')
          .range(d, h)),
      todasLasFilas<{ table_id: string; profile_id: string; booking_id: string; seat_order: number | null }>(
        (d, h) => admin.from('table_members').select('table_id, profile_id, booking_id, seat_order').range(d, h)),
      todasLasFilas<{ id: string; starts_at: string; format: string; zone_slug: string | null; restaurant_id: string | null }>(
        (d, h) => admin.from('events').select('id, starts_at, format, zone_slug, restaurant_id').range(d, h)),
      todasLasFilas<{ id: string; name: string; zone_slug: string | null }>(
        (d, h) => admin.from('restaurants').select('id, name, zone_slug').range(d, h)),
      todasLasFilas<{ slug: string; name: string }>(
        (d, h) => admin.from('zones').select('slug, name').range(d, h)),
      todasLasFilas<{ id: string; full_name: string | null; display_name: string | null; email: string | null }>(
        (d, h) => admin.from('profiles').select('id, full_name, display_name, email').range(d, h)),
      todasLasFilas<{ id: string; status: string }>(
        (d, h) => admin.from('bookings').select('id, status').range(d, h)),
      todasLasFilas<{ table_id: string; nps: number | null }>(
        (d, h) => admin.from('table_feedback').select('table_id, nps').range(d, h)),
    ])
  } catch (e) {
    console.error('[historico] no se pudo leer', e)
    return NextResponse.json({ error: 'No se pudo leer el histórico' }, { status: 500 })
  }

  const evPorId = new Map(eventos.map((e) => [e.id, e]))
  const localPorId = new Map(locales.map((r) => [r.id, r]))
  const zonaPorSlug = new Map(zonas.map((z) => [z.slug, z.name]))
  const perfilPorId = new Map(perfiles.map((p) => [p.id, p]))
  const reservaPorId = new Map(reservas.map((b) => [b.id, b.status]))

  const miembrosPorMesa = new Map<string, typeof miembros>()
  for (const m of miembros) {
    const lista = miembrosPorMesa.get(m.table_id)
    if (lista) lista.push(m)
    else miembrosPorMesa.set(m.table_id, [m])
  }

  const npsPorMesa = new Map<string, number[]>()
  for (const v of valoraciones) {
    if (v.nps == null) continue
    const lista = npsPorMesa.get(v.table_id)
    if (lista) lista.push(v.nps)
    else npsPorMesa.set(v.table_id, [v.nps])
  }

  const ahora = Date.now()

  const todas: Mesa[] = mesasRaw.map((t) => {
    const ev = evPorId.get(t.event_id)
    // El local puede estar en la mesa o en la fecha: el reparto puede repartir
    // dos mesas del mismo día a dos sitios, y cuando no lo hace vale el de la
    // fecha. Sin esta caída, media pantalla diría «sin asignar» teniéndolo.
    const local = localPorId.get(t.restaurant_id ?? ev?.restaurant_id ?? '') ?? null
    const slug = ev?.zone_slug ?? local?.zone_slug ?? ''

    const comensales: Comensal[] = (miembrosPorMesa.get(t.id) ?? [])
      .sort((a, b) => (a.seat_order ?? 0) - (b.seat_order ?? 0))
      .map((m) => {
        const p = perfilPorId.get(m.profile_id)
        const estado = reservaPorId.get(m.booking_id) ?? ''
        return {
          id: m.profile_id,
          nombre: p?.full_name || p?.display_name || 'Sin nombre',
          estado,
          vino: VINO.has(estado) ? 'si' : NO_VINO.has(estado) ? 'no' : 'pendiente',
          reservaId: m.booking_id,
        } as Comensal
      })

    const notas = npsPorMesa.get(t.id) ?? []

    return {
      id: t.id,
      numero: t.table_number,
      fecha: ev?.starts_at ?? t.created_at,
      formato: FORMATO_TXT[ev?.format ?? ''] ?? (ev?.format ?? '—'),
      zona: zonaPorSlug.get(slug) ?? (slug ? slug.replace(/_/g, ' ') : 'Sin zona'),
      zonaSlug: slug,
      restaurante: local?.name ?? 'Sin asignar',
      restauranteId: local?.id ?? null,
      score: t.score == null ? null : Number(t.score),
      notas: t.notes_ops ?? '',
      comensales,
      nps: notas.length ? Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)) : null,
      valoraron: notas.length,
      porCelebrar: new Date(ev?.starts_at ?? t.created_at).getTime() > ahora,
    }
  })

  // --- la búsqueda -------------------------------------------------------
  const q = plano(url.searchParams.get('q') ?? '')
  const coincide = (m: Mesa) => {
    if (!q) return true
    if (plano(m.zona).includes(q) || plano(m.zonaSlug).includes(q)) return true
    if (plano(m.restaurante).includes(q)) return true
    return m.comensales.some((c) => {
      if (plano(c.nombre).includes(q)) return true
      const p = perfilPorId.get(c.id)
      return plano(p?.display_name ?? '').includes(q) || plano(p?.email ?? '').includes(q)
    })
  }

  const filtradas = todas.filter(coincide).sort((a, b) => {
    // Lo vivo primero, y dentro de cada grupo lo más reciente. Al ordenar solo
    // por fecha, la mesa del jueves que viene queda enterrada bajo un año de
    // cenas pasadas, y es la única sobre la que todavía se puede hacer algo.
    if (a.porCelebrar !== b.porCelebrar) return a.porCelebrar ? -1 : 1
    const dif = new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    // Dentro de una misma noche mandan la 1, la 2, la 3: dejarlo al orden en
    // que la base las devuelva pone la mesa 2 encima de la 1 sin motivo, y en
    // una pantalla que se lee de arriba abajo eso parece que significa algo.
    return dif !== 0 ? dif : a.numero - b.numero
  })

  // --- el resumen, sobre TODO lo que cumple, no sobre la página ----------
  //
  // Misma regla que en Gente: la lista es «enséñame estas» y el resumen es
  // «cuántas hay». Sacar el resumen de la página diría que en Altamira hemos
  // hecho doce mesas porque doce es el tamaño de página.
  const personas = new Set<string>()
  const sitios = new Set<string>()
  let comensales = 0
  const npsTodos: number[] = []
  for (const m of filtradas) {
    comensales += m.comensales.length
    m.comensales.forEach((c) => personas.add(c.id))
    if (m.restauranteId) sitios.add(m.restauranteId)
    if (m.nps != null) npsTodos.push(m.nps)
  }

  const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1) || 1)
  const tam = Math.min(TAM_MAX, Math.max(1, Number(url.searchParams.get('tam') ?? TAM) || TAM))
  const paginas = Math.max(1, Math.ceil(filtradas.length / tam))
  const desde = (Math.min(pagina, paginas) - 1) * tam

  return NextResponse.json({
    mesas: filtradas.slice(desde, desde + tam),
    total: filtradas.length,
    // Cuántas hay en total, al margen de lo que se esté buscando. El contador
    // de la pestaña se pinta con esto y no con `total`: un número que baja a
    // cero mientras escribes no dice cuántas mesas hay, dice cuántas cuadran
    // con lo que llevas tecleado, y en el sitio donde vive —al lado de
    // «Gente 22»— eso se lee como que no hay ninguna.
    todas: todas.length,
    pagina: Math.min(pagina, paginas),
    paginas,
    resumen: {
      mesas: filtradas.length,
      comensales,
      personas: personas.size,
      restaurantes: sitios.size,
      nps: npsTodos.length ? Number((npsTodos.reduce((a, b) => a + b, 0) / npsTodos.length).toFixed(1)) : null,
      valoradas: npsTodos.length,
    },
  })
}

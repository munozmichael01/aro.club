import 'server-only'

import { encolar } from '@/lib/correos'
import { CONTACTO, DENTRO, aE164, partesDe, pasadoDe, valido } from '@/lib/reglas'
import type { createAdminClient } from '@/lib/supabase/admin'
import { zonaDeCiudad } from '@/lib/zona-ciudad'
import { duosDeLaMesa } from '@/lib/mas-uno'

type Admin = ReturnType<typeof createAdminClient>

/**
 * «Seguir en contacto», del lado del servidor.
 *
 * Entrega seguir-en-contacto de Design, con lo que decidió Michael el 31-10:
 *
 *  · Dos marcas `connect` mutuas en una mesa son una COINCIDENCIA, con 7 días
 *    de plazo desde que se crea.
 *  · Cada persona elige qué compartir: el teléfono siempre (del perfil, se
 *    puede cambiar y no quitar), Instagram y TikTok si quiere. Se comparte
 *    SOLO si las dos personas confirman.
 *  · Varias coincidencias en la misma cena: un aviso agrupado, los datos una
 *    vez para todas, y el estado por pareja.
 *  · Al cruzarse, correo y push a las dos, por pareja y en el momento. Al
 *    cerrarse el plazo sin cruce, «No se cruzaron» solo a quien confirmó.
 *
 * Los estados son los de la entrega y los decide esta pieza, nunca una
 * pantalla: A por confirmar, B esperando, C las dos confirmaron, D no se
 * cruzaron, E elegiste no. Lo que la otra persona decidió no se deduce de
 * ninguno: con B, D y E nadie sabe si la otra dijo que no o no contestó.
 */

export type Estado = 'A' | 'B' | 'C' | 'D' | 'E'

type Coincidencia = {
  id: string
  table_id: string
  persona_a: string
  persona_b: string
  creada_en: string
  cierra_en: string
  estado_a: string
  estado_b: string
  cruzada_en: string | null
  cerrada_en: string | null
  visto_a_en: string | null
  visto_b_en: string | null
  /** Lo que cada lado dejó a la otra persona, congelado al confirmar. */
  datos_a: DatosContacto | null
  datos_b: DatosContacto | null
}

const COLUMNAS = 'id, table_id, persona_a, persona_b, creada_en, cierra_en, estado_a, estado_b, cruzada_en, cerrada_en, visto_a_en, visto_b_en, datos_a, datos_b'

/** Lo que YO dejé a la otra persona de esta pareja, y lo que ella me dejó a mí. */
const misDatosEn = (c: Coincidencia, yo: string) => (soyA(c, yo) ? c.datos_a : c.datos_b)
const susDatosEn = (c: Coincidencia, yo: string) => (soyA(c, yo) ? c.datos_b : c.datos_a)

const soyA = (c: Coincidencia, yo: string) => c.persona_a === yo
const otraDe = (c: Coincidencia, yo: string) => (soyA(c, yo) ? c.persona_b : c.persona_a)
const miEstado = (c: Coincidencia, yo: string) => (soyA(c, yo) ? c.estado_a : c.estado_b)
const vencida = (c: Coincidencia, ahora: number) => !!c.cerrada_en || Date.parse(c.cierra_en) <= ahora
const abierta = (c: Coincidencia, ahora: number) => !c.cruzada_en && !vencida(c, ahora)

export function estadoPara(c: Coincidencia, yo: string, ahora = Date.now()): Estado {
  if (c.cruzada_en) return 'C'
  if (vencida(c, ahora)) return 'D'
  const m = miEstado(c, yo)
  return m === 'confirmado' ? 'B' : m === 'no' ? 'E' : 'A'
}

/**
 * Si hay algo que no ha visto: la coincidencia, que la otra persona confirmó
 * (el cruce), o «No se cruzaron» si ella había confirmado (brief del 31-10,
 * punto 5). Cerrarse sin haber confirmado no es una novedad para nadie.
 */
export function hayNuevoPara(c: Coincidencia, yo: string): boolean {
  const visto = soyA(c, yo) ? c.visto_a_en : c.visto_b_en
  const cambios = [c.creada_en, c.cruzada_en, miEstado(c, yo) === 'confirmado' ? c.cerrada_en : null]
    .filter((x): x is string => !!x)
    .map((x) => Date.parse(x))
  const ultimo = Math.max(...cambios)
  return !visto || ultimo > Date.parse(visto)
}

// ── crear ────────────────────────────────────────────────────────────────

/**
 * Las coincidencias de una mesa que todavía no existen, creadas.
 *
 * La llaman la encuesta, al guardar las marcas, y el cron, de repaso: si dos
 * personas contestan en el mismo segundo, cada una mira antes de que la otra
 * escriba y ninguna ve la coincidencia. El repaso la encuentra.
 *
 * Devuelve SOLO las que acaba de crear: son las que hay que avisar.
 */
export async function crearCoincidencias(admin: Admin, mesaId: string): Promise<Coincidencia[]> {
  const { data: marcas } = await admin
    .from('peer_feedback')
    .select('rater_id, rated_id')
    .eq('table_id', mesaId)
    .eq('signal', 'connect')
  const hay = new Set((marcas ?? []).map((m) => m.rater_id + ':' + m.rated_id))
  // Un dúo de una fecha +1 no coincide entre sí: vinieron juntos. La
  // encuesta ya no guarda esa marca; esto es por las de antes y por si acaso.
  const duos = await duosDeLaMesa(admin, mesaId)
  const parejas = (marcas ?? [])
    .filter((m) => duos.get(m.rater_id) !== m.rated_id)
    .filter((m) => m.rater_id < m.rated_id && hay.has(m.rated_id + ':' + m.rater_id))
    .map((m) => ({ a: m.rater_id, b: m.rated_id }))
  if (!parejas.length) return []

  const cierra = new Date(Date.now() + CONTACTO.DIAS * 86400_000).toISOString()
  const { data: nuevas, error } = await admin
    .from('contacto_coincidencias')
    .upsert(
      parejas.map((p) => ({ table_id: mesaId, persona_a: p.a, persona_b: p.b, cierra_en: cierra })),
      { onConflict: 'table_id,persona_a,persona_b', ignoreDuplicates: true },
    )
    .select(COLUMNAS)
  if (error) {
    console.error('[contacto] no se crearon las coincidencias', mesaId, error)
    return []
  }
  return (nuevas ?? []) as unknown as Coincidencia[]
}

/**
 * El aviso de coincidencia, agrupado por persona: quien coincide con Andrea y
 * con Luis en la misma pasada recibe UNO, «Andrea y Luis también quieren…».
 */
export async function avisarCoincidencias(admin: Admin, nuevas: Coincidencia[]) {
  if (!nuevas.length) return
  const porPersona = new Map<string, { mesa: string; con: string[] }>()
  for (const c of nuevas) {
    for (const [yo, otra] of [[c.persona_a, c.persona_b], [c.persona_b, c.persona_a]]) {
      const k = yo + ':' + c.table_id
      const g = porPersona.get(k) ?? { mesa: c.table_id, con: [] }
      g.con.push(otra)
      porPersona.set(k, g)
    }
  }
  const eventos = await eventosDe(admin, [...new Set(nuevas.map((c) => c.table_id))])
  for (const [k, g] of porPersona) {
    const yo = k.split(':')[0]
    await encolar({ perfil: yo }, 'contacto_coincidencia', { mesa: g.mesa, con: g.con }, { eventoId: eventos.get(g.mesa) ?? null })
  }
}

/**
 * Quien quita la marca después de la coincidencia, deja de compartir: es su
 * E, sin avisar a nadie. Lo ya cruzado no se deshace: los datos ya salieron.
 */
export async function reflejarDesmarcas(admin: Admin, mesaId: string, yo: string, marcadas: string[]) {
  const sigue = new Set(marcadas)
  const { data } = await admin
    .from('contacto_coincidencias')
    .select(COLUMNAS)
    .eq('table_id', mesaId)
    .or(`persona_a.eq.${yo},persona_b.eq.${yo}`)
  const ahora = Date.now()
  for (const c of (data ?? []) as unknown as Coincidencia[]) {
    if (!abierta(c, ahora) || sigue.has(otraDe(c, yo))) continue
    await admin
      .from('contacto_coincidencias')
      .update(soyA(c, yo) ? { estado_a: 'no' } : { estado_b: 'no' })
      .eq('id', c.id)
  }
}

// ── leer ─────────────────────────────────────────────────────────────────

async function eventosDe(admin: Admin, mesas: string[]) {
  const { data } = await admin.from('dinner_tables').select('id, event_id').in('id', mesas.length ? mesas : ['00000000-0000-0000-0000-000000000000'])
  return new Map((data ?? []).map((m) => [m.id, m.event_id as string]))
}

/** Nombre de pila: a quien comparte su número con alguien le basta con eso. */
export async function nombresDe(admin: Admin, ids: string[]) {
  if (!ids.length) return new Map<string, string>()
  const { data } = await admin.from('profiles').select('id, display_name, full_name').in('id', ids)
  return new Map(
    (data ?? []).map((p) => [p.id, (p.display_name || p.full_name?.split(' ')[0] || 'Alguien').trim()]),
  )
}

export type DatosContacto = { telefono: string; instagram: string | null; tiktok: string | null }

async function datosDe(admin: Admin, mesaId: string, ids: string[]) {
  if (!ids.length) return new Map<string, DatosContacto>()
  const { data } = await admin
    .from('contacto_datos')
    .select('profile_id, telefono, instagram, tiktok')
    .eq('table_id', mesaId)
    .in('profile_id', ids)
  return new Map((data ?? []).map((d) => [d.profile_id, { telefono: d.telefono, instagram: d.instagram, tiktok: d.tiktok }]))
}

/**
 * Todo lo de «Seguir en contacto» de UNA cena, para quien la pide. Es lo que
 * pinta el panel A a E, el de una persona y el de varias.
 *
 * Null si no estuvo en esa mesa. Con `personas` vacío no hubo coincidencia, y
 * entonces no sale nada de contacto (brief, punto 4).
 */
export async function contactoDeMesa(admin: Admin, yo: string, mesaId: string) {
  const { data: soyDeLaMesa } = await admin
    .from('table_members')
    .select('profile_id')
    .eq('table_id', mesaId)
    .eq('profile_id', yo)
    .maybeSingle()
  if (!soyDeLaMesa) return null

  const { data } = await admin
    .from('contacto_coincidencias')
    .select(COLUMNAS)
    .eq('table_id', mesaId)
    .or(`persona_a.eq.${yo},persona_b.eq.${yo}`)
    .order('creada_en')
  const lista = (data ?? []) as unknown as Coincidencia[]
  const ahora = Date.now()

  const otras = lista.map((c) => otraDe(c, yo))
  const [nombres, datos, { data: perfil }, { data: mesa }] = await Promise.all([
    nombresDe(admin, otras),
    // Solo lo MÍO: lo último que usé, para rellenar el formulario.
    datosDe(admin, mesaId, [yo]),
    admin.from('profiles').select('phone_e164').eq('id', yo).maybeSingle(),
    admin
      .from('dinner_tables')
      .select('event_id, events(starts_at, format, city_slug), restaurants(zone_slug, zones(name))')
      .eq('id', mesaId)
      .maybeSingle(),
  ])
  const ev = mesa?.events as unknown as { starts_at: string; format: string | null; city_slug: string } | null
  const sitio = mesa?.restaurants as unknown as { zones: { name: string } | null } | null
  const mios = datos.get(yo)

  return {
    mesaId,
    eventoId: mesa?.event_id ?? null,
    cena: {
      empiezaEn: ev?.starts_at ?? null,
      zonaHoraria: await zonaDeCiudad(ev?.city_slug),
      formato: ev?.format ?? null,
      zona: sitio?.zones?.name ?? null,
    },
    /**
     * Lo suyo: lo que ya dejó en esta cena, o el teléfono del perfil para
     * empezar. `guardados` dice cuál de las dos cosas es.
     */
    misDatos: {
      telefono: mios?.telefono ?? perfil?.phone_e164 ?? '',
      instagram: mios?.instagram ?? null,
      tiktok: mios?.tiktok ?? null,
      guardados: !!mios,
    },
    personas: lista.map((c) => {
      const otra = otraDe(c, yo)
      const estado = estadoPara(c, yo, ahora)
      return {
        id: otra,
        coincidencia: c.id,
        nombre: nombres.get(otra) ?? 'Alguien',
        estado,
        cierraEn: c.cierra_en,
        /**
         * Lo que la otra persona me dio A MÍ, congelado cuando confirmó, y
         * solo con el cruce. Nunca su fila de la cena en vivo: lo que añadió
         * después para otra persona no es para mí (agente de la app, 31-10).
         */
        suyos: estado === 'C' ? susDatosEn(c, yo) : null,
        /** Lo que yo le di a ESTA persona: «Lo que le vas a compartir», «Tú le dejaste». */
        mios: misDatosEn(c, yo),
        nuevo: hayNuevoPara(c, yo),
      }
    }),
  }
}

// ── decidir ──────────────────────────────────────────────────────────────

/** «@andrea.mv», «instagram.com/andrea.mv/», «tiktok.com/@andreamv» → el usuario solo. */
export function usuarioDeRed(valor: unknown): string | null | false {
  const v = String(valor ?? '').trim()
  if (!v) return null
  const limpio = v
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?(instagram\.com|tiktok\.com)\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(limpio) ? limpio : false
}

export type Decision =
  | { accion: 'compartir'; con: string[]; sin?: string[]; telefono?: string; instagram?: string; tiktok?: string }
  | { accion: 'no'; con?: string[] }
  | { accion: 'reabrir'; con: string[] }
  | { accion: 'visto' }

export type Fallo = { error: string; campo?: 'telefono' | 'instagram' | 'tiktok' }

/**
 * Lo que decide una persona en el panel. Solo sobre SUS coincidencias de esa
 * mesa, y solo mientras estén abiertas: lo cruzado o vencido no se toca.
 */
export async function decidir(admin: Admin, yo: string, mesaId: string, d: Decision): Promise<Fallo | null> {
  const { data } = await admin
    .from('contacto_coincidencias')
    .select(COLUMNAS)
    .eq('table_id', mesaId)
    .or(`persona_a.eq.${yo},persona_b.eq.${yo}`)
  const mias = (data ?? []) as unknown as Coincidencia[]
  const ahora = Date.now()

  if (d.accion === 'visto') {
    const momento = new Date().toISOString()
    for (const c of mias) {
      await admin.from('contacto_coincidencias').update(soyA(c, yo) ? { visto_a_en: momento } : { visto_b_en: momento }).eq('id', c.id)
    }
    return null
  }

  const abiertas = mias.filter((c) => abierta(c, ahora))
  const conOtra = (ids: string[] | undefined) => abiertas.filter((c) => (ids ?? []).includes(otraDe(c, yo)))
  const poner = async (cs: Coincidencia[], estado: 'pendiente' | 'confirmado' | 'no') => {
    for (const c of cs) {
      await admin.from('contacto_coincidencias').update(soyA(c, yo) ? { estado_a: estado } : { estado_b: estado }).eq('id', c.id)
    }
  }

  if (d.accion === 'no') {
    await poner(d.con ? conOtra(d.con) : abiertas, 'no')
    return null
  }
  if (d.accion === 'reabrir') {
    await poner(conOtra(d.con).filter((c) => miEstado(c, yo) === 'no'), 'pendiente')
    return null
  }

  // compartir. Los datos primero: sin ellos no se confirma nada.
  const a = conOtra(d.con)
  if (!a.length) return { error: 'Ya no queda nadie con quien compartir en esta cena.' }

  const telefono = aE164(d.telefono ?? '')
  if (!telefono || !valido('telefonoPerfil', telefono)) {
    return { error: CONTACTO.A.telefonoFalta, campo: 'telefono' }
  }
  const instagram = usuarioDeRed(d.instagram)
  if (instagram === false) return { error: 'Ese usuario de Instagram no parece válido.', campo: 'instagram' }
  const tiktok = usuarioDeRed(d.tiktok)
  if (tiktok === false) return { error: 'Ese usuario de TikTok no parece válido.', campo: 'tiktok' }

  const { error } = await admin.from('contacto_datos').upsert(
    { table_id: mesaId, profile_id: yo, telefono, instagram, tiktok, actualizado_en: new Date().toISOString() },
    { onConflict: 'table_id,profile_id' },
  )
  if (error) {
    console.error('[contacto] no se guardaron los datos', mesaId, error)
    return { error: 'No pudimos guardarlo. Inténtalo otra vez.' }
  }

  // Confirma y CONGELA lo que da, en cada pareja del formulario y solo en
  // esas. Lo ya cruzado no está en `a` (solo hay abiertas), así que cambiar
  // lo que comparto nunca le enseña nada nuevo a quien ya lo tiene.
  const datos: DatosContacto = { telefono, instagram, tiktok }
  for (const c of a) {
    await admin
      .from('contacto_coincidencias')
      .update(soyA(c, yo) ? { estado_a: 'confirmado', datos_a: datos } : { estado_b: 'confirmado', datos_b: datos })
      .eq('id', c.id)
  }
  // Desmarcar a alguien en el panel de varias es su E: no se le dice.
  if (d.sin?.length) await poner(conOtra(d.sin), 'no')

  await cruzarLasQueToquen(admin, a.map((c) => c.id))
  return null
}

/**
 * Las dos personas confirmaron: se marca el cruce y se avisa, en el momento.
 *
 * Agrupado por persona, como la coincidencia (Michael, 31-10): si al
 * confirmar se cruza con Andrea y con Luis a la vez, le llega UN correo y UNA
 * push con lo de las dos personas, no dos en el mismo segundo. Andrea y Luis
 * reciben cada una el suyo. El `is null` hace que, si dos confirman a la
 * vez, el cruce se cuente una sola vez.
 */
async function cruzarLasQueToquen(admin: Admin, ids: string[]) {
  if (!ids.length) return
  const { data } = await admin
    .from('contacto_coincidencias')
    .select(COLUMNAS)
    .in('id', ids)
    .eq('estado_a', 'confirmado')
    .eq('estado_b', 'confirmado')
    .is('cruzada_en', null)
  const porPersona = new Map<string, { mesa: string; otras: string[] }>()
  for (const c of (data ?? []) as unknown as Coincidencia[]) {
    const { data: hecha } = await admin
      .from('contacto_coincidencias')
      .update({ cruzada_en: new Date().toISOString() })
      .eq('id', c.id)
      .is('cruzada_en', null)
      .select('id')
    if (!hecha?.length) continue
    for (const [yo, otra] of [[c.persona_a, c.persona_b], [c.persona_b, c.persona_a]]) {
      const k = yo + ':' + c.table_id
      const g = porPersona.get(k) ?? { mesa: c.table_id, otras: [] }
      g.otras.push(otra)
      porPersona.set(k, g)
    }
  }
  const eventos = await eventosDe(admin, [...new Set([...porPersona.values()].map((g) => g.mesa))])
  for (const [k, g] of porPersona) {
    await encolar({ perfil: k.split(':')[0] }, 'contacto_cruzado', { mesa: g.mesa, otras: g.otras }, { eventoId: eventos.get(g.mesa) ?? null })
  }
}

// ── el cron ──────────────────────────────────────────────────────────────

/**
 * El repaso de cada hora: crear las coincidencias que se escaparon y cerrar
 * las vencidas. Al cerrar, «No se cruzaron» SOLO a quien confirmó: a quien no
 * hizo nada no hay nada que contarle, y decírselo sería contarle que alguien
 * sí quería.
 *
 * Con `seco` calcula y no escribe ni encola: probar un cron que encola es
 * MANDAR correos.
 */
export async function repasoDeContacto(admin: Admin, seco: boolean, soloMesa?: string) {
  // `soloMesa` es para las pruebas: el repaso de verdad recorre TODAS las
  // mesas, y una prueba que lo llamaba sin esto creó y avisó la coincidencia
  // de una pareja real el 31-10.
  // Las mesas con alguna marca en los últimos 30 días: más atrás ya no se
  // crea una coincidencia nueva, porque su plazo ya habría vencido.
  const desde = new Date(Date.now() - 30 * 86400_000).toISOString()
  let qMarcas = admin
    .from('peer_feedback')
    .select('table_id, rater_id, rated_id')
    .eq('signal', 'connect')
    .gte('created_at', desde)
  if (soloMesa) qMarcas = qMarcas.eq('table_id', soloMesa)
  const { data: marcas } = await qMarcas
  const hay = new Set((marcas ?? []).map((m) => m.table_id + m.rater_id + m.rated_id))
  const mesas = [...new Set((marcas ?? []).filter((m) => hay.has(m.table_id + m.rated_id + m.rater_id)).map((m) => m.table_id))]

  let creadas = 0
  for (const mesa of mesas) {
    if (seco) {
      const { count } = await admin.from('contacto_coincidencias').select('id', { count: 'exact', head: true }).eq('table_id', mesa)
      const mutuas = (marcas ?? []).filter((m) => m.table_id === mesa && m.rater_id < m.rated_id && hay.has(m.table_id + m.rated_id + m.rater_id)).length
      creadas += Math.max(0, mutuas - (count ?? 0))
      continue
    }
    const nuevas = await crearCoincidencias(admin, mesa)
    creadas += nuevas.length
    await avisarCoincidencias(admin, nuevas)
  }

  let qVencidas = admin
    .from('contacto_coincidencias')
    .select(COLUMNAS)
    .is('cruzada_en', null)
    .is('cerrada_en', null)
    .lte('cierra_en', new Date().toISOString())
  if (soloMesa) qVencidas = qVencidas.eq('table_id', soloMesa)
  const { data: vencidas } = await qVencidas

  let cerradas = 0
  let avisos = 0
  for (const c of (vencidas ?? []) as unknown as Coincidencia[]) {
    const quienes = [c.estado_a === 'confirmado' ? c.persona_a : null, c.estado_b === 'confirmado' ? c.persona_b : null].filter(
      (x): x is string => !!x,
    )
    cerradas++
    avisos += quienes.length
    if (seco) continue
    const { data: hecha } = await admin
      .from('contacto_coincidencias')
      .update({ cerrada_en: new Date().toISOString() })
      .eq('id', c.id)
      .is('cerrada_en', null)
      .select('id')
    if (!hecha?.length) continue
    const eventos = await eventosDe(admin, [c.table_id])
    for (const yo of quienes) {
      await encolar({ perfil: yo }, 'contacto_sin_cruce', { mesa: c.table_id, otra: otraDe(c, yo) }, { eventoId: eventos.get(c.table_id) ?? null })
    }
  }

  return { seco, creadas, cerradas, avisosSinCruce: avisos }
}

// ── para Mi mesa y Pasadas ───────────────────────────────────────────────

/** Qué es lo nuevo de una coincidencia para alguien, si lo hay. */
export type Novedad = 'coincidencia' | 'cruce' | 'sinCruce'

function novedadPara(c: Coincidencia, yo: string): Novedad | null {
  if (!hayNuevoPara(c, yo)) return null
  if (c.cruzada_en) return 'cruce'
  if (c.cerrada_en && miEstado(c, yo) === 'confirmado') return 'sinCruce'
  return 'coincidencia'
}

export type ContactoDeCena = {
  /** A: le falta elegir qué compartir. Con su plazo, el que antes vence. */
  porConfirmar: string[]
  cierraEn: string | null
  cruzadas: string[]
  /** Lo nuevo de esa cena para la fila de Pasadas, o null. */
  nuevo: { tipo: Novedad; nombres: string[] } | null
}

/**
 * Lo de contacto de cada cena de una persona, en una sola consulta: para la
 * línea de Próxima, la lista de Pasadas y el punto de «hay algo nuevo».
 */
export async function contactoPorMesa(admin: Admin, yo: string) {
  const { data } = await admin
    .from('contacto_coincidencias')
    .select(COLUMNAS)
    .or(`persona_a.eq.${yo},persona_b.eq.${yo}`)
  const lista = (data ?? []) as unknown as Coincidencia[]
  const nombres = await nombresDe(admin, [...new Set(lista.map((c) => otraDe(c, yo)))])
  const ahora = Date.now()
  // Si en una cena hay varias novedades, la fila dice la que más importa:
  // un cruce trae datos, una coincidencia pide algo, un cierre ya no.
  const PESO: Record<Novedad, number> = { cruce: 3, coincidencia: 2, sinCruce: 1 }
  const porMesa = new Map<string, ContactoDeCena>()
  for (const c of lista) {
    const m = porMesa.get(c.table_id) ?? { porConfirmar: [], cierraEn: null, cruzadas: [], nuevo: null }
    const e = estadoPara(c, yo, ahora)
    const nombre = nombres.get(otraDe(c, yo)) ?? 'Alguien'
    if (e === 'A') {
      m.porConfirmar.push(nombre)
      if (!m.cierraEn || c.cierra_en < m.cierraEn) m.cierraEn = c.cierra_en
    }
    if (e === 'C') m.cruzadas.push(nombre)
    const n = novedadPara(c, yo)
    if (n) {
      if (!m.nuevo || PESO[n] > PESO[m.nuevo.tipo]) m.nuevo = { tipo: n, nombres: [nombre] }
      else if (m.nuevo.tipo === n) m.nuevo.nombres.push(nombre)
    }
    porMesa.set(c.table_id, m)
  }
  return porMesa
}

// ── los correos ──────────────────────────────────────────────────────────

/** «+58 414 555 0188»: el número como se lee. */
export function telefonoLegible(e164: string) {
  const m = /^\+58(\d{3})(\d{3})(\d{4})$/.exec(e164)
  return m ? `+58 ${m[1]} ${m[2]} ${m[3]}` : e164
}

/** «su número, su Instagram y su TikTok», con lo que de verdad dejó. */
function loQueDeja(d: DatosContacto, persona: 'su' | 'tu') {
  const partes = [`${persona} número`]
  if (d.instagram) partes.push(`${persona} Instagram`)
  if (d.tiktok) partes.push(`${persona} TikTok`)
  return partes.length < 2 ? partes[0] : partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1]
}

/**
 * Los datos de los tres correos de contacto. Los compone esta pieza y no
 * `correos-datos`, para que lo que dice el correo y lo que pinta el panel
 * salgan del mismo sitio.
 */
export async function datosDeCorreo(
  admin: Admin,
  tipo: 'contacto_coincidencia' | 'contacto_cruzado' | 'contacto_sin_cruce',
  yo: string,
  p: Record<string, unknown>,
): Promise<Record<string, unknown> | { error: string }> {
  const mesa = typeof p.mesa === 'string' ? p.mesa : ''
  if (!mesa) return { error: 'sin mesa' }
  const d = await contactoDeMesa(admin, yo, mesa)
  if (!d) return { error: 'no estuvo en esa mesa' }

  const z = d.cena.zonaHoraria
  const partes = partesDe(d.cena.empiezaEn, z)
  const cenaDia = partes ? `${partes.dia} ${partes.numero}` : ''
  const comun = {
    mesaId: mesa,
    enlaceCena: `/mesa?cena=${mesa}`,
    cenaDia,
    cenaFecha: partes ? `${cenaDia} de ${partes.mes}` : '',
    zona: d.cena.zona ?? '',
    // «CENA DEL JUEVES 29 · CHACAO»
    sello: [`${DENTRO.planDe(d.cena.formato)} del ${cenaDia}`.toUpperCase(), (d.cena.zona ?? '').toUpperCase()].filter(Boolean).join(' · '),
    plan: DENTRO.planDe(d.cena.formato).toLowerCase(),
    // «en la cena del», «en el brunch del», «esos drinks»: decía cena
    // siempre (`pasadoDe`, 02-11).
    elPlanFue: pasadoDe(d.cena.formato).el,
    esePlan: pasadoDe(d.cena.formato).ese,
    porqueFue: pasadoDe(d.cena.formato).porque,
  }

  if (tipo === 'contacto_coincidencia') {
    const con = Array.isArray(p.con) ? (p.con as string[]) : []
    const personas = d.personas.filter((x) => con.includes(x.id))
    if (!personas.length) return { error: 'sin coincidencias' }
    const lista = personas.map((x) => x.nombre)
    const cierra = personas.map((x) => x.cierraEn).sort()[0]
    return {
      ...comun,
      personas: personas.map((x) => ({ nombre: x.nombre, inicial: x.nombre.charAt(0).toUpperCase() })),
      nombres: CONTACTO.nombres(lista),
      nombresLista: lista,
      varios: lista.length > 1,
      verbo: lista.length > 1 ? 'quieren' : 'quiere',
      dias: CONTACTO.DIAS,
      hasta: CONTACTO.hasta(cierra, z),
    }
  }

  if (tipo === 'contacto_sin_cruce') {
    const otra = typeof p.otra === 'string' ? d.personas.find((x) => x.id === p.otra) : null
    if (!otra) return { error: 'sin la otra persona' }
    return { ...comun, otra: otra.nombre, titulo: CONTACTO.D.titulo, bajada: CONTACTO.D.bajada, agenda: CONTACTO.D.agenda }
  }

  // contacto_cruzado: una persona o varias a la vez. `otra` es la forma de
  // antes del 31-10, por si queda alguna fila en la cola con ella.
  const pedidas = Array.isArray(p.otras) ? (p.otras as string[]) : typeof p.otra === 'string' ? [p.otra] : []
  const cruzadas = d.personas.filter((x) => pedidas.includes(x.id) && x.estado === 'C' && x.suyos)
  if (!cruzadas.length) return { error: 'todavía no se cruzaron' }
  const lista = cruzadas.map((x) => x.nombre)
  // Lo que dejé en ESTA pareja (las que se cruzan a la vez lo comparten:
  // se confirmaron en el mismo toque).
  const mios = cruzadas[0].mios ?? { telefono: d.misDatos.telefono, instagram: null, tiktok: null }
  const misRedes = [mios.instagram ? `tu Instagram, @${mios.instagram}` : null, mios.tiktok ? `tu TikTok, @${mios.tiktok}` : null].filter(Boolean)
  return {
    ...comun,
    varios: cruzadas.length > 1,
    nombres: CONTACTO.nombres(lista),
    nombresLista: lista,
    // «Andrea y tú», «Andrea, Luis y tú»
    conTu: CONTACTO.nombres([...lista, 'tú']),
    otra: lista[0],
    queDeja: loQueDeja(cruzadas[0].suyos!, 'su'),
    personas: cruzadas.map((x) => {
      const suyos = x.suyos!
      return {
        otraMayus: x.nombre.toUpperCase(),
        suTelefono: telefonoLegible(suyos.telefono),
        suWhatsapp: CONTACTO.enlaces.whatsapp(suyos.telefono),
        suInstagram: suyos.instagram ?? '',
        suInstagramEnlace: suyos.instagram ? CONTACTO.enlaces.instagram(suyos.instagram) : '',
        suTiktok: suyos.tiktok ?? '',
        suTiktokEnlace: suyos.tiktok ? CONTACTO.enlaces.tiktok(suyos.tiktok) : '',
      }
    }),
    // «Tu número, +58 412 555 0123, y tu Instagram, @vale.gm.»
    loQueDejaste:
      `Tu número, ${telefonoLegible(mios.telefono)}` +
      (misRedes.length ? `, y ${misRedes.join(' y ')}` : '') + '.',
  }
}

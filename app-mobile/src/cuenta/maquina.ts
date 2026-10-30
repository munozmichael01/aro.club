/**
 * El Inicio, sin React: de lo que dice el servidor a lo que se pinta.
 *
 * El estado lo decide el servidor (`/api/mi-cuenta`), no la pantalla: si
 * decidiera ella, dos pantallas podrían discrepar sobre en qué punto está la
 * misma persona. Aquí solo se elige el copy y se calculan las cifras.
 */

import * as C from '../cuestionario/maquina'
import { reglas } from '../reglas'
import * as F from '../texto/fechas'
import * as T from '../texto/cuenta'
import type { EstadoCuenta } from '../texto/cuenta'

export type FechaAgenda = {
  id: string
  formato: string
  empiezaEn: string
  cierraEn: string | null
  creditos: number
  zonas: string[]
  apuntados: number
  cerrada: boolean
  mia: boolean
  /** La zona de la ciudad de ESTA fecha: el día y la hora se dicen en ella. */
  zonaHoraria?: string | null
  /** Edad mínima de la fecha («Cena +40»). El servidor es quien no deja reservar a quien no la cumple. */
  edadMinima?: number | null
  /** El precio del puesto en ESTA fecha, en ref (el campo se llama Usd por historia). Fechas distintas, precios distintos. */
  precioUsd?: number | null
  /** Cuándo se creó (18-10): desempata dos fechas a la misma hora en zonas distintas, como el servidor. */
  creadaEn?: string | null
  /** La fecha se graba (18-10), opcional o requerida. */
  grabamos?: boolean
  /** Requerida: el permiso es condición para apartar puesto. Opcional: se pregunta al revelar la mesa (48f5823). */
  permisoObligatorio?: boolean
  /** La mesa se habla en ese idioma (20-10, «Dinner in English»). `null`: en español. Solo la ve quien lo marcó. */
  idioma?: string | null
  /** «En inglés»: el texto lo manda el servidor. */
  etiquetaIdioma?: string | null
}

/** «10 ref», «12,50 ref»: el precio de una fecha. Sin precio en la fecha, el del club (`reglas.precioTexto`). */
export function precioDe(a: { precioUsd?: number | null }): string {
  if (a.precioUsd == null) return reglas.precioTexto()
  const n = Number(a.precioUsd)
  return Number.isInteger(n) ? `${n} ref` : `${n.toFixed(2).replace('.', ',')} ref`
}

export type Plan = {
  empiezaEn: string | null
  formato: string
  estado: string
  cancelada: boolean
  pasada: boolean
  restaurante: string | null
  numeroMesa: number | null
  /** La única mesa de esa fecha en ese sitio: sin número (Michael, 10-10). */
  mesaUnica?: boolean
  zonaHoraria?: string | null
}

export type MiCuenta = {
  nombre: string | null
  esOps: boolean
  porValorar: { cuando: string; sitio: string | null } | null
  planes: Plan[]
  agenda: FechaAgenda[]
  proximaFecha: { empiezaEn: string; cierraEn: string | null; revelaEn: string | null; zona: string | null; apuntados: number; zonaHoraria?: string | null } | null
  estado: EstadoCuenta
  verif: 'sin' | 'revision' | 'ok'
  motivoRechazo: string | null
  respuestas: { faltan: number; total: number }
  /** Del embudo (01-10-2026). Opcionales: un servidor anterior no los manda y entonces vale `estado`. */
  paso?: 'correo' | 'preguntas' | 'contacto' | 'cuenta' | 'verificacion' | 'listo'
  donde?: string
  puedeReservar?: boolean
  /** Su ciudad (agente de la web, 07-10-2026). Cerrada: sin agenda ni próxima fecha. */
  ciudad?: { slug: string; nombre: string; abierta: boolean }
  creditos: number
  reserva: { id: string; formato: string | null; empiezaEn: string | null; revelaEn: string | null; revelado: boolean; zonaHoraria?: string | null } | null
  /** Reembolso del crédito por lista de espera (21-10). `{ puede: false, estado: null }` si no hay nada. */
  reembolso?: import('../reembolso/maquina').Reembolso
  /** Preguntas del catálogo que no ha contestado, al reservar (18-10). Casi siempre vacío. */
  preguntasNuevas?: PreguntaNueva[]
}

export type PreguntaNueva = {
  clave: string
  enunciado: string
  ayuda: string | null
  tipo: 'single' | 'multi' | string
  opciones: { value: string; label: string }[]
  max: number | null
  exclusiva: string | null
}

export type MiMesa = {
  mesaId?: string
  numeroMesa?: number | null
  mesaUnica?: boolean
  empiezaEn?: string | null
  zonaHoraria?: string | null
  restaurante?: string | null
  direccion?: string | null
  companeros?: { id: string; nombre: string | null; sector: string | null }[]
}

// --- La tarjeta de arriba -------------------------------------------------

export type Tarjeta = {
  estado: EstadoCuenta
  /** Verde profundo con texto crema: quien ya tiene mesa. */
  oscuro: boolean
  calmado: boolean
  sello: string
  reloj: string
  titulo: string
  cuerpo: string
  accion: string
  destino: string
  mesa: {
    numero: string
    sitio: string
    direccion: string
    cuando: string
    otros: { nombre: string; inicial: string; sector: string }[]
  } | null
}

export function tarjeta(d: MiCuenta, m: MiMesa | null, ahora: number): Tarjeta {
  const base = T.ESTADOS[d.estado] ?? T.ESTADOS.perfil
  const pf = d.proximaFecha
  const cuando = F.cuandoSeSabe(pf?.revelaEn, pf?.zonaHoraria)
  const movimiento = reglas.vozDe(d.reserva?.formato).unidad === 'grupo'

  let titulo = movimiento && base.tituloMov ? base.tituloMov : base.titulo
  let cuerpo = movimiento && base.cuerpoMov ? base.cuerpoMov : base.cuerpo(cuando)
  let accion = base.accion

  if ((d.estado === 'reservada' || d.estado === 'abierta') && d.reserva?.empiezaEn) {
    const z = d.reserva.zonaHoraria
    titulo = F.titularDeReserva(d.reserva.empiezaEn, z) || titulo
    // Quien ya reservó se entera cuando se revela SU fecha, no la próxima.
    if (d.estado === 'reservada')
      cuerpo = base.cuerpo(d.reserva.revelaEn ? F.cuandoSeSabe(d.reserva.revelaEn, z) : F.cuandoSeSabe(pf?.revelaEn, pf?.zonaHoraria))
  }
  if (d.estado === 'reservar') {
    titulo = F.tituloHayCena(pf)
    // El cierre se dice como en la agenda y los correos (`textoCierre`): una cena
    // cierra a las 00:00 de SU día, y «se cierra el sábado» se leía como que
    // quedaba el sábado entero.
    const cierre = pf ? reglas.textoCierre(pf.empiezaEn, pf.zonaHoraria) : ''
    cuerpo = pf ? T.cuerpoReservar(pf.apuntados, cierre ? ` y ${cierre}` : '', cuerpo) : T.sinFecha
    if (!d.proximaFecha) accion = T.verAgenda
  }

  const oscuro = d.estado === 'abierta' || d.estado === 'reservada'
  // La mesa solo si la HAY de verdad (de /api/mi-mesa, la misma fuente que
  // Mi mesa): que el estado diga «abierta» no basta para pintarla.
  const conMesa = d.estado === 'abierta' && m?.mesaId
  return {
    estado: d.estado,
    oscuro,
    calmado: !!base.calmado,
    sello: d.estado === 'perfil' ? T.selloPreguntas(d.respuestas.faltan) : base.sello,
    reloj: F.relojDeRevelacion(d.proximaFecha?.revelaEn, ahora),
    titulo,
    cuerpo,
    accion,
    destino: base.destino,
    mesa: conMesa
      ? {
          numero: m.numeroMesa == null || m.mesaUnica ? '' : String(m.numeroMesa).padStart(2, '0'),
          sitio: m.restaurante ?? '',
          direccion: m.direccion ?? '',
          cuando: m.empiezaEn ? F.fechaCorta(m.empiezaEn, m.zonaHoraria) : '',
          otros: (m.companeros ?? []).map((c) => ({
            nombre: c.nombre || '—',
            inicial: (c.nombre || '?').charAt(0).toUpperCase(),
            sector: c.sector || '',
          })),
        }
      : null,
  }
}

// --- La agenda --------------------------------------------------------------

/** «Todos»: la polaroid de las cuatro fotos que deja la lista entera (entrega 19). */
export const TODOS = 'todos'

export type Filtro = {
  formato: string
  nombre: string
  detalle: string
  /** Tiene fechas publicadas. Sin ellas: «Próximamente», apagada y sin tocar. */
  hay: boolean
  elegido: boolean
  /** Responde al toque: solo cuando hay filtro (más de un formato con fechas) y ella tiene fechas. */
  toca: boolean
  /** Hay un formato concreto elegido y no es esta: pierde color (sigue tocable). */
  apagada: boolean
  /** La de «Todos»: las cuatro fotos en mosaico. */
  mosaico?: boolean
}

/**
 * Las polaroids de Inicio (entrega 19, «Las polaroids, como filtro»). Cuáles
 * tienen fecha se DERIVA de la agenda, nunca de una lista fija.
 *
 * - Un solo formato con fechas (hoy, cenas): sin «Todos» y sin filtro. Son
 *   escaparate: la que tiene fechas, solo con el nombre; las demás,
 *   «Próximamente», apagadas y sin responder.
 * - Más de uno: «Todos» primero y marcado de entrada; las que tienen fechas
 *   llevan sus días y filtran. Tocar la elegida otra vez no desmarca: para
 *   eso está «Todos».
 */
export function filtros(agenda: FechaAgenda[], elegido: string | null): Filtro[] {
  const tiene = (f: string) => agenda.filter((a) => (T.FORMATOS[a.formato] ? a.formato : 'dinner') === f)
  const conFechas = T.ORDEN_FORMATOS.filter((f) => tiene(f).length > 0)
  const filtra = conFechas.length > 1
  // Un elegido que ya no tiene fechas vuelve a «Todos».
  const sel = filtra ? (elegido && conFechas.includes(elegido as never) ? elegido : TODOS) : null
  // Primero los que TIENEN fecha abierta, como la web: el brunch caía el
  // último, detrás de tres «Próximamente», y había que deslizar la fila
  // entera para llegar a lo único reservable (Michael, 18-10). Dentro de
  // cada grupo, el orden de siempre.
  const orden = [...T.ORDEN_FORMATOS].sort((a, b) => (tiene(a).length ? 0 : 1) - (tiene(b).length ? 0 : 1))
  const cuatro: Filtro[] = orden.map((f) => {
    const suyas = tiene(f)
    const hay = suyas.length > 0
    return {
      formato: f,
      nombre: T.FORMATOS[f].plural,
      detalle: !hay ? T.agenda.proximamente : filtra ? F.diasDe(suyas.map((a) => ({ iso: a.empiezaEn, zona: a.zonaHoraria }))) : '',
      hay,
      elegido: filtra && sel === f,
      toca: filtra && hay,
      apagada: !hay || (filtra && sel !== TODOS && sel !== f),
    }
  })
  if (!filtra) return cuatro
  return [{ formato: TODOS, nombre: T.agenda.todos, detalle: T.agenda.todoLoQueViene, hay: true, elegido: sel === TODOS, toca: true, apagada: false, mosaico: true }, ...cuatro]
}

export type FilaAgenda = {
  id: string
  formato: string
  tipo: string
  cuando: string
  hora: string
  zona: string
  estado: string
  mia: boolean
  cerrada: boolean
  /** 0..1, la barra hacia la primera mesa de seis. */
  llenado: number
  /** Ya hay al menos una mesa: la barra y el estado van en verde. */
  va: boolean
  /** «10 ref»: el precio de esta fecha. */
  precio: string
  /** La grabación es requerida: se dice antes del botón, y el permiso es la condición para apartar. */
  graba: boolean
  /** «En inglés», o null. */
  idioma: string | null
  /** «se cierra a medianoche, cuando empieza el viernes», de `reglas.textoCierre`. */
  cierre: string
  /** La fecha en crudo, para «Cómo funciona» (cuándo se revela, en su zona). */
  empiezaEn: string
  zonaHoraria: string | null
}

export function agenda(fechas: FechaAgenda[], filtro: string | null, ahora: number): { semana: string; filas: FilaAgenda[] }[] {
  const grupos: { semana: string; filas: FilaAgenda[] }[] = []
  // Por fecha, pase lo que pase con el orden en que llegue. Dos a la misma
  // hora (zonas separadas, 18-10) van por cuándo se crearon, como las manda
  // el servidor; nunca por zona, que cambia si se abren en otro orden.
  const ordenadas = [...fechas].sort(
    (a, b) => Date.parse(a.empiezaEn) - Date.parse(b.empiezaEn) || Date.parse(a.creadaEn ?? '') - Date.parse(b.creadaEn ?? '') || 0,
  )
  for (const a of ordenadas) {
    const formato = T.FORMATOS[a.formato] ? a.formato : 'dinner'
    if (filtro && filtro !== TODOS && formato !== filtro) continue
    const semana = F.semanaDe(a.empiezaEn, ahora, a.zonaHoraria)
    // Cerrada por estado O porque ya pasó su cierre: el estado de la fecha no
    // cambia solo al llegar la hora, y se veía abierta (01-10-2026).
    const cerrada = a.cerrada || (a.cierraEn != null && Date.parse(a.cierraEn) <= ahora)
    let g = grupos.find((x) => x.semana === semana)
    if (!g) grupos.push((g = { semana, filas: [] }))
    g.filas.push({
      id: a.id,
      formato,
      tipo: a.edadMinima ? T.conEdad(T.FORMATOS[formato].singular, a.edadMinima) : T.FORMATOS[formato].plural,
      cuando: F.fechaCorta(a.empiezaEn, a.zonaHoraria),
      hora: reglas.horaDe(a.empiezaEn, a.zonaHoraria) ?? '',
      // Las zonas ABIERTAS de esa fecha, no un sitio: el sitio se decide al
      // armar la mesa y nadie lo sabe hasta la revelación.
      zona: a.zonas.join(' o ') || T.agenda.zonaPorConfirmar,
      estado: T.estadoDeFecha(a.apuntados, a.mia, cerrada),
      mia: a.mia,
      cerrada,
      llenado: Math.min(1, a.apuntados / T.MESA),
      va: a.apuntados >= T.MESA,
      precio: precioDe(a),
      graba: !!a.permisoObligatorio,
      idioma: a.idioma ? (a.etiquetaIdioma ?? null) : null,
      cierre: reglas.textoCierre(a.empiezaEn, a.zonaHoraria),
      empiezaEn: a.empiezaEn,
      zonaHoraria: a.zonaHoraria ?? null,
    })
  }
  return grupos
}

/** Qué hace «Reservar» según quién lo pulsa. El candado de verdad está en el servidor. */
export type Reserva = { accion: 'nada' | 'completar' | 'verificar' | 'pagar' | 'reservar'; texto: string; destino?: string }

export function botonReservar(
  d: MiCuenta,
  reservando: boolean,
  precio: string = reglas.precioTexto(),
  /** Si la fecha se graba y si ya marcó el permiso (18-10). */
  grabacion: { graba: boolean; permiso: boolean } = { graba: false, permiso: false },
): Reserva {
  if (reservando) return { accion: 'nada', texto: T.agenda.apuntandote }
  // Sin las preguntas o los datos no se reserva (decidido el 01-10-2026): el
  // reparto no puede sentar a quien no conoce. Qué falta lo dice el servidor
  // con `estado`, que sale del embudo; antes aquí solo se miraba `verif`, y
  // a quien le faltaban doce preguntas se le mandaba a verificarse.
  const paso = d.paso ?? (d.estado === 'perfil' ? 'preguntas' : d.estado === 'datos' ? 'contacto' : undefined)
  if (paso === 'preguntas')
    return { accion: 'completar', texto: T.agenda.preguntasPrimero(d.respuestas.faltan), destino: d.donde ?? T.ESTADOS.perfil.destino }
  if (paso === 'contacto' || paso === 'cuenta')
    return { accion: 'completar', texto: T.agenda.datosPrimero, destino: d.donde ?? T.ESTADOS.datos.destino }
  // Quien YA subió la verificación no va a repetirla: ya hizo su parte.
  if (d.verif === 'revision') return { accion: 'nada', texto: T.agenda.enRevision }
  if (d.verif !== 'ok') return { accion: 'verificar', texto: T.agenda.verificaPrimero }
  const conCredito = d.creditos > 0
  // Con crédito se aparta aquí, así que aquí se pide el permiso. Sin crédito
  // se pide en la pantalla de pago, que es donde se aparta: dos veces en
  // treinta segundos se lee como que la primera no contó.
  if (conCredito && grabacion.graba && !grabacion.permiso) return { accion: 'nada', texto: T.agenda.marcaPermiso }
  // Sin créditos hay que pagar, y eso es otra pantalla: reportar un pago es
  // salir al banco y volver, no pulsar un botón.
  return { accion: conCredito ? 'reservar' : 'pagar', texto: T.agenda.reservar(conCredito, precio) }
}

// --- Lo próximo y los atajos -------------------------------------------------

export type Proximo = { sitio: string; cuando: string; detalle: string; estado: string; pendiente: boolean }

/**
 * Solo lo que tiene fecha por delante: el historial completo vive en el
 * perfil. Tres estados vivos, no dos: un pago reportado no es una reserva
 * confirmada, y la fila tiene que decirlo.
 */
export function proximos(planes: Plan[]): Proximo[] {
  return planes
    .filter((p) => !p.cancelada && p.estado !== 'cancelled' && p.estado !== 'attended' && !p.pasada)
    .map((p) => {
      const pendiente = p.estado === 'pending_payment'
      const sitio = p.restaurante
        ? p.restaurante + (p.numeroMesa != null && !p.mesaUnica ? T.proximo.mesa(p.numeroMesa) : '')
        : (T.FORMATOS[p.formato] ?? T.FORMATOS.dinner).singular
      const e = pendiente ? T.proximo.porConfirmar : T.proximo.confirmada
      return { sitio, cuando: F.fechaLarga(p.empiezaEn, p.zonaHoraria), detalle: e.detalle, estado: e.estado, pendiente }
    })
}

export type Atajo = { titulo: string; cuerpo: string; pie: string; destino: string }

export function atajos(d: MiCuenta, nExclusiones: number | null): Atajo[] {
  // Las que ocurrieron: ni las canceladas ni las que aún no han pasado.
  const cenas = d.planes.filter((p) => p.pasada && !p.cancelada && p.estado !== 'cancelled').length
  const A = T.atajos
  return [
    { titulo: A.respuestas.titulo, cuerpo: A.respuestas.cuerpo(d.respuestas.total), pie: A.respuestas.pie(d.respuestas.faltan), destino: '/perfil' },
    { titulo: A.creditos.titulo, cuerpo: A.creditos.cuerpo(d.creditos, !!d.reserva), pie: A.creditos.pie(d.creditos), destino: '/legal?doc=terminos' },
    { titulo: A.verificacion.titulo, cuerpo: A.verificacion.cuerpo, pie: A.verificacion.pie[d.verif] ?? '', destino: '/verificacion' },
    { titulo: A.exclusiones.titulo, cuerpo: A.exclusiones.cuerpo, pie: A.exclusiones.pie(nExclusiones), destino: '/perfil' },
    { titulo: A.cenas.titulo, cuerpo: A.cenas.cuerpo, pie: A.cenas.pie(cenas), destino: '/perfil' },
  ]
}

// --- Las preguntas nuevas al reservar (18-10) ---------------------------------------

export type Elegidas = Record<string, string | string[] | null>

/**
 * Marcar en el aviso, con las mismas reglas que el cuestionario y Mi
 * perfil: la de una se desmarca tocándola otra vez; la de varias respeta la
 * exclusiva y el tope; y «no tomo alcohol» ata «¿y qué tomas?».
 */
export function marcarNueva(e: Elegidas, q: PreguntaNueva, valor: string): Elegidas {
  if (q.tipo !== 'multi') {
    const r = { ...e, [q.clave]: e[q.clave] === valor ? null : valor }
    return q.clave === C.ATADURA.pregunta ? C.atar(r, r[q.clave]) : r
  }
  if (C.bloqueadaPorAtadura(e, q.clave, valor) || (q.clave === C.ATADURA.atada && C.atada(e))) return e
  const antes = (Array.isArray(e[q.clave]) ? e[q.clave] : []) as string[]
  let despues: string[]
  if (antes.includes(valor)) despues = antes.filter((x) => x !== valor)
  else if (q.exclusiva && valor === q.exclusiva) despues = [valor]
  else {
    const limpio = q.exclusiva ? antes.filter((x) => x !== q.exclusiva) : antes
    if (q.max && limpio.length >= q.max) return e
    despues = [...limpio, valor]
  }
  return { ...e, [q.clave]: despues }
}

export const marcadaNueva = (e: Elegidas, clave: string, valor: string) => {
  const v = e[clave]
  return Array.isArray(v) ? v.includes(valor) : v === valor
}

/** Lo que se manda: lo que se dejó en blanco no se manda, ni vacío. «No contesté» y «contesté nada» no son lo mismo. */
export const paraMandar = (e: Elegidas) =>
  Object.entries(e).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v)) as [string, string | string[]][]

/**
 * El Inicio, sin React: de lo que dice el servidor a lo que se pinta.
 *
 * El estado lo decide el servidor (`/api/mi-cuenta`), no la pantalla: si
 * decidiera ella, dos pantallas podrían discrepar sobre en qué punto está la
 * misma persona. Aquí solo se elige el copy y se calculan las cifras.
 */

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
}

export type Plan = {
  empiezaEn: string | null
  formato: string
  estado: string
  cancelada: boolean
  pasada: boolean
  restaurante: string | null
  numeroMesa: number | null
}

export type MiCuenta = {
  nombre: string | null
  esOps: boolean
  porValorar: { cuando: string; sitio: string | null } | null
  planes: Plan[]
  agenda: FechaAgenda[]
  proximaFecha: { empiezaEn: string; cierraEn: string | null; revelaEn: string | null; zona: string | null; apuntados: number } | null
  estado: EstadoCuenta
  verif: 'sin' | 'revision' | 'ok'
  motivoRechazo: string | null
  respuestas: { faltan: number; total: number }
  creditos: number
  reserva: { id: string; formato: string | null; empiezaEn: string | null; revelaEn: string | null; revelado: boolean } | null
}

export type MiMesa = {
  mesaId?: string
  numeroMesa?: number | null
  empiezaEn?: string | null
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
  const cuando = F.cuandoSeSabe(d.proximaFecha?.revelaEn)
  const movimiento = reglas.vozDe(d.reserva?.formato).unidad === 'grupo'

  let titulo = movimiento && base.tituloMov ? base.tituloMov : base.titulo
  let cuerpo = movimiento && base.cuerpoMov ? base.cuerpoMov : base.cuerpo(cuando)
  let accion = base.accion

  if ((d.estado === 'reservada' || d.estado === 'abierta') && d.reserva?.empiezaEn) {
    titulo = F.titularDeReserva(d.reserva.empiezaEn) || titulo
    // Quien ya reservó se entera cuando se revela SU fecha, no la próxima.
    if (d.estado === 'reservada') cuerpo = base.cuerpo(F.cuandoSeSabe(d.reserva.revelaEn ?? d.proximaFecha?.revelaEn))
  }
  if (d.estado === 'reservar') {
    titulo = F.tituloHayCena(d.proximaFecha)
    cuerpo = d.proximaFecha ? T.cuerpoReservar(d.proximaFecha.apuntados, F.seCierra(d.proximaFecha.cierraEn), cuerpo) : T.sinFecha
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
          numero: m.numeroMesa == null ? '' : String(m.numeroMesa).padStart(2, '0'),
          sitio: m.restaurante ?? '',
          direccion: m.direccion ?? '',
          cuando: m.empiezaEn ? F.fechaCorta(m.empiezaEn) : '',
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

export type Filtro = {
  formato: string
  nombre: string
  detalle: string
  /** Sin fecha abierta la polaroid lo dice y no filtra. */
  hay: boolean
  elegido: boolean
}

/**
 * Las cuatro polaroids. Cuáles tienen fecha se DERIVA de la agenda, no se
 * escribe: el día que se abra la primera de Drinks, deja de decir
 * «Próximamente» sola. Y el detalle son los días de sus fechas de verdad.
 */
export function filtros(agenda: FechaAgenda[], elegido: string | null): Filtro[] {
  return T.ORDEN_FORMATOS.map((f) => {
    const suyas = agenda.filter((a) => (T.FORMATOS[a.formato] ? a.formato : 'dinner') === f)
    const hay = suyas.length > 0
    return {
      formato: f,
      nombre: T.FORMATOS[f].plural,
      detalle: hay ? F.diasDe(suyas.map((a) => a.empiezaEn)) : T.agenda.proximamente,
      hay,
      elegido: elegido === f,
    }
  })
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
}

export function agenda(fechas: FechaAgenda[], filtro: string | null, ahora: number): { semana: string; filas: FilaAgenda[] }[] {
  const grupos: { semana: string; filas: FilaAgenda[] }[] = []
  // Por fecha, pase lo que pase con el orden en que llegue.
  const ordenadas = [...fechas].sort((a, b) => new Date(a.empiezaEn).getTime() - new Date(b.empiezaEn).getTime())
  for (const a of ordenadas) {
    const formato = T.FORMATOS[a.formato] ? a.formato : 'dinner'
    if (filtro && formato !== filtro) continue
    const semana = F.semanaDe(a.empiezaEn, ahora)
    let g = grupos.find((x) => x.semana === semana)
    if (!g) grupos.push((g = { semana, filas: [] }))
    g.filas.push({
      id: a.id,
      formato,
      tipo: T.FORMATOS[formato].plural,
      cuando: F.fechaCorta(a.empiezaEn),
      hora: reglas.horaDe(a.empiezaEn) ?? '',
      // Las zonas ABIERTAS de esa fecha, no un sitio: el sitio se decide al
      // armar la mesa y nadie lo sabe hasta la revelación.
      zona: a.zonas.join(' o ') || T.agenda.zonaPorConfirmar,
      estado: T.estadoDeFecha(a.apuntados, a.mia, a.cerrada),
      mia: a.mia,
      cerrada: a.cerrada,
      llenado: Math.min(1, a.apuntados / T.MESA),
      va: a.apuntados >= T.MESA,
    })
  }
  return grupos
}

/** Qué hace «Reservar» según quién lo pulsa. El candado de verdad está en el servidor. */
export type Reserva = { accion: 'nada' | 'verificar' | 'pagar' | 'reservar'; texto: string }

export function botonReservar(d: MiCuenta, reservando: boolean): Reserva {
  if (reservando) return { accion: 'nada', texto: T.agenda.apuntandote }
  // Quien YA subió la verificación no va a repetirla: ya hizo su parte.
  if (d.verif === 'revision') return { accion: 'nada', texto: T.agenda.enRevision }
  if (d.verif !== 'ok') return { accion: 'verificar', texto: T.agenda.verificaPrimero }
  const conCredito = d.creditos > 0
  // Sin créditos hay que pagar, y eso es otra pantalla: reportar un pago es
  // salir al banco y volver, no pulsar un botón.
  return { accion: conCredito ? 'reservar' : 'pagar', texto: T.agenda.reservar(conCredito, reglas.precioTexto()) }
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
        ? p.restaurante + (p.numeroMesa != null ? T.proximo.mesa(p.numeroMesa) : '')
        : (T.FORMATOS[p.formato] ?? T.FORMATOS.dinner).singular
      const e = pendiente ? T.proximo.porConfirmar : T.proximo.confirmada
      return { sitio, cuando: F.fechaLarga(p.empiezaEn), detalle: e.detalle, estado: e.estado, pendiente }
    })
}

export type Atajo = { titulo: string; cuerpo: string; pie: string; destino: string }

export function atajos(d: MiCuenta, nExclusiones: number | null): Atajo[] {
  // Las que ocurrieron: ni las canceladas ni las que aún no han pasado.
  const cenas = d.planes.filter((p) => p.pasada && !p.cancelada && p.estado !== 'cancelled').length
  const A = T.atajos
  return [
    { titulo: A.respuestas.titulo, cuerpo: A.respuestas.cuerpo(d.respuestas.total), pie: A.respuestas.pie(d.respuestas.faltan), destino: '/perfil' },
    { titulo: A.creditos.titulo, cuerpo: A.creditos.cuerpo(d.creditos, !!d.reserva), pie: A.creditos.pie(d.creditos), destino: 'web:/terminos' },
    { titulo: A.verificacion.titulo, cuerpo: A.verificacion.cuerpo, pie: A.verificacion.pie[d.verif] ?? '', destino: '/verificacion' },
    { titulo: A.exclusiones.titulo, cuerpo: A.exclusiones.cuerpo, pie: A.exclusiones.pie(nExclusiones), destino: '/perfil' },
    { titulo: A.cenas.titulo, cuerpo: A.cenas.cuerpo, pie: A.cenas.pie(cenas), destino: '/perfil' },
  ]
}

/** «Mi mesa» solo si hay reserva: una pestaña que rebota a donde ya estabas no es navegación. */
export function pestanas(d: MiCuenta | null) {
  return [
    { id: 'inicio', texto: T.nav.inicio, ruta: '/cuenta' },
    ...(d?.reserva ? [{ id: 'mesa', texto: reglas.vozDe(d.reserva.formato).mia, ruta: '/mesa' }] : []),
    { id: 'perfil', texto: T.nav.perfil, ruta: '/perfil' },
  ]
}

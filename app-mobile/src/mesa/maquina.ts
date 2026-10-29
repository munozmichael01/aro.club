/**
 * Mi mesa, sin React. La fase la decide el servidor comparando con
 * `reveal_at`, nunca la pantalla: si la pantalla pudiera pedir «abierta», se
 * sabría la mesa antes de tiempo.
 */

import { reglas } from '../reglas'
import * as T from '../texto/mesa'

export type Companero = {
  id: string
  nombre: string | null
  sector: string | null
  /** Se sentó después de la revelación (16-10): sin esto, quien mira cuenta una cara de más y no sabe por qué. */
  seUnioDespues?: boolean
  /** Su arraigo, código de `AroReglas.PUERTA.arraigo` (ac3aedb). `null`: no contestó. */
  arraigo?: string | null
}

export type DeServidor = {
  fase: 'sin-reserva' | 'cerrada' | 'sin-mesa' | 'abierta' | 'pasada' | string
  /** En `sin-reserva`: el estado del perfil (`pending_verification`, `in_review`…). */
  estado?: string | null
  formato?: string | null
  zonaHoraria?: string | null
  revelaEn?: string | null
  empiezaEn?: string | null
  zonas?: string[]
  mesaId?: string
  numeroMesa?: number | null
  /** Es la única mesa (o grupo) de esa fecha en ese sitio: entonces no se enseña el número (Michael, 10-10). */
  mesaUnica?: boolean
  /** Hasta cuándo nos deja la mesa el restaurante. Sin él, el guion usa su duración por defecto. */
  cierraMesaEn?: string | null
  /** La foto de la entrada del local, ~1200 px (entrega 20). Sin ella, solo el texto de «Al llegar». */
  fotoEntrada?: string | null
  /** Hasta tres sitios para seguir que operación eligió para ese local (14-10). */
  paraSeguir?: SitioParaSeguir[] | null
  actividad?: { ruta?: string; km?: number; minutos?: number; nivel?: string } | null
  restaurante?: string | null
  direccion?: string | null
  mapa?: string | null
  mapaApple?: string | null
  companeros?: Companero[]
  /** Contestó de verdad. Una encuesta saltada ya NO cuenta como valorada (8dc6b47). */
  yaValoro?: boolean
  /** La saltó con «Ahora no»: no vuelve a salir. */
  yaSalto?: boolean
  yaBloqueados?: string[]
  yaReporto?: string | null
  /** La fecha, para contestar la grabación (`POST /api/grabacion`). */
  eventoId?: string
  /** Esa noche se graba (marca por fecha o por mesa, 16-10). */
  grabamos?: boolean
  /** `null` es que no ha contestado, que no es un no. */
  permisoGrabacion?: boolean | null
  /** Lo que cambió después de la revelación (16-10). */
  ajustes?: Ajustes | null
  /** En `sin-mesa`: si el abono de esa reserva está de verdad en el libro de créditos (17-10). */
  creditoDevuelto?: boolean
  /** En `sin-mesa`: el reembolso de ese crédito (21-10). */
  reembolso?: import('../reembolso/maquina').Reembolso
  /** Cuánto dura la mesa, ya redactado por el servidor (`avisoDeDosHoras`, la misma frase que el correo). */
  avisoDosHoras?: string | null
  /** Si la mesa salió de menos de seis, la frase de por qué (`fraseDeMesaCorta`, 22-10). */
  mesaCorta?: string | null
  /** A dónde puede cambiarse (29-10, `bloqueDeCambiarFecha`). Sin él, no se enseña nada. */
  cambiarFecha?: import('../cambiar/maquina').Bloque | null
}

export type Ajustes = { alguienCancelo?: boolean; sonCuantos?: number; caben?: number; teMovimos?: boolean; seSumoAlguien?: boolean }

export type Fase = 'vacia' | 'cerrada' | 'abierta' | 'pasada'

export function fase(d: DeServidor): Fase {
  return d.fase === 'cerrada' || d.fase === 'abierta' || d.fase === 'pasada' ? d.fase : 'vacia'
}

export const voz = (d: DeServidor) => reglas.vozDe(d.formato)
export const esMesa = (d: DeServidor) => voz(d).unidad === 'mesa'
export const numero = (d: DeServidor) => (d.numeroMesa != null ? String(d.numeroMesa).padStart(2, '0') : '—')
/** El número solo se enseña si en ese sitio hay más de una mesa esa fecha: «01» siendo la única no dice nada. */
export const conNumero = (d: DeServidor) => !d.mesaUnica && d.numeroMesa != null

/**
 * Sin mesa no son todos el mismo caso: quien espera la revisión de su
 * cédula no tiene nada que hacer; quien ya apartó puesto espera el reparto;
 * el resto, lo que le falta es reservar.
 */
export function vacia(d: DeServidor) {
  const revisando = d.fase === 'sin-reserva' && (d.estado === 'pending_verification' || d.estado === 'in_review')
  if (revisando) return { ...T.vacia.revision, accion: null }
  // `sin-mesa` es DESPUÉS de la revelación: se quedó sin mesa. Lo que se dice
  // del crédito lo dice el servidor mirando el abono, no la pantalla.
  if (d.fase === 'sin-mesa')
    return { ...T.vacia.sinMesa, nota: d.creditoDevuelto === false ? T.vacia.sinMesa.notaSinAbono : T.vacia.sinMesa.nota }
  return T.vacia.sinReserva
}

/** «Ruta del Ávila · 7 km · 90 min · nivel medio», solo para movimiento. */
export function actividad(d: DeServidor): { titulo: string; nota: string } | null {
  const a = d.actividad
  if (esMesa(d) || !a?.ruta) return null
  const nota = [a.km ? T.abierta.km(a.km) : null, a.minutos ? T.abierta.min(a.minutos) : null, a.nivel ? T.abierta.nivel(a.nivel) : null]
    .filter(Boolean)
    .join(' · ')
  return { titulo: a.ruta, nota }
}

/**
 * «Cómo llegar». En iOS, Apple Maps (la app de mapas que seguro está); en
 * Android, el enlace de Google. La web decide por el navegador; aquí se sabe
 * de verdad en qué teléfono se está.
 */
export type SitioParaSeguir = {
  nombre: string
  /** Los calcula el servidor con las coordenadas de los dos sitios (16-10). */
  minutosAPie?: number | null
  /** «$», «$$», «$$$», «$$$$» (Michael, 22-10), o vacío: ya resuelto por el servidor. */
  precio?: string | null
  mapa?: string | null
  mapaApple?: string | null
}

/** «3 min a pie · $$»: con lo que haya, como la web. Vacío si no hay nada. */
export const detalleSitio = (s: SitioParaSeguir, aPie: (n: number) => string) =>
  [s.minutosAPie != null ? aPie(s.minutosAPie) : '', s.precio || ''].filter(Boolean).join(' · ')

/**
 * «Cómo llegar» abre Google Maps, también en iPhone (Michael, 17-10). `mapa`
 * viene en la forma universal (`google.com/maps/search/?api=1&query=…&query_place_id=…`),
 * que abre la app de Google Maps si está y si no, la web. `mapaApple` sigue
 * llegando por si algún día se ofrece como segunda opción, pero no manda:
 * solo se usa si no hay `mapa`. `so` se queda en la firma por si esa segunda
 * opción llega.
 */
export function mapa<D extends { mapa?: string | null; mapaApple?: string | null }>(d: D, _so?: string): string | null {
  return d.mapa || d.mapaApple || null
}

export type Otro = { id: string; nombre: string; inicial: string; sector: string; seUnio: boolean; arraigo: string | null }

export function otros(d: DeServidor): Otro[] {
  return (d.companeros ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre || '—',
    inicial: (c.nombre || '—').trim().charAt(0).toUpperCase(),
    sector: c.sector || T.abierta.sinSector,
    seUnio: !!c.seUnioDespues,
    arraigo: arraigoDe(c.arraigo),
  }))
}

// --- La grabación (16-10) --------------------------------------------------------

/** La pregunta sale sola, a los 6 s de abrir la mesa, solo si se graba y no ha contestado. */
export const ESPERA_GRABACION = 6000
export const preguntarGrabacion = (d: DeServidor, permiso: boolean | null) => fase(d) === 'abierta' && !!d.grabamos && permiso === null && !!d.eventoId
/** La línea para cambiarlo, solo si ya contestó: sin ella el «puedes cambiarlo» sería mentira. */
export const lineaGrabacion = (d: DeServidor, permiso: boolean | null) => !!d.grabamos && permiso !== null

// --- Los ajustes de última hora (16-10) ---------------------------------------------

/** Una mesa que salió corta desde el principio no es un ajuste: se publicó así. */
export const hayAjustes = (d: DeServidor) => !!(d.ajustes && (d.ajustes.seSumoAlguien || d.ajustes.alguienCancelo || d.ajustes.teMovimos))

/** Se recuerda por mesa Y por lo que decía: si cambia algo, ya no es el aviso que se leyó. */
export function claveAjustes(d: DeServidor) {
  const a = d.ajustes ?? {}
  return [d.mesaId, a.sonCuantos, a.seSumoAlguien ? 1 : 0, a.alguienCancelo ? 1 : 0, a.teMovimos ? 1 : 0].join(':')
}

export function textoAjustes(d: DeServidor) {
  const a = d.ajustes ?? {}
  const cuantos = T.ajustes.enLetra[a.sonCuantos ?? -1] ?? String(a.sonCuantos ?? '')
  if (a.teMovimos) return T.ajustes.teMovimos
  if (a.alguienCancelo && a.seSumoAlguien) return T.ajustes.cancelYSuma(cuantos)
  if (a.seSumoAlguien) return T.ajustes.seSuma
  return T.ajustes.cancelo(cuantos, voz(d))
}

// --- Lo de después (F11) -------------------------------------------------------

export type Valoracion = {
  mesa: number
  sitio: Partial<Record<'ambiente' | 'servicio' | 'conversar' | 'comida', number>>
  /** 1 sí, 0 no, -1 sin contestar. */
  volveria: number
  bloqueados: string[]
  /** El índice del tramo de gasto, -1 sin contestar (17-10). */
  gasto: number
  /** El texto libre, hasta 600 (17-10). */
  comentario: string
  /** «No me mandes más a este sitio» (17-10). */
  noRepetirSitio: boolean
}

export const valoracionVacia = (): Valoracion => ({ mesa: -1, sitio: {}, volveria: -1, bloqueados: [], gasto: -1, comentario: '', noRepetirSitio: false })

export const MAX_COMENTARIO = 600

/**
 * El veto del sitio solo sale tras una mala nota: un 2 o un 3 (Regular o
 * Mal) en cualquiera de las cuatro. Michael: «la gente es muy quejona».
 */
export const puedeVetarSitio = (v: Valoracion) => Object.values(v.sitio).some((x) => x != null && x >= 2)

/** Lo que ya hizo se recupera: si no, le pediríamos otra vez que valore lo valorado. */
export function yaHecho(d: DeServidor) {
  return {
    contado: !!d.yaValoro,
    reportadoA: d.yaReporto ?? null,
    bloqueados: (d.yaBloqueados ?? []).filter((id) => (d.companeros ?? []).some((c) => c.id === id)),
  }
}

/** Cada bloque es opcional, pero enviar sin nada no es contar nada. */
export const algoQueContar = (v: Valoracion) =>
  v.mesa >= 0 ||
  v.volveria >= 0 ||
  Object.values(v.sitio).some((x) => x != null && x >= 0) ||
  v.bloqueados.length > 0 ||
  // Lo que ganó la encuesta el 17-10 también cuenta: solo un comentario es una respuesta (d57b509).
  v.comentario.trim().length > 0 ||
  v.gasto >= 0 ||
  v.noRepetirSitio

/** El cuerpo de `POST /api/despues` para valorar: los índices tal cual, de mejor a peor. */
export function cuerpoValorar(mesaId: string, v: Valoracion) {
  const sitio: Record<string, number> = {}
  for (const [k, x] of Object.entries(v.sitio)) if (x != null && x >= 0) sitio[k] = x
  return {
    accion: 'valorar' as const,
    mesaId,
    mesa: v.mesa >= 0 ? v.mesa : null,
    sitio,
    volveriaAAro: v.volveria >= 0 ? v.volveria === 1 : null,
    comentario: v.comentario.trim().slice(0, MAX_COMENTARIO) || null,
    // El punto medio del tramo, no el índice: es lo que guarda el servidor.
    gasto: v.gasto >= 0 ? (T.pasada.tramosGasto[v.gasto]?.[1] ?? null) : null,
    // Sin mala nota no hay botón, y un veto que ya no se ve no se manda.
    noRepetirSitio: v.noRepetirSitio && puedeVetarSitio(v),
  }
}

/** Marcar o desmarcar a alguien. */
export const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])

/** El sello de la encuesta: «ANOCHE», «HACE 3 DÍAS» o «EL 18 DE SEPTIEMBRE», contado como la web. */
export function selloPasada(d: DeServidor, ahora: number) {
  if (!d.empiezaEn) return T.pasada.sello(null, undefined, undefined, voz(d).ayer)
  const dias = Math.floor((ahora - new Date(d.empiezaEn).getTime()) / 86400000)
  const p = reglas.partesDe(d.empiezaEn, d.zonaHoraria)
  return T.pasada.sello(dias, p?.numero, p?.mes, voz(d).ayer)
}

/**
 * El arraigo de una persona dicho para la mesa: «Volvió al país». Las
 * etiquetas cortas vivirán en `AroReglas.ARRAIGO_EN_LA_MESA` (pendiente del
 * agente, 29-10); mientras no estén, la del cuestionario. Un código que la
 * app no conoce no se pinta.
 */
export function arraigoDe(codigo: string | null | undefined): string | null {
  if (!codigo) return null
  const corta = (reglas as { ARRAIGO_EN_LA_MESA?: Record<string, string> }).ARRAIGO_EN_LA_MESA?.[codigo]
  if (corta) return corta
  const opcion = (reglas.PUERTA.arraigo?.opciones ?? []).find(([, c]) => c === codigo)
  return opcion ? opcion[0] : null
}

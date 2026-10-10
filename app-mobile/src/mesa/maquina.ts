/**
 * Mi mesa, sin React. La fase la decide el servidor comparando con
 * `reveal_at`, nunca la pantalla: si la pantalla pudiera pedir «abierta», se
 * sabría la mesa antes de tiempo.
 */

import { reglas } from '../reglas'
import * as F from '../texto/fechas'
import * as T from '../texto/mesa'

export type Companero = { id: string; nombre: string | null; sector: string | null }

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
  actividad?: { ruta?: string; km?: number; minutos?: number; nivel?: string } | null
  restaurante?: string | null
  direccion?: string | null
  mapa?: string | null
  mapaApple?: string | null
  companeros?: Companero[]
  yaValoro?: boolean
  yaBloqueados?: string[]
  yaReporto?: string | null
}

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
  if (d.fase === 'sin-mesa')
    return { ...T.vacia.sinMesa, bajada: T.vacia.sinMesa.bajada(F.elMismoDia(d.empiezaEn, d.zonaHoraria)), accion: null }
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
export function mapa(d: DeServidor, so: string): string | null {
  if (so === 'ios' && d.mapaApple) return d.mapaApple
  return d.mapa || d.mapaApple || null
}

export type Otro = { id: string; nombre: string; inicial: string; sector: string }

export function otros(d: DeServidor): Otro[] {
  return (d.companeros ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre || '—',
    inicial: (c.nombre || '—').trim().charAt(0).toUpperCase(),
    sector: c.sector || T.abierta.sinSector,
  }))
}

// --- Lo de después (F11) -------------------------------------------------------

export type Valoracion = {
  mesa: number
  sitio: Partial<Record<'ambiente' | 'servicio' | 'conversar' | 'comida', number>>
  /** 1 sí, 0 no, -1 sin contestar. */
  volveria: number
  bloqueados: string[]
}

export const valoracionVacia = (): Valoracion => ({ mesa: -1, sitio: {}, volveria: -1, bloqueados: [] })

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
  v.mesa >= 0 || v.volveria >= 0 || Object.values(v.sitio).some((x) => x != null && x >= 0) || v.bloqueados.length > 0

/** El cuerpo de `POST /api/despues` para valorar: los índices tal cual, de mejor a peor. */
export function cuerpoValorar(mesaId: string, v: Valoracion) {
  const sitio: Record<string, number> = {}
  for (const [k, x] of Object.entries(v.sitio)) if (x != null && x >= 0) sitio[k] = x
  return { accion: 'valorar' as const, mesaId, mesa: v.mesa >= 0 ? v.mesa : null, sitio, volveriaAAro: v.volveria >= 0 ? v.volveria === 1 : null }
}

/** Marcar o desmarcar a alguien. */
export const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])

/**
 * El juego por temáticas, sin React (entrega tematicas de Design, 29-10). La
 * mesa elige; no hay orden ni regla de quién lee. Cada teléfono recuerda,
 * por mesa, qué temáticas se jugaron y en qué pregunta quedó cada una.
 */

import { reglas, type TematicaDeJuego } from '../reglas'

export type Tematica = TematicaDeJuego

/** Las del mazo compartido, o ninguna: entonces se juega por rondas. */
export const delMazo = (): Tematica[] => reglas.JUEGO.tematicas ?? []

/** Lo visual de cada temática, por posición (la paleta de la entrega). */
export const ESTILOS = [
  { fondo: '#E39C63', tinta: '#14342A', sub: '#14342A', icono: 'M13 2.5 4.5 13.5h6.5L10 21.5l8.5-11H12l1-8z' },
  { fondo: '#9CBBA6', tinta: '#14342A', sub: '#14342A', icono: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z' },
  { fondo: '#8F4515', tinta: '#FAF3E4', sub: '#F6D9B4', icono: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3' },
  { fondo: '#F6D9B4', tinta: '#14342A', sub: '#14342A', icono: 'M6 3v5a6 6 0 0 0 6 6h6M15 11l3 3-3 3M6 21v-5' },
  { fondo: '#C5D8CA', tinta: '#14342A', sub: '#14342A', icono: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' },
] as const
/**
 * El color y el icono van con la TEMÁTICA, no con la posición (revisión de fidelidad, 29-10),
 * y salen de `reglas.js` (`estilo` de cada temática), los mismos que pinta la web. Sin
 * `estilo` (el mazo de ejemplo del catálogo), el de su posición.
 */
export const estiloDe = (i: number, t?: { estilo?: { fondo: string; tinta: string; suave: string; icono: string } }) =>
  t?.estilo ? { fondo: t.estilo.fondo, tinta: t.estilo.tinta, sub: t.estilo.suave, icono: t.estilo.icono } : ESTILOS[i % ESTILOS.length]

/** `avance[clave]`: la pregunta en la que quedó (0 = sin empezar). `jugadas`: las terminadas. */
export type Memoria = { avance: Record<string, number>; jugadas: string[] }
export const vacia = (): Memoria => ({ avance: {}, jugadas: [] })

export type EstadoTematica = { tipo: 'nueva' } | { tipo: 'aMedias'; en: number; de: number } | { tipo: 'jugada' }

export function estado(t: Tematica, m: Memoria): EstadoTematica {
  const en = m.avance[t.clave] ?? 0
  if (en > 0 && en < t.preguntas.length) return { tipo: 'aMedias', en: en + 1, de: t.preguntas.length }
  if (m.jugadas.includes(t.clave)) return { tipo: 'jugada' }
  return { tipo: 'nueva' }
}

/** Dónde empieza al tocarla: donde quedó si iba a medias; si no, en la primera. */
export const empiezaEn = (t: Tematica, m: Memoria) => {
  const e = estado(t, m)
  return e.tipo === 'aMedias' ? e.en - 1 : 0
}

/** Guardar por dónde va. Al pasar de la última queda jugada, y su avance vuelve a cero. */
export function avanzar(m: Memoria, t: Tematica, indice: number): Memoria {
  if (indice >= t.preguntas.length) {
    return { avance: { ...m.avance, [t.clave]: 0 }, jugadas: m.jugadas.includes(t.clave) ? m.jugadas : [...m.jugadas, t.clave] }
  }
  return { ...m, avance: { ...m.avance, [t.clave]: Math.max(0, indice) } }
}

/** Las que quedan después de terminar una: primero a medias, luego nuevas, al final las jugadas. Sin la recién terminada. */
export function queQueda(todas: Tematica[], m: Memoria, recien: string): Tematica[] {
  const peso = (t: Tematica) => ({ aMedias: 0, nueva: 1, jugada: 2 })[estado(t, m).tipo]
  return todas.filter((t) => t.clave !== recien).sort((a, b) => peso(a) - peso(b))
}

export const todasJugadas = (todas: Tematica[], m: Memoria) => todas.length > 0 && todas.every((t) => m.jugadas.includes(t.clave))

/** La cabecera de la tarjeta de Mi mesa: «4 temáticas · elijan por dónde empezar» o «1 jugada · Historias por la 3 de 5». */
export function resumen(todas: Tematica[], m: Memoria): { jugadas: number; aMedias: { nombre: string; en: number; de: number } | null } {
  const medias = todas.map((t) => ({ t, e: estado(t, m) })).find((x) => x.e.tipo === 'aMedias')
  return {
    jugadas: todas.filter((t) => m.jugadas.includes(t.clave)).length,
    aMedias: medias && medias.e.tipo === 'aMedias' ? { nombre: medias.t.nombre, en: medias.e.en, de: medias.e.de } : null,
  }
}

export function leer(crudo: string | null): Memoria {
  try {
    const j = crudo ? JSON.parse(crudo) : null
    return j && typeof j === 'object' && j.avance && Array.isArray(j.jugadas) ? j : vacia()
  } catch {
    return vacia()
  }
}

export const CLAVE = (mesa: string) => `aro.juego.tematicas.${mesa}`

/** Pregunta larga (más de 70 caracteres): baja de tamaño (Q4 de la entrega). */
export const esLarga = (p: string) => p.length > 70

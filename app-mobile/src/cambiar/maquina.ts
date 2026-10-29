/**
 * Cambiar de fecha, sin React. Qué se puede y a dónde lo decide el servidor
 * (`cambiarFecha` de `/api/mi-mesa`): las mismas condiciones que aplica el
 * POST, para no ofrecer fechas que después rechaza.
 */

import * as F from '../texto/fechas'
import { FORMATOS } from '../texto/cuenta'
import * as T from '../texto/cambiar'

export type Destino = {
  eventoId: string
  empiezaEn: string
  /** Viaja con CADA destino: una persona puede tener una cena en Caracas y otra en otra ciudad. */
  zonaHoraria?: string | null
  formato?: string | null
  idioma?: string | null
  zonas?: string[]
}

export type Bloque = {
  puede: boolean
  motivo?: 'tarde' | 'revelada' | 'sin-destinos' | string
  destinos: Destino[]
  /** La reserva a la que se refiere el bloque (7f93e05), en las tres fases. */
  reservaId?: string
}

/** Qué enseña Mi mesa: el enlace, la frase de por qué no, o nada (revelada, o un servidor sin el bloque). */
export function enMiMesa(b: Bloque | null | undefined): { enlace: true } | { nota: string } | null {
  if (!b) return null
  // Sin saber qué reserva se mueve, no se ofrece moverla.
  if (b.puede && b.destinos.length) return b.reservaId ? { enlace: true } : null
  const nota = T.noSePuede(b.puede ? 'sin-destinos' : b.motivo)
  return nota ? { nota } : null
}

const zonasEnTexto = (z: string[] | undefined) =>
  !z?.length ? '' : z.length === 1 ? z[0] : `${z.slice(0, -1).join(', ')} o ${z[z.length - 1]}`

/** Una fila de la lista: «Sábado 31 de octubre · 7:00 p.m.» y «Cena · Chacao o Los Palos Grandes». */
export function fila(x: Destino, larga = true): { titulo: string; detalle: string; ingles: boolean } {
  const formato = (FORMATOS[x.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  return {
    // En la lista, la corta («Sábado 31 · 7:00 p.m.»): la larga no cabe junto al pie en un celular.
    titulo: larga ? F.fechaLarga(x.empiezaEn, x.zonaHoraria) : F.fechaCorta(x.empiezaEn, x.zonaHoraria),
    detalle: [formato, zonasEnTexto(x.zonas)].filter(Boolean).join(' · '),
    ingles: x.idioma === 'en',
  }
}

/** El día para el titular del final: «sábado 31». */
export function diaDe(x: Destino | undefined): string {
  return x ? F.diaYNumero(x.empiezaEn, x.zonaHoraria).toLowerCase() : ''
}

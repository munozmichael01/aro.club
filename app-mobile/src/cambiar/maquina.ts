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

/**
 * Qué enseña Mi mesa: el enlace SOLO si hay fechas a las que irse (Michael,
 * 29-10). Sin destinos, por tarde o por no haber otra abierta, no se enseña
 * nada; la pantalla sí dice por qué si alguien llega a ella.
 */
export function enMiMesa(b: Bloque | null | undefined): { enlace: true } | null {
  // Sin saber qué reserva se mueve, no se ofrece moverla.
  return b?.puede && b.destinos.length && b.reservaId ? { enlace: true } : null
}

const zonasEnTexto = (z: string[] | undefined) =>
  !z?.length ? '' : z.length === 1 ? z[0] : `${z.slice(0, -1).join(', ')} o ${z[z.length - 1]}`

/** Una fila de la lista: «Sábado 31 de octubre · 7:00 p.m.» y «Cena · Chacao o Los Palos Grandes». */
export function fila(x: Destino, larga = true): { titulo: string; formato: string; detalle: string; ingles: boolean } {
  const formato = (FORMATOS[x.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  return {
    // En la lista, la corta («Sábado 31 · 7:00 p.m.»): la larga no cabe junto al pie en un celular.
    titulo: larga ? F.fechaLarga(x.empiezaEn, x.zonaHoraria) : F.fechaCorta(x.empiezaEn, x.zonaHoraria),
    formato,
    detalle: [formato, zonasEnTexto(x.zonas)].filter(Boolean).join(' · '),
    ingles: x.idioma === 'en',
  }
}

/** El día para el titular del final: «sábado 31». */
export function diaDe(x: Destino | undefined): string {
  return x ? F.diaYNumero(x.empiezaEn, x.zonaHoraria).toLowerCase() : ''
}

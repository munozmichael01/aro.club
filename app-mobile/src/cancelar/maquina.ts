/**
 * Cancelar, sin React. Si hay margen lo decide el servidor contra la hora
 * de la cena: la pantalla no sabe cuándo es con la precisión que importa.
 */

import { FORMATOS } from '../texto/cuenta'
import * as F from '../texto/fechas'

export type DeServidor = {
  reservaId: string
  empiezaEn: string | null
  formato: string
  zona: string | null
  /** Solo si ya se reveló: cancelar no puede ser la puerta de atrás para saber dónde es. */
  restaurante: string | null
  horasQueFaltan: number
  conMargen: boolean
  yaTieneMesa: boolean
  zonaHoraria?: string | null
}

/** «Cena · sábado 3 de octubre» y «8:00 p.m. · Las Mercedes». */
export function queCena(d: DeServidor) {
  const nombre = (FORMATOS[d.formato] ?? FORMATOS.dinner).singular
  const fecha = F.fechaCompleta(d.empiezaEn, d.zonaHoraria).replace(/ de \d{4}$/, '')
  const dia = F.diaMinusculaYNumero(d.empiezaEn, d.zonaHoraria)
  const donde = d.restaurante || d.zona
  return {
    titulo: dia ? `${nombre} · ${dia.dia} ${fecha}` : nombre,
    detalle: [F.horaEn(d.empiezaEn, d.zonaHoraria), donde].filter(Boolean).join(' · '),
    dia: dia?.dia ?? null,
  }
}

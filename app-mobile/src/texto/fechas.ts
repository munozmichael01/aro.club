/**
 * Fechas y horas: un cálculo, un sitio (PEDIDO §6 bis, regla 3).
 *
 * Con la forma que tendrá `public/textos.js` (TEXTO-tres-superficies §2B):
 * cuando exista, esto se sustituye por la importación y se borra.
 *
 * El día y la hora salen de `reglas.js` (`diaDe`, `horaDe`), en su `ZONA`:
 * el mismo cálculo que la web y los correos. Ningún nombre de día se escribe
 * a mano en una pantalla: sale de aquí, calculado desde la fecha del evento.
 */

import { reglas } from '../reglas'

/** Los meses abreviados del selector de nacimiento, en el orden del calendario: el índice + 1 es el mes. */
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Lo que falta hasta un instante, como lo dice la web: «1 día y 3 h»,
 * «5 días y 0 h» o, en el último día, «3 h 12 min». Una sola función para
 * todas las cuentas atrás (el cierre de la fecha, la revelación): dos
 * relojes calculándolo por su cuenta ya discreparon a la vista de alguien.
 */
export function cuentaAtras(hasta: string, ahora: number): string {
  const s = Math.max(0, Math.floor((new Date(hasta).getTime() - ahora) / 1000))
  const dd = Math.floor(s / 86400)
  const hh = Math.floor(s / 3600) % 24
  if (dd > 0) return `${dd} ${dd === 1 ? 'día' : 'días'} y ${hh} h`
  const mm = Math.floor(s / 60) % 60
  return `${hh} h ${mm} min`
}

/**
 * Cuándo se sabe la mesa, dicho con lo que haya: día y hora si se conoce la
 * revelación; solo el día si solo se conoce la cena (se revela ese mismo
 * día); nada si no hay fecha abierta. Nunca un día escrito a mano.
 */
export function cuandoSeRevela(f: { empiezaEn?: string | null; revelaEn?: string | null } | null): string | null {
  // Día y hora, de reglas.js (`diaDe`, `horaDe`): el mismo cálculo que la
  // web y los correos, en un solo sitio (y en la zona de reglas.js).
  const dia = (iso: string) => reglas.diaDe(iso)
  const hora = reglas.horaDe(f?.revelaEn)
  if (f?.revelaEn && dia(f.revelaEn) && hora) return `el ${dia(f.revelaEn)} a las ${hora}`
  if (f?.empiezaEn && dia(f.empiezaEn)) return `el ${dia(f.empiezaEn)}`
  return null
}

/**
 * Fechas en castellano, en un solo sitio.
 *
 * Estaban dentro de una ruta de operación, y al necesitarlas en verificación
 * el camino fácil era copiarlas. Ese es literalmente el fallo que el §11 del
 * handoff enumera cinco veces: dos implementaciones del mismo dato que
 * acaban diciendo cosas distintas. Una fecha de borrado que no coincida con
 * la que ve operación es una promesa rota, aunque sea por un día.
 */

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** «Agosto de 2026». */
export function mesYAno(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1) + ' de ' + d.getFullYear()
}

/** «12 de agosto de 2026». */
export function diaCompleto(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

/**
 * «12 de agosto», sin año.
 *
 * Para lo que cae cerca: el año sobra y estorba cuando hablamos de algo que
 * pasa esta semana o dentro de tres meses.
 */
export function diaYMes(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

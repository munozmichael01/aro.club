/**
 * Solo para los catálogos en modo captura (las capturas de las tiendas): el
 * sábado `n` que viene, a las 7 p.m. de Caracas (23:00 UTC), el día y la hora
 * de las cenas (Michael, 05-10-2026). Sin esto, las fechas de ejemplo caen en
 * cualquier día de la semana.
 */
export function sabado(n = 0, horasCaracas = 19): string {
  const d = new Date()
  const hasta = (6 - d.getUTCDay() + 7) % 7 || 7
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + hasta + 7 * n, horasCaracas + 4)
  return new Date(base).toISOString()
}

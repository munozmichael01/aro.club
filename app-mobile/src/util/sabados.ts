/**
 * Solo para los catálogos en modo captura (las capturas de las tiendas): el
 * sábado `n` que viene, a las 7:30 p.m. de Caracas (23:30 UTC), el día y la
 * hora de las cenas (Michael: sábado el 05-10-2026, 7:30 el 06-10-2026). Sin esto, las fechas de ejemplo caen en
 * cualquier día de la semana.
 */
export function sabado(n = 0, horasCaracas = 19.5): string {
  const d = new Date()
  const hasta = (6 - d.getUTCDay() + 7) % 7 || 7
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + hasta + 7 * n, 0) + (horasCaracas + 4) * 3600_000
  return new Date(base).toISOString()
}

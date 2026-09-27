/**
 * Fechas y horas: un cálculo, un sitio (PEDIDO §6 bis, regla 3).
 *
 * Con la forma que tendrá `public/textos.js` (TEXTO-tres-superficies §2B):
 * cuando exista, esto se sustituye por la importación y se borra.
 *
 * Todo recibe la zona explícita. Ningún nombre de día se escribe a mano en
 * una pantalla: sale de aquí, calculado desde la fecha del evento.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Las partes de una fecha en una zona. `Intl` hace el cambio de zona, con su horario de verano si lo hay. */
function partes(iso: string, zona: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  const semana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { semana, dia: +p.day, mes: +p.month, anio: +p.year, hora: +p.hour, minuto: +p.minute }
}

/** «sábado», en minúscula: el nombre del día de una fecha, en su zona. */
export function nombreDia(iso: string, zona: string): string {
  return DIAS[partes(iso, zona).semana]
}

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

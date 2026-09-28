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

// --- Inicio (Mi cuenta) ---------------------------------------------------
//
// Todo en la zona de la ciudad (`reglas.ZONA`), no en la del celular: la web
// lo hacía con `getDay()`/`getHours()` del navegador, y desde Madrid la cena
// de las ocho de la noche salía «domingo, dos de la mañana».

/** El día del mes, el mes y la hora (0-23) de una fecha, en la zona de la ciudad. */
function partes(iso: string) {
  const f = new Intl.DateTimeFormat('es-VE', {
    timeZone: reglas.ZONA, day: 'numeric', month: 'long', hour: 'numeric', hour12: false,
  }).formatToParts(new Date(iso))
  const de = (t: string) => f.find((p) => p.type === t)?.value ?? ''
  return { dia: Number(de('day')), mes: de('month'), hora: Number(de('hour')) % 24 }
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** «Sábado 4 · 8:00 p.m.»: una fecha de la agenda. */
export function fechaCorta(iso: string): string {
  const dia = reglas.diaDe(iso)
  if (!dia) return ''
  return `${mayuscula(dia)} ${partes(iso).dia} · ${reglas.horaDe(iso) ?? ''}`.trim()
}

/** «Sábado 4 de octubre · 8:00 p.m.»: una fila de «Lo próximo». */
export function fechaLarga(iso: string | null): string {
  const dia = iso ? reglas.diaDe(iso) : null
  if (!iso || !dia) return ''
  const p = partes(iso)
  return `${mayuscula(dia)} ${p.dia} de ${p.mes} · ${reglas.horaDe(iso) ?? ''}`.trim()
}

const HORAS_EN_LETRA = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once']

/**
 * «Sábado 4, ocho de la noche.»: el titular de quien tiene mesa. Las siete
 * ya son de la noche, como se dice en Caracas (el copy original de Design).
 */
export function titularDeReserva(iso: string): string {
  const dia = reglas.diaDe(iso)
  if (!dia) return ''
  const { dia: n, hora } = partes(iso)
  const franja = hora >= 19 || hora < 6 ? 'de la noche' : hora >= 12 ? 'de la tarde' : 'de la mañana'
  return `${mayuscula(dia)} ${n}, ${HORAS_EN_LETRA[hora % 12]} ${franja}.`
}

/** «Hay cena el sábado en Las Mercedes.», o sin fecha, que no la hay. */
export function tituloHayCena(f: { empiezaEn: string; zona?: string | null } | null): string {
  const dia = f ? reglas.diaDe(f.empiezaEn) : null
  if (!f || !dia) return 'Todavía no hay fecha abierta.'
  return `Hay cena el ${dia}${f.zona ? ' en ' + f.zona : ''}.`
}

/** «y se cierra el jueves»: el cierre de una fecha, o nada si no se sabe. */
export function seCierra(cierraEn: string | null | undefined): string {
  const dia = reglas.diaDe(cierraEn)
  return dia ? ` y se cierra el ${dia}` : ''
}

/**
 * Cuándo se sabe la mesa, dicho como se habla: «el sábado a mediodía» si son
 * las doce (el caso normal: «a las 12:00 p.m.» se lee peor), la hora exacta
 * si no, y «cuando se abra la mesa» sin fecha. Nunca un día inventado.
 */
export function cuandoSeSabe(revelaEn: string | null | undefined): string {
  const dia = reglas.diaDe(revelaEn)
  const hora = reglas.horaDe(revelaEn)
  if (!dia) return 'cuando se abra la mesa'
  if (!hora) return `el ${dia}`
  return /^12:00\s*p\.m\./i.test(hora) ? `el ${dia} a mediodía` : `el ${dia} a las ${hora}`
}

/** Los días de la semana en que caen unas fechas, sin repetir: «Sábado», «Viernes y sábado». */
export function diasDe(isos: string[]): string {
  const vistos: string[] = []
  for (const i of [...isos].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())) {
    const d = reglas.diaDe(i)
    if (d && !vistos.includes(d)) vistos.push(d)
  }
  if (!vistos.length) return ''
  const lista = vistos.length === 1 ? vistos[0] : `${vistos.slice(0, -1).join(', ')} y ${vistos[vistos.length - 1]}`
  return mayuscula(lista)
}

/** «Esta semana», «La semana que viene», «Más adelante»: los grupos de la agenda. */
export function semanaDe(iso: string, ahora: number): string {
  const dias = Math.floor((new Date(iso).getTime() - ahora) / 86400000)
  return dias < 7 ? 'Esta semana' : dias < 14 ? 'La semana que viene' : 'Más adelante'
}

/**
 * «ABRE EN 5D 04:12»: el reloj de la tarjeta, hasta la revelación REAL de la
 * próxima fecha. Sin fecha, nada: una cuenta atrás a una fecha que no existe
 * es peor que ninguna.
 */
export function relojDeRevelacion(revelaEn: string | null | undefined, ahora: number): string {
  if (!revelaEn) return ''
  const s = Math.max(0, Math.floor((new Date(revelaEn).getTime() - ahora) / 1000))
  if (s === 0) return 'YA ESTÁ ABIERTA'
  const p = (n: number) => String(n).padStart(2, '0')
  return `ABRE EN ${Math.floor(s / 86400)}D ${p(Math.floor(s / 3600) % 24)}:${p(Math.floor(s / 60) % 60)}`
}

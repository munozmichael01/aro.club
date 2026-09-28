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
export function cuandoSeRevela(f: { empiezaEn?: string | null; revelaEn?: string | null; zonaHoraria?: string | null } | null): string | null {
  // Día y hora, de reglas.js (`diaDe`, `horaDe`): el mismo cálculo que la
  // web y los correos, en la zona de la ciudad de ESA fecha.
  const z = f?.zonaHoraria
  const dia = (iso: string) => reglas.diaDe(iso, z)
  const hora = reglas.horaDe(f?.revelaEn, z)
  if (f?.revelaEn && dia(f.revelaEn) && hora) return `el ${dia(f.revelaEn)} a las ${hora}`
  if (f?.empiezaEn && dia(f.empiezaEn)) return `el ${dia(f.empiezaEn)}`
  return null
}

// --- Inicio (Mi cuenta) ---------------------------------------------------
//
// Todo en la zona de la ciudad de CADA fecha (`zonaHoraria`, que viaja con
// ella), nunca en la del celular: la web lo hacía con `getDay()` del
// navegador y desde Madrid la cena del sábado a las ocho salía «domingo».
// Las partes salen de `reglas.partesDe`, el mismo cálculo que web y correos.

type Zona = string | null | undefined

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** «Sábado 4 · 8:00 p.m.»: una fecha de la agenda. */
export function fechaCorta(iso: string, zona?: Zona): string {
  const p = reglas.partesDe(iso, zona)
  if (!p?.dia) return ''
  return `${mayuscula(p.dia)} ${p.numero} · ${p.hora ?? ''}`.trim()
}

/** «Sábado 4 de octubre · 8:00 p.m.»: una fila de «Lo próximo». */
export function fechaLarga(iso: string | null, zona?: Zona): string {
  const p = reglas.partesDe(iso, zona)
  if (!p?.dia) return ''
  return `${mayuscula(p.dia)} ${p.numero} de ${p.mes} · ${p.hora ?? ''}`.trim()
}

const HORAS_EN_LETRA = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once']

/**
 * «Sábado 4, ocho de la noche.»: el titular de quien tiene mesa. Las siete
 * ya son de la noche, como se dice en Caracas (el copy original de Design).
 */
export function titularDeReserva(iso: string, zona?: Zona): string {
  const p = reglas.partesDe(iso, zona)
  if (!p?.dia) return ''
  const h = p.horas % 24
  const franja = h >= 19 || h < 6 ? 'de la noche' : h >= 12 ? 'de la tarde' : 'de la mañana'
  return `${mayuscula(p.dia)} ${p.numero}, ${HORAS_EN_LETRA[h % 12]} ${franja}.`
}

/** «Hay cena el sábado en Las Mercedes.», o sin fecha, que no la hay. */
export function tituloHayCena(f: { empiezaEn: string; zona?: string | null; zonaHoraria?: Zona } | null): string {
  const dia = f ? reglas.diaDe(f.empiezaEn, f.zonaHoraria) : null
  if (!f || !dia) return 'Todavía no hay fecha abierta.'
  return `Hay cena el ${dia}${f.zona ? ' en ' + f.zona : ''}.`
}

/** « y se cierra el jueves»: el cierre de una fecha, o nada si no se sabe. */
export function seCierra(cierraEn: string | null | undefined, zona?: Zona): string {
  const dia = reglas.diaDe(cierraEn, zona)
  return dia ? ` y se cierra el ${dia}` : ''
}

/**
 * Cuándo se sabe la mesa, dicho como se habla: «el sábado a mediodía» si son
 * las doce (el caso normal: «a las 12:00 p.m.» se lee peor), la hora exacta
 * si no, y «cuando se abra la mesa» sin fecha. Nunca un día inventado.
 */
export function cuandoSeSabe(revelaEn: string | null | undefined, zona?: Zona): string {
  const dia = reglas.diaDe(revelaEn, zona)
  const hora = reglas.horaDe(revelaEn, zona)
  if (!dia) return 'cuando se abra la mesa'
  if (!hora) return `el ${dia}`
  return /^12:00\s*p\.m\./i.test(hora) ? `el ${dia} a mediodía` : `el ${dia} a las ${hora}`
}

/** Los días de la semana en que caen unas fechas, sin repetir: «Sábado», «Viernes y sábado». */
export function diasDe(fechas: { iso: string; zona?: Zona }[]): string {
  const vistos: string[] = []
  for (const f of [...fechas].sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())) {
    const d = reglas.diaDe(f.iso, f.zona)
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
 * es peor que ninguna. (Es una duración: no depende de la zona.)
 */
export function relojDeRevelacion(revelaEn: string | null | undefined, ahora: number): string {
  if (!revelaEn) return ''
  const s = Math.max(0, Math.floor((new Date(revelaEn).getTime() - ahora) / 1000))
  if (s === 0) return 'YA ESTÁ ABIERTA'
  const p = (n: number) => String(n).padStart(2, '0')
  return `ABRE EN ${Math.floor(s / 86400)}D ${p(Math.floor(s / 3600) % 24)}:${p(Math.floor(s / 60) % 60)}`
}

// --- Mi mesa ----------------------------------------------------------------

/** ¿Caen dos instantes en el mismo día del calendario de la ciudad? */
function mismoDia(a: string | number, b: string | number, zona?: Zona): boolean {
  const pa = reglas.partesDe(new Date(a).toISOString(), zona)
  const pb = reglas.partesDe(new Date(b).toISOString(), zona)
  return !!pa && !!pb && pa.ano === pb.ano && pa.mesNumero === pb.mesNumero && pa.numero === pb.numero
}

/** «4d 03h 12m», o en el último día «03:12:45»: la cuenta grande de Mi mesa. */
export function cuentaMesa(hasta: string | null | undefined, ahora: number): string {
  const s = hasta ? Math.max(0, Math.floor((new Date(hasta).getTime() - ahora) / 1000)) : 0
  const p = (n: number) => String(n).padStart(2, '0')
  const hh = Math.floor(s / 3600)
  return hh >= 24 ? `${Math.floor(s / 86400)}d ${p(hh % 24)}h ${p(Math.floor(s / 60) % 60)}m` : `${p(hh)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`
}

/** «SE ABRE HOY A LAS 12:00 P.M.» / «SE ABRE EL SÁBADO A LAS 12:00 P.M.». */
export function selloSeAbre(revelaEn: string | null | undefined, zona: Zona, ahora: number): string {
  const p = reglas.partesDe(revelaEn, zona)
  if (!revelaEn || !p) return 'SE ABRE PRONTO'
  const hoy = new Date(revelaEn).getTime() - ahora < 86400000 && mismoDia(revelaEn, ahora, zona)
  // La hora como la dice el resto de la pantalla («12:00 P.M.»), no en 24 h
  // como la web: el sello y la frase de debajo decían la misma hora distinta.
  return `SE ABRE ${hoy ? 'HOY' : 'EL ' + p.dia.toUpperCase()} A LAS ${(p.hora ?? '').toUpperCase()}`
}

/** «Tienes puesto el sábado.» */
export function tienesPuesto(empiezaEn: string | null | undefined, zona: Zona): string {
  const dia = reglas.diaDe(empiezaEn, zona)
  return dia ? `Tienes puesto el ${dia}.` : 'Tienes puesto.'
}

/** «Cena · sábado 3». */
export function cenaCorta(etiqueta: string, empiezaEn: string | null | undefined, zona: Zona): string {
  const p = reglas.partesDe(empiezaEn, zona)
  return p ? `${etiqueta} · ${p.dia} ${p.numero}` : etiqueta
}

/** «Hoy · 8:00 p.m.» o «Sábado · 8:00 p.m.»: la pastilla de la mesa abierta. */
export function cuandoMesa(empiezaEn: string | null | undefined, zona: Zona, ahora: number): string {
  const p = reglas.partesDe(empiezaEn, zona)
  if (!empiezaEn || !p) return ''
  return `${mismoDia(empiezaEn, ahora, zona) ? 'Hoy' : mayuscula(p.dia)} · ${p.hora ?? ''}`.trim()
}

/** «el mismo sábado» (el día de la cena), o «antes de la cena» si no se sabe. */
export function elMismoDia(empiezaEn: string | null | undefined, zona: Zona): string {
  const dia = reglas.diaDe(empiezaEn, zona)
  return dia ? `el mismo ${dia}` : 'antes de la cena'
}

/** La hora sola, en la zona de la fecha: «8:00 p.m.». */
export const horaEn = (iso: string | null | undefined, zona: Zona) => reglas.horaDe(iso, zona) ?? ''

// --- Perfil -------------------------------------------------------------------

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * «12 de mayo de 1990»: una fecha de nacimiento («AAAA-MM-DD»). Sin hora ni
 * zona, así que se lee del texto y NO se pasa por `Date`: medianoche UTC en
 * Caracas es el día anterior.
 */
export function fechaDeNacimiento(v: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '')
  if (!m || +m[2] < 1 || +m[2] > 12) return null
  return `${+m[3]} de ${MESES_LARGOS[+m[2] - 1]} de ${m[1]}`
}

/** «3 de octubre de 2026»: una cena del historial, en la zona de la ciudad. */
export function fechaCompleta(iso: string | null | undefined, zona?: Zona): string {
  const p = reglas.partesDe(iso, zona)
  return p ? `${p.numero} de ${p.mes} de ${p.ano}` : ''
}

/** «03/10/2026»: cuándo activó WhatsApp. */
export function fechaNumerica(iso: string | null | undefined, zona?: Zona): string {
  const p = reglas.partesDe(iso, zona)
  const d = (n: number) => String(n).padStart(2, '0')
  return p ? `${d(p.numero)}/${d(p.mesNumero + 1)}/${p.ano}` : ''
}

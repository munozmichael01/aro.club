import 'server-only'

import { partesDe } from '@/lib/reglas'

/**
 * Las dos tandas de avisos del día.
 *
 * Los avisos de apertura salían en el mismo minuto en que se abría la fecha.
 * El 10-10 se abrieron dos y salieron sesenta correos para treinta personas;
 * una recibió ocho en total. No escala: aceptan Chacao 398 personas,
 * Altamira 352 y Los Palos Grandes 350, así que dos fechas en zonas distintas
 * son ochocientos correos a cuatrocientas personas, y el segundo no dice nada
 * que el primero no dijera.
 *
 * La regla, de Michael (15-10): **un aviso de apertura al día por persona**,
 * acumulando los que hagan falta en ese correo. Dos tandas, doce y seis, para
 * que una fecha abierta por la mañana no espere a mañana.
 *
 * Un cierre NO entra aquí: va atado a su propia fecha límite y sale cuando le
 * toca. Juntarlo con esto sería aplazar un plazo.
 */
export const TANDAS = [12, 18]

/**
 * Y una hora de margen antes de cada una.
 *
 * Quien abre una fecha a las 11:58 tiene dos minutos para darse cuenta de que
 * puso mal la hora. Con el margen, esa fecha sale en la tanda siguiente y hay
 * una hora para corregirla; es la misma idea que las 24 horas de cierre, en
 * pequeño.
 */
export const MARGEN_HORAS = 1

/**
 * Cuándo sale el próximo aviso, en la hora de la ciudad de esa fecha.
 *
 * Se calcula como la DISTANCIA desde ahora y no armando una fecha nueva con
 * la zona horaria: para armarla haría falta convertir «hoy a las 12:00 en
 * Caracas» a UTC, que es la operación que este repo ya ha hecho mal dos
 * veces. Con la distancia, el instante hereda el de ahora.
 */
export function proximaTanda(zona: string, ahora: Date = new Date()): Date {
  const p = partesDe(ahora.toISOString(), zona)
  if (!p) return new Date(ahora.getTime() + 60 * 60_000)

  const minutos = p.horas * 60 + p.minutos

  for (const hora of TANDAS) {
    if (minutos < hora * 60 - MARGEN_HORAS * 60) {
      return new Date(ahora.getTime() + (hora * 60 - minutos) * 60_000)
    }
  }

  // Pasado el margen de la última: mañana, en la primera.
  return new Date(ahora.getTime() + ((24 + TANDAS[0]) * 60 - minutos) * 60_000)
}

/** El día de calendario de un instante, en la zona de la ciudad: «2026-10-15». */
export function diaDe(instante: Date, zona: string): string {
  const p = partesDe(instante.toISOString(), zona)
  if (!p) return instante.toISOString().slice(0, 10)
  return `${p.ano}-${String(p.mesNumero).padStart(2, '0')}-${String(p.numero).padStart(2, '0')}`
}

/** La primera tanda del día siguiente al de `instante`. */
export function tandaDeManana(instante: Date, zona: string): Date {
  const p = partesDe(instante.toISOString(), zona)
  if (!p) return new Date(instante.getTime() + 24 * 60 * 60_000)
  const minutos = p.horas * 60 + p.minutos
  return new Date(instante.getTime() + ((24 + TANDAS[0]) * 60 - minutos) * 60_000)
}

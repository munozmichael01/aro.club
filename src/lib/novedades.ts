/**
 * Las novedades que puede llevar el resumen de los lunes.
 *
 * Nació el 02-11 de Michael: «un correo de agenda + novedades». No es un
 * correo nuevo: es un bloque del mismo resumen, encima de las fechas, que
 * solo sale si el envío lo pide con `?novedades=<clave>`. Sin eso, el lunes
 * sale como siempre.
 *
 * Una entrada por envío y con su texto escrito aquí, aprobado por Michael
 * antes de mandarlo: lo que se anuncia a novecientas personas no se escribe
 * en una URL. La clave es la del envío (la semana, o la `?clave=` de uno
 * aparte), así que el texto de un lunes no se cuela en otro.
 *
 * Lo que dice cada una tiene que ser verdad ESA semana: el segundo acto solo
 * está en Chacao, y el premio del referido cuenta asistencias, no reservas
 * (`referidos.ts`).
 */

export type Novedad = {
  titulo: string
  texto: string
  /** Un enlace al final, a una ruta de la casa. */
  enlace?: { texto: string; ruta: string }
  /** Solo a quien tiene cuenta: el enlace de invitar no existe sin ella. */
  soloConCuenta?: boolean
}

export type Novedades = {
  /** El asunto del correo: sustituye a «Esta semana en Aro Club». */
  asunto: string
  items: Novedad[]
}

export const NOVEDADES: Record<string, Novedades> = {
  '2026-11-02': {
    asunto: 'Novedades y agenda de esta semana en Aro Club',
    items: [
      {
        titulo: '+1 acompañante',
        texto: 'El sábado 7 hay una cena de dúos: vienes con alguien, pareja o amigo, y toda la mesa viene de dos en dos. Reservas los dos puestos y le mandas su invitación.',
      },
      {
        titulo: 'Segundo acto',
        texto: 'Esta semana, en Chacao: después de las cenas del sábado, todas las mesas se juntan en un mismo bar. Cuál, lo sabrás ese día.',
      },
      {
        titulo: 'Brunch y drinks',
        texto: 'Además de las cenas, ahora hay brunch el domingo y drinks el viernes. Grupos de 4 a 8 personas, como la cena.',
      },
    ],
  },
}

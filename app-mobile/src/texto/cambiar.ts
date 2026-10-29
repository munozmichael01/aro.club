import { reglas } from '../reglas'

/**
 * Cambiar de fecha (29-10, Michael lo vio en Timeleft): casilla C, solo del
 * celular hasta que la web tenga su botón. El margen sale de
 * `AroReglas.HORAS_DE_MARGEN`, nunca escrito aquí.
 */

export const enlace = 'Cambiar de fecha'

/** Por qué no se puede, cuando no se puede. Ocultar el botón haría pensar que se rompió. */
export const noSePuede = (motivo: string | undefined): string | null =>
  motivo === 'tarde'
    ? `Ya no puedes cambiar de fecha: faltan menos de ${reglas.HORAS_DE_MARGEN} horas.`
    : motivo === 'sin-destinos'
      ? 'Ahora mismo no hay otra fecha abierta a la que puedas cambiarte.'
      : null

export const elegir = {
  titulo: '¿A qué fecha te cambias?',
  bajada: 'Lo que pagaste se viene contigo: no cobramos ni devolvemos nada.',
  ahora: 'TU FECHA AHORA',
  nuevas: 'ELIGE LA NUEVA',
  enIngles: 'En inglés',
  boton: (cambiando: boolean) => (cambiando ? 'Cambiando…' : 'Cambiarme a esta fecha'),
  quedarme: 'Quedarme en mi fecha',
  eligeUna: 'Elige una fecha para seguir.',
}

export const hecho = {
  sello: 'FECHA CAMBIADA',
  titulo: (dia: string) => (dia ? `Ahora tienes puesto el ${dia}.` : 'Ya cambiaste de fecha.'),
  cuerpo: 'Te mandamos un correo con la fecha nueva. Antes del plan te decimos dónde es y con quién.',
  verMesa: 'Ver mi mesa',
}

export const sinRespuesta = {
  cargar: 'No pudimos cargar tus fechas. Revisa la conexión y vuelve a intentarlo.',
  cambiar: 'No pudimos cambiar tu fecha. Vuelve a intentarlo.',
  reintentar: 'Reintentar',
  volver: 'Volver',
}

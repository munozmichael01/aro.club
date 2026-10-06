/**
 * El texto de Cancelar, copiado de `Cancelar.dc.html` (casilla B de
 * TEXTO-tres-superficies). La fecha, de `texto/fechas.ts`.
 *
 * Cambio frente a la web: los créditos del final («3» o «4») estaban
 * escritos a mano. Aquí son los de `/api/mi-cuenta`, leídos al cancelar.
 */

export const preguntar = {
  titulo: '¿Cancelas tu puesto?',
  bajada: (tarde: boolean) =>
    tarde ? 'Faltan menos de 24 horas y la mesa ya está armada con tu nombre.' : 'Todavía estás a tiempo de recuperar el crédito completo.',
  tuCredito: 'Tu crédito',
  credito: (tarde: boolean) => (tarde ? 'Se pierde' : 'Vuelve entero'),
  aviso: (tarde: boolean) =>
    tarde
      ? 'Con menos de 24 horas el crédito no se devuelve: el restaurante ya tiene la reserva y los otros cinco cuentan con seis. Aun así, cancelar es mejor que no aparecer. Un puesto vacío se nota en una mesa de seis.'
      : 'Cancelas con margen, así que el crédito vuelve entero a tu cuenta y no pasa nada. Nadie de la mesa se entera.',
  porQue: '¿POR QUÉ CANCELAS?',
  porQueNota: 'Opcional, y nos sirve de verdad: si el problema es la zona o la hora, lo arreglamos para la próxima.',
  /** El texto ES lo que se guarda (`motivo`): no cambiarlo sin hablar con el servidor. */
  motivos: ['Me surgió algo', 'La zona no me queda bien', 'La hora no me sirve', 'Ya no me apetece', 'Otra cosa'],
  si: (cancelando: boolean) => (cancelando ? 'Cancelando…' : 'Sí, cancelar mi puesto'),
  mantener: 'Mantener mi puesto',
  noPudimos: 'No pudimos cancelar.',
}

export const hecho = {
  sello: 'PUESTO CANCELADO',
  titulo: (dia: string | null) => (dia ? `Listo, no cuentan contigo el ${dia}.` : 'Listo, ya no cuentan contigo.'),
  resumen: (tarde: boolean) =>
    tarde
      ? 'Avisaste con menos de 24 horas, así que ese crédito se pierde. Gracias por decirlo igual: preferimos una mesa de cinco a un puesto vacío.'
      : 'Tu crédito volvió entero. Puedes apuntarte a otra fecha cuando quieras.',
  tusCreditos: 'TUS CRÉDITOS',
  disponibles: 'disponibles',
  noCaducan: 'No caducan. Los usas cuando quieras, en cualquier plan.',
  otrasFechas: 'Ver otras fechas',
  irCuenta: 'Ir a mi cuenta',
}

export const sinRespuesta = {
  cargar: 'No pudimos leer tu reserva. Revisa tu conexión e inténtalo otra vez.',
  sinReserva: 'No tienes ninguna reserva viva.',
  reintentar: 'Reintentar',
  volver: 'Volver a mi cuenta',
}

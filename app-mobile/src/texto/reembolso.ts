/**
 * Pedir el reembolso de un crédito por lista de espera (Michael, 21-10).
 * Copy aprobado, literal de `docs/handoff/PROPUESTA-reembolsos.md`.
 */
export const boton = 'Pedir el reembolso'
export const hasta = (dia: string) => `Tienes hasta el ${dia} para pedirlo. Después, el crédito sigue siendo tuyo para la próxima.`
export const titulo = 'Te devolvemos tu plaza en bolívares'
export const bajada = (precio: number) => `Te devolvemos los ${precio} ref de tu plaza por Pago Móvil.`
export const monto = { antes: 'Vas a recibir ', despues: (precio: number, tasa: string) => ` (${precio} ref a la tasa de hoy, ${tasa}).` }
export const aviso = 'Al enviarlo, el crédito sale de tu cuenta. No vas a poder usarlo para reservar. Si después quieres volver a una mesa, se paga de nuevo.'
export const enviando = 'Enviando…'
export const acuse = {
  titulo: 'Listo, vamos a ello',
  cuerpo: (montoBs: string, telefono: string | null) =>
    telefono ? `Te mandamos ${montoBs} Bs a ${telefono} en un día hábil. Te avisamos en cuanto salga.` : `Te mandamos ${montoBs} Bs en un día hábil. Te avisamos en cuanto salga.`,
}
export const hecho = {
  titulo: 'Te devolvimos el dinero',
  cuerpo: (montoBs: string, referencia: string | null) => `Te mandamos ${montoBs} Bs por Pago Móvil.${referencia ? ` Referencia ${referencia}.` : ''}`,
}
/** Los campos, con los nombres de la propuesta. */
export const etiquetas = { tel: 'Teléfono', doc: 'Cédula', banco: 'Banco' }
export const volver = 'Volver'
export const sinRespuesta = 'No pudimos cargar tu reembolso. Revisa tu conexión e inténtalo otra vez.'
export const noPudimos = 'No pudimos registrarlo. Vuelve a intentarlo.'

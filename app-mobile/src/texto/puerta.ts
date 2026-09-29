/**
 * El alta de la app (acordada el 29-09 con el agente de la web): las cuatro
 * de la puerta, el nacimiento y DESPUÉS la cuenta. Lo que ya existe se
 * reutiliza —las preguntas de `reglas.PUERTA`, la fecha y el «menor» de
 * Datos, los botones de Entrar, la contraseña de la cuenta—; lo único nuevo
 * (casilla C, solo del celular) es lo de abajo.
 */

export { nacimiento } from './datos'
export { quiz } from './entrada'

export const titulos = {
  nacimiento: '¿Cuándo naciste?',
  cuenta: 'Crea tu cuenta.',
}

export const cuenta = {
  bajada: 'Así guardamos tus respuestas y vuelves a entrar para ver tu mesa.',
  conCorreo: 'O con tu correo',
  correo: 'Tu correo',
  faltaCorreo: 'Escribe tu correo',
  ejemplo: 'tu@correo.com',
  yaTengo: 'Ya tengo cuenta · ',
  entrar: 'Entrar',
  yaExiste: 'Ese correo ya tiene cuenta. Entra con él y seguimos donde lo dejaste.',
  noCreada: 'No pudimos crear tu cuenta. Es cosa nuestra: inténtalo otra vez.',
}

export const guardando = {
  titulo: 'Guardando tus respuestas.',
  fallo: 'Tu cuenta está creada, pero no pudimos guardar tus respuestas. Inténtalo otra vez.',
  reintentar: 'Reintentar',
}

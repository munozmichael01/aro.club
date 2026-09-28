/**
 * El texto de Entrar, copiado de `Entrar.dc.html` (casilla B). Las fases de
 * Google y Apple («correo distinto», relay) llegan con /api/auth/nativo.
 */
export const inicio = {
  titulo: 'Entra a tu mesa.',
  bajada: 'Con la cuenta que usaste al registrarte.',
  conCorreo: 'Entrar con correo y contraseña',
  o: 'O',
  apple: 'Continuar con Apple',
  google: 'Continuar con Google',
  empezarAntes: '¿Todavía no tienes puesto? ',
  empezar: 'Empieza aquí',
  /**
   * ANDAMIO de desarrollo: Google y Apple entran cuando exista
   * /api/auth/nativo (PROPUESTA §g). Se quita antes de publicar.
   */
  proveedoresPendientes: 'Google y Apple se conectan en cuanto esté lista su ruta en el servidor. Mientras tanto, entra con tu correo.',
}

export const pie = [
  { texto: 'Por qué existe Aro Club', ruta: '/por-que' },
  { texto: 'Privacidad', ruta: '/privacidad' },
  { texto: 'Términos', ruta: '/terminos' },
]

export const correo = {
  titulo: 'Entra con tu correo.',
  bajada: 'El mismo con el que te registraste.',
  ejemplo: 'tu@correo.com',
  etiquetaCorreo: 'Tu correo',
  clave: 'Tu contraseña',
  ver: 'Ver',
  ocultar: 'Ocultar',
  verEtiqueta: 'Mostrar la contraseña',
  ocultarEtiqueta: 'Ocultar la contraseña',
  entrar: 'Entrar',
  falta: 'Escribe correo y contraseña',
  olvide: 'Olvidé mi contraseña',
  otraForma: 'Otra forma de entrar',
}

export const recuperar = {
  titulo: 'Mira tu correo.',
  bajada: (correo: string) =>
    `Te mandamos un enlace a ${correo} para poner una contraseña nueva. Vale una vez y caduca en quince minutos.`,
  volver: 'Volver a entrar',
  noLlega: 'No me llega',
  primeroCorreo: 'Escribe primero tu correo y te mandamos el enlace ahí.',
}

export const entrando = { titulo: 'Entrando.' }

/**
 * La web lo recibe de /api/entrar; la app entra con el SDK, que devuelve
 * sus propios errores en inglés. Se enseña el mismo texto que la web.
 */
export const noCoinciden = 'Ese correo y esa contraseña no coinciden.'
export const sinRed = 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.'
export const tuCorreo = 'tu correo'

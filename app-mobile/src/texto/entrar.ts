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
  /** Casilla C: en Expo Go, o sin los identificadores del proveedor, el botón no puede hacer nada. */
  noDisponible: (p: string) => `Entrar con ${p} todavía no funciona en esta versión de la app. Mientras tanto, entra con tu correo.`,
  falloProveedor: (p: string) => `No pudimos entrar con ${p}. Inténtalo otra vez o entra con tu correo.`,
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

/** Entraste con otra cuenta (Google o Apple con un correo distinto del del registro). De `Entrar.dc.html`. */
export const otroCorreo = {
  sello: 'CORREO DISTINTO',
  titulo: 'Entraste con otra cuenta.',
  bajadaAntes: 'Te registraste con ',
  bajadaMedio: ' y acabas de entrar con ',
  bajadaFin: '. Es la misma cuenta, no pierdes nada.',
  teEscribiremos: 'TE ESCRIBIREMOS A',
  nota: 'Ahí llega el correo con tu mesa, el día de la cena. Puedes cambiarlo cuando quieras desde tu perfil.',
  continuar: 'Continuar',
}

/** Apple ocultó el correo: solo hay una dirección de reenvío. De `Entrar.dc.html`. */
export const relay = {
  sello: 'FALTA UN CORREO',
  titulo: '¿A qué correo te escribimos?',
  bajada:
    'Entraste con Apple ocultando tu correo, así que solo tenemos una dirección de reenvío. Si algún día desvinculas Aro desde los ajustes de tu iPhone, ese reenvío deja de funcionar y nos quedamos sin forma de avisarte de tu mesa.',
  ejemplo: 'tu@correo.com',
  etiqueta: 'Correo de contacto',
  guardar: (guardando: boolean, ok: boolean) => (guardando ? 'Guardando…' : ok ? 'Guardar y seguir' : 'Escribe tu correo'),
  nota: 'Tu correo de Apple sigue oculto para nosotros. Este solo lo usamos para escribirte, y no lo ve nadie de tu mesa.',
}

/** Casilla C: la entrada con proveedor no terminó (se reintenta al abrir la app). */
export const sinTerminar = {
  titulo: 'No pudimos terminar de entrar.',
  bajada: 'Tu cuenta está bien. Falta un paso que depende de la conexión.',
  reintentar: 'Reintentar',
  noGuardado: 'No pudimos guardarlo. Inténtalo otra vez.',
}

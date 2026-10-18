/**
 * Seguridad y normas (14-10-2026). Lo pidió Apple (guía 1.2: términos con
 * tolerancia cero, y cómo reportar y bloquear). Michael: accesible desde los
 * enlaces legales, nunca una puerta obligatoria.
 */
export const normas = {
  titulo: 'Seguridad y normas',
  bajada: 'Aro Club funciona porque cada mesa es un sitio seguro.',
  puntos: [
    { titulo: 'Tolerancia cero', texto: 'Con el acoso, los insultos, el contenido ofensivo y cualquier abuso, en la mesa y en la app. Quien lo haga sale del club.' },
    { titulo: 'Puedes reportar', texto: 'A cualquier persona de tu mesa, desde Mi mesa. Lo lee una persona el mismo día.' },
    { titulo: 'Puedes bloquear', texto: 'A quien quieras: no vuelve a coincidir contigo y no se le avisa.' },
  ],
  legal: { antes: 'Al usar Aro Club aceptas estas normas, los ', terminos: 'Términos', medio: ' y la ', privacidad: 'Privacidad', despues: '.' },
  volver: 'Volver',
  enlace: 'Seguridad y normas',
}

/**
 * La casilla de Entrar y de crear cuenta: hay que marcarla para continuar
 * (Michael, 14-10: Apple pide que se ACEPTE, no basta con informar).
 */
export const acepto = {
  antes: 'Acepto las ',
  normas: 'normas de seguridad',
  medio: ' y los ',
  terminos: 'Términos',
  despues: ', con tolerancia cero a cualquier abuso.',
  falta: 'Acepta las normas para continuar',
}

/** La puerta de después de entrar, una vez por cuenta (18-10). */
export const puerta = {
  continuar: 'Continuar',
  guardando: 'Guardando…',
  noGuardado: 'No pudimos guardarlo. Vuelve a intentarlo.',
}

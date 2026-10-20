/**
 * La pregunta de la mesa en otro idioma (Michael, 20-10): en vez de un error,
 * a quien no marcó inglés se le pregunta al reservar. Palabra por palabra de
 * la web.
 */
export const pregunta = {
  titulo: '¿Hablas inglés?',
  cuerpo: 'Esta mesa se habla en inglés de principio a fin. No hace falta que sea perfecto, solo que te deje disfrutar la conversación.',
  si: 'Sí, añádelo a mi perfil',
  no: 'No',
  guardando: 'Guardando…',
  noGuardado: 'No pudimos guardarlo. Vuelve a intentarlo.',
}

/** El 409 del candado del idioma: con este motivo se pregunta, no se enseña el error. */
export const MOTIVO = 'falta-idioma'

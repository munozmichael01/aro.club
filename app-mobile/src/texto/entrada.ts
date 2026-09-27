/**
 * El texto de la entrada, copiado de la portada web (`Landing v4.dc.html`,
 * bloque «Registro» y cabecera). Casilla B de TEXTO-tres-superficies: vive
 * aquí hasta que exista `public/textos.js`, con la forma de funciones que
 * tendrá allí.
 *
 * Ningún día ni hora escrito a mano: los que dependen de la fecha llegan como
 * parámetro, ya calculados por `texto/fechas.ts`.
 */

/**
 * Fijo y sin día (decisión del 27-09, igual en la web): «esta semana» dice
 * que la cena es semanal sin atarse a un día que mañana puede cambiar.
 */
export const titular = {
  linea: 'Ya sabemos con quién cenas esta semana.',
  enfasis: 'Tú no. Todavía.',
}

/** La bienvenida de la app: una pantalla quieta, dos puertas del mismo tamaño. Los dos textos son los de la navegación de la web. */
export const bienvenida = {
  empezar: 'Empezar',
  entrar: 'Entrar',
}

export const chip = (ciudad: string, cierraEn: string | null) =>
  cierraEn
    ? `${ciudad} · la próxima se cierra en ${cierraEn}`
    : `${ciudad} · abrimos la próxima fecha en cuanto haya gente suficiente`

export const correo = {
  titulo: 'Empecemos por tu correo.',
  bajada: (yaTienePuesto: boolean) =>
    yaTienePuesto
      ? 'Tu puesto ya está guardado con este correo. Sigue y terminas las cuatro preguntas, que son las que nos dejan armar tu mesa.'
      : 'Después vienen cuatro preguntas de dos minutos. Con el correo te guardamos el puesto; con las preguntas podemos armar tu mesa.',
  ejemplo: 'tu@correo.com',
  etiqueta: 'Tu correo',
  boton: 'Continuar',
  garantias: ['No compartimos tu correo', 'Te sales con un clic'],
}

export const enviando = { titulo: 'Guardando tu puesto.' }

export const quiz = {
  progreso: (paso: number, total: number) => `PREGUNTA ${paso + 1} DE ${total}`,
  siguiente: 'Siguiente',
  terminar: 'Terminar',
  elige: 'Elige para seguir',
  atras: 'Atrás',
}

/** «Las Mercedes», «Chacao y Altamira», «A, B y C». */
export function enumerar(nombres: string[], vacio: string): string {
  if (!nombres.length) return vacio
  if (nombres.length === 1) return nombres[0]
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

export const final = {
  sello: 'TIENES PUESTO',
  titulo: 'Ya podemos empezar a armar tu mesa.',
  resumen: (correo: string, hayFecha: boolean, zonas: string) =>
    `Guardamos ${correo} y lo que nos dijiste. ` +
    (hayFecha ? 'Hay fecha abierta: termina tu perfil y puedes reservar.' : `Te escribimos en cuanto abramos mesa en ${zonas}.`),
  zonasVacio: 'tu zona',
  pendientesTitulo: 'LO QUE FALTA PARA PODER RESERVAR',
  pendientes: [
    { n: '1', titulo: 'Tus datos personales', cuerpo: 'Nombre, cuándo naciste, género y un teléfono. Cuatro campos, medio minuto.' },
    { n: '2', titulo: 'El resto del perfil', cuerpo: 'Diez preguntas más sobre días, comida y qué prefieres esquivar. Cinco minutos, cuando quieras.' },
    { n: '3', titulo: 'Verificar tu identidad', cuerpo: 'Solo cuando haya mesa cerca. Sin esto no se puede reservar, y es lo que hace que el grupo confíe.' },
  ],
  completar: 'Completar mi perfil',
  despues: 'Lo hago después',
}

export const repetido = {
  sello: 'YA TIENES PUESTO',
  titulo: 'Este correo ya está registrado.',
  cuerpo: (correo: string) =>
    `Ya te habías apuntado con ${correo} y no perdiste el turno. Si ya creaste tu cuenta, entra por aquí. Si no, el enlace para seguir donde lo dejaste está en el correo que te mandamos.`,
  entrar: 'Entrar a mi cuenta',
  otro: 'Usar otro correo',
}

/**
 * Solo lo que el servidor no puede decir, porque no llegó a contestar
 * (casilla C). Los errores que SÍ contesta se enseñan tal cual: la app no
 * tiene copia de ellos.
 */
export const sinRespuesta = {
  conexion: 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.',
  servidor: 'No pudimos guardar tu correo. Es cosa nuestra, no tuya: vuelve a intentarlo en un momento.',
  preguntas: 'No pudimos cargar las preguntas. Revisa tu conexión e inténtalo otra vez.',
  respuestas: 'No pudimos guardar tus respuestas. Revisa tu conexión e inténtalo otra vez.',
  reintentar: 'Reintentar',
}

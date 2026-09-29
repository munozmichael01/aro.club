/**
 * El texto de los datos personales, copiado de `Datos base.dc.html`.
 * Casilla B de TEXTO-tres-superficies: vive aquí hasta `public/textos.js`.
 *
 * Tres frases de la web llevan el día escrito («el sábado a mediodía», dos
 * veces «el sábado»). Aquí el día y la hora llegan calculados desde la fecha
 * real (`cuando`, de `texto/fechas.cuandoSeRevela`); sin fecha abierta, la
 * frase va sin día (decisión del 27-09).
 */

export const correo = {
  eyebrow: 'EMPEZAMOS',
  titulo: '¿A qué correo te escribimos?',
  bajada: 'Es lo único que hace falta para empezar. Después vienen cuatro datos y las preguntas.',
  etiqueta: 'Tu correo',
  ejemplo: 'daniela@correo.com',
  pista: (cuando: string | null) =>
    `Es por donde te avisamos de tu mesa: ${cuando ?? 'el día de la cena'}, cuando se revela. No hay lista de difusión ni nada que no hayas pedido.`,
  vacio: 'Escribe tu correo',
  revisar: 'Revisa el correo',
}

export const pasos = [
  {
    eyebrow: 'DATOS PERSONALES · 1 DE 4',
    titulo: '¿Cómo te llamas?',
    bajada: (conLead: boolean) =>
      conLead
        ? 'Lo último. Con esto ya podemos escribirte y sentarte en una mesa.'
        : 'Los datos con los que te escribimos. Puedes cambiarlos cuando quieras.',
  },
  {
    eyebrow: 'DATOS PERSONALES · 2 DE 4',
    titulo: '¿Cuándo naciste?',
    bajada: () => 'Es una de las dos cosas que más pesan al armar el grupo. Si ya la contestaste en las preguntas, aquí solo la confirmas.',
  },
  {
    eyebrow: 'DATOS PERSONALES · 3 DE 4',
    titulo: '¿Con qué género te identificas?',
    bajada: () => 'La otra. Va aparte del resto del perfil porque no se comparte con nadie.',
  },
  {
    eyebrow: 'DATOS PERSONALES · 4 DE 4',
    titulo: '¿A qué número te escribimos?',
    bajada: () => 'Solo el día del encuentro, y solo si hace falta.',
  },
]

export const nombre = {
  etiqueta: 'Tu nombre',
  ejemplo: 'Daniela Pérez',
  pista: 'Como aparece en tu cédula. Solo lo ve nuestro equipo al verificarte.',
  tratoEtiqueta: '¿Cómo quieres que te llamen en la mesa?',
  tratoEjemplo: 'Daniela',
  tratoPista: 'Esto sí lo ven los otros cinco. Solo el nombre, nunca el apellido.',
  vacio: 'Escribe tu nombre',
  corto: 'Escribe tu nombre completo',
}

export const nacimiento = {
  dia: 'DÍA',
  mes: 'MES',
  anio: 'AÑO',
  ejemploDia: 'DD',
  ejemploAnio: 'AAAA',
  edad: (n: number) => `${n} años`,
  pista: 'Nadie ve tu edad exacta. La usamos para que en tu mesa no haya más de diez años de diferencia entre la persona más joven y la mayor: es lo que hace que la conversación fluya.',
  menor: 'Aro es solo para mayores de 18 años. Si te equivocaste al escribir la fecha, corrígela.',
  rara: 'Esa fecha no parece correcta. Revísala.',
  incompleta: 'Completa día, mes y año',
  menorCorto: 'Aro es para mayores de 18',
  revisar: 'Revisa la fecha',
}

export const genero = {
  pista: 'No se muestra a nadie. Sirve para que la mesa quede balanceada y no acabes siendo la única persona de tu género en el grupo.',
  falta: 'Elige una opción',
}

export const telefono = {
  etiqueta: 'Teléfono',
  prefijo: 'Prefijo del país',
  otroPais: 'Otro país',
  ejemplo: (prefijo: string) => (prefijo === '+58' ? '412 1234567' : prefijo ? 'Tu número' : '+971 50 1234567'),
  incompleto: 'Ese número no se ve completo. Revisa el prefijo y las cifras.',
  pista: 'Solo lo usamos el día del encuentro, por WhatsApp, si hace falta avisarte de algo. No lo ve nadie de tu mesa.',
  vacio: 'Escribe tu teléfono',
  corto: 'Ese número se ve corto',
}

export const nav = {
  continuar: 'Continuar',
  terminar: 'Terminar',
  guardando: 'Guardando',
  unMomento: 'Un momento',
  atras: 'Atrás',
  faltaDato: 'Falta este dato',
  etiquetaCorreo: 'TU CORREO',
  etiquetaPaso: (n: number, total = 4) => `PASO ${n} DE ${total}`,
  etiquetaCompleto: 'COMPLETO',
  volver: 'Volver',
}

export const fin = {
  eyebrow: 'LISTO',
  titulo: (conLead: boolean, puedeCuenta: boolean) =>
    !conLead ? 'Guardado.' : puedeCuenta ? 'Listo. Solo falta tu cuenta.' : 'Guardado. Ahora las preguntas.',
  bajada: (conLead: boolean, puedeCuenta: boolean, cuando: string | null) =>
    !conLead
      ? 'Esto es todo lo que guardamos de esta parte, y quién lo ve.'
      : puedeCuenta
        ? `Crea la contraseña con la que vuelves a entrar${cuando ? ' ' + cuando : ''} a ver tu mesa. Debajo tienes todo lo que guardamos de ti, y quién lo ve.`
        : 'Esto es lo que guardamos de ti, y quién lo ve. Faltan las preguntas; al terminarlas creas tu cuenta.',
  guardamos: 'LO QUE GUARDAMOS',
  filas: {
    correo: 'Tu correo',
    nombre: 'Tu nombre',
    trato: 'En la mesa te llaman',
    edad: 'Edad',
    genero: 'Género',
    telefono: 'Teléfono',
  },
  visible: {
    equipo: 'Solo el equipo',
    cinco: 'Lo ven los cinco',
    nadie: 'No se muestra',
    eseDia: 'Solo ese día',
  },
  editar: 'Editar',
  editarEtiqueta: (campo: string) => `Editar ${campo.toLowerCase()}`,
  seguirPreguntas: 'Seguir con las preguntas',
  volverCuenta: 'Volver a mi cuenta',
}

export const cuenta = {
  titulo: 'CÓMO QUIERES ENTRAR A PARTIR DE AHORA',
  cuerpo: (cuando: string | null) =>
    `Guardamos tus respuestas en esta cuenta. Es con lo que vuelves a entrar${cuando ? ' ' + cuando : ''} para ver tu mesa.`,
  clave: 'Crea una contraseña',
  repetir: 'Repítela',
  repetirEtiqueta: 'Repite la contraseña',
  ver: 'Ver',
  ocultar: 'Ocultar',
  verEtiqueta: 'Mostrar la contraseña',
  ocultarEtiqueta: 'Ocultar la contraseña',
  dispares: 'Las dos contraseñas no coinciden.',
  boton: { corta: 'Al menos ocho caracteres', repetir: 'Repite la contraseña', dispares: 'No coinciden', crear: 'Crear mi cuenta' },
  pistaLista: 'Entrarás con tu correo y esta contraseña.',
  pistaCorta: 'Ocho caracteres como mínimo. Si prefieres no recordar otra contraseña, usa Apple o Google.',
  o: 'O',
  legal: {
    antes: 'Al crear tu cuenta aceptas los ',
    terminos: 'Términos',
    medio: ' y la ',
    privacidad: 'Privacidad',
    despues: '. Te pediremos la cédula y una selfie para verificar que eres quien dices; ahí se explica qué hacemos con ellas y cuándo se borran.',
  },
  creando: 'Creando tu cuenta',
}

export const despues = {
  titulo: 'DESPUÉS DE ESTO',
  paso: 'Verificar tu identidad',
  cuerpo: 'Cédula y una selfie. Lo revisa una persona y no se le muestra a nadie más. Es lo que hace que los otros cinco confíen.',
  plazo: 'Menos de 24 horas',
}

/** Lo que el servidor no puede decir porque no contestó (casilla C). */
export const sinRespuesta = {
  conexion: 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.',
  guardar: 'No pudimos guardar. Vuelve a intentarlo.',
  cuenta: 'No pudimos crear tu cuenta. Es cosa nuestra: inténtalo otra vez.',
  servidor: 'No pudimos continuar. Vuelve a intentarlo.',
}

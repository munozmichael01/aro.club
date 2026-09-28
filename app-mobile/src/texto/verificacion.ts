/**
 * El texto de la verificación, copiado de `Verificacion.dc.html` (casilla B
 * de TEXTO-tres-superficies). Lo que solo existe en el celular —«Usar esta»,
 * el permiso de la cámara— va al final, marcado (casilla C).
 *
 * La fase del QR de la web no está: es el traspaso del ordenador al
 * teléfono, y en la app ya se está en el teléfono.
 */

export const etiqueta = {
  intro: 'VERIFICACIÓN',
  captura: 'VERIFICACIÓN',
  revision: 'EN REVISIÓN',
  rechazo: 'ACCIÓN REQUERIDA',
  hecha: 'VERIFICADA',
} as const

export const intro = {
  eyebrow: 'ÚLTIMO PASO',
  titulo: 'Antes de pedirte nada, esto es lo que hacemos con ello.',
  bajada:
    'Verificar identidad es la promesa central del club: los otros cinco pasaron por lo mismo que tú. Aquí está todo, antes de que subas nada.',
  explicacion: [
    ['QUÉ PEDIMOS', 'La cédula o el pasaporte por delante, y una selfie. Nada más.'],
    ['PARA QUÉ', 'Confirmar que eres quien dices y que eres mayor de edad. Es lo único que hace que cinco desconocidos se sienten contigo.'],
    ['QUIÉN LO VE', 'Una persona del equipo de operación. Ni los otros cinco, ni el restaurante, ni el resto del equipo.'],
    ['DÓNDE SE GUARDA', 'Cifrado, en nuestros servidores. No se guarda en el teléfono de nadie ni en carpetas compartidas.'],
    ['CUÁNTO DURA', 'Se borra a los 90 días de aprobarse. Solo queda la marca de que la verificación ocurrió.'],
  ] as const,
  nadieTitulo: 'Nadie más ve tu documento',
  nadieCuerpo: 'Ni los otros cinco de tu mesa, ni el restaurante, ni el resto del equipo. Solo quien hace la revisión, con acceso registrado y nominal.',
  empezar: 'Empezar, son dos fotos',
  ahoraNo: 'Ahora no',
}

export const capturas = [
  {
    etiqueta: 'PASO 1 DE 2',
    titulo: 'La cédula, por delante.',
    ayuda: 'Ponla sobre una superficie plana, sin reflejos, y que entre entera en el recuadro.',
    pista: 'Que las cuatro esquinas queden dentro',
    boton: 'Tomar la foto',
    nota: 'Vale la cédula venezolana o el pasaporte. Si usas pasaporte, la página de la foto.',
  },
  {
    etiqueta: 'PASO 2 DE 2',
    titulo: 'Ahora una selfie.',
    ayuda: 'Cara despejada, sin gorra ni lentes de sol. Es para comparar con el documento, y no se le muestra a nadie.',
    pista: 'Mira al frente, con buena luz',
    boton: 'Tomar la selfie',
    nota: 'Esta foto no es tu foto de perfil. En Aro no hay fotos de perfil, en ninguna pantalla.',
  },
] as const

export const captura = {
  galeria: 'Elegir de la galería',
  repetir: 'Repetir',
  subiendo: 'Subiendo tu foto',
  laQueHiciste: 'La foto que acabas de hacer',
  atascadoTitulo: '¿Sigue sin subir?',
  atascadoCuerpo: 'No te quedes aquí. Escríbenos y lo resolvemos contigo por otro camino: tu puesto no se pierde por esto.',
  escribirnos: 'Escribirnos',
  asuntoAyuda: 'No puedo subir mi verificación',
}

export const revision = {
  recibido: 'RECIBIDO',
  titulo: 'Lo está revisando una persona.',
  bajada: 'Menos de 24 horas, casi siempre el mismo día. Te escribimos al correo en cuanto esté. No hace falta que dejes esto abierto.',
  mientras: 'MIENTRAS TANTO',
  pasos: [
    { hecho: true, titulo: 'Tu perfil está completo', cuerpo: 'Tus respuestas ya están guardadas. No hay que tocar nada más.' },
    { hecho: false, titulo: 'Te avisamos cuando haya mesa', cuerpo: 'En cuanto se apruebe y se abra mesa en tu zona, llega un solo correo con el día y la hora.' },
  ],
  cuenta: 'Ir a mi cuenta',
}

export const hecha = {
  sello: 'IDENTIDAD VERIFICADA',
  titulo: 'Eres tú, y ya está comprobado.',
  bajada: (revisadaEl: string | null) =>
    `Lo revisó una persona de nuestro equipo${revisadaEl ? ' el ' + revisadaEl : ''}. Ya puedes reservar puesto en cualquier fecha abierta.`,
  tituloBorrado: (yaBorradas: boolean, seBorraEl: string | null) =>
    yaBorradas
      ? 'Tu cédula y tu selfie ya están borradas'
      : seBorraEl
        ? `Tu cédula y tu selfie se borran el ${seBorraEl}`
        : 'Tu cédula y tu selfie se borran a los noventa días',
  cuerpoBorrado: (yaBorradas: boolean) =>
    yaBorradas
      ? 'Solo queda la marca de que la verificación ocurrió. No las vio ningún otro miembro.'
      : 'A los noventa días de aprobarla. Después solo queda la marca de que la verificación ocurrió. No las ve ningún otro miembro.',
  cuenta: 'Ir a mi cuenta',
}

export const rechazo = {
  titulo: (reintento: boolean) => (reintento ? 'HAY QUE REPETIR LAS FOTOS' : 'NO PUDIMOS VERIFICARTE'),
  encabezado: (reintento: boolean) => (reintento ? 'Hay que repetirlo.' : 'Esto lo vemos contigo.'),
  quePaso: 'QUÉ PASÓ',
  repetir: 'Repetir las fotos',
  volver: 'Volver',
  pie: (reintento: boolean) =>
    reintento
      ? 'Si vuelve a fallar dos veces, te escribimos y lo resolvemos con una persona. Nunca te dejamos con un error y sin salida.'
      : 'Lo revisa una persona, no un programa. Escríbenos y lo miramos contigo.',
}

// --- Solo del celular (casilla C) ------------------------------------------

/** Lo que pide el pedido (§7, criterio 9.3): repetir ANTES de enviar. */
export const usarEsta = 'Usar esta'

export const permiso = {
  titulo: 'La cámara está apagada para Aro Club',
  cuerpo: 'Para la foto de la cédula y la selfie hace falta la cámara. Puedes activarla en los ajustes del celular, o elegir las fotos de tu galería.',
  pedir: 'Permitir la cámara',
  ajustes: 'Abrir los ajustes',
}

/** Lo que el servidor no dice porque no contestó. */
export const sinRespuesta = {
  subir: 'No pudimos subir la foto. Puede ser la conexión: prueba otra vez.',
  cargar: 'No pudimos cargar tu verificación. Revisa tu conexión e inténtalo otra vez.',
  reintentar: 'Reintentar',
}

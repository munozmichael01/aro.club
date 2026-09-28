/**
 * El texto de Perfil, copiado de `Mi perfil.dc.html` (casilla B de
 * TEXTO-tres-superficies). Las preguntas, sus opciones y su ayuda NO están
 * aquí: vienen del catálogo (`/api/mi-perfil`), como en la web.
 *
 * Cambio frente a la web (§6 bis, 2): «La mesa del sábado ya está armada»
 * → sin día: el texto no tiene la fecha delante.
 */

export const cabecera = {
  saludo: (trato: string) => `${trato || 'Tu perfil'}.`,
  soloVen: 'De ti, los otros cinco solo ven tu nombre y tu sector. Todo lo demás vive aquí y no se le muestra a nadie.',
  entrasCon: 'Entras con ',
  teEscribimos: 'Te escribimos a ',
  paraCambiarlo: 'Para cambiarlo, ',
  escribenos: 'escríbenos',
}

export const credenciales = {
  verificada: (si: boolean) => (si ? 'Identidad verificada' : 'Sin verificar'),
  completo: (d: { completo?: boolean; faltanBase?: number; faltanPreguntas?: number }) => {
    const b = d.faltanBase ?? 0
    const q = d.faltanPreguntas ?? 0
    if (d.completo) return 'Perfil completo'
    if (b && q) return `Faltan ${q} respuestas y ${b} datos`
    if (b) return b === 1 ? 'Falta un dato personal' : `Faltan ${b} datos base`
    return q === 1 ? 'Falta 1 respuesta' : `Faltan ${q} respuestas`
  },
  creditos: (n: number) => (n === 1 ? '1 crédito' : `${n} créditos`),
}

/** Los cinco datos base: no vienen del catálogo, son del perfil. */
export const BASE = {
  trato: { etiqueta: 'Cómo te llamamos en la mesa', ayuda: 'Es lo único que ven los otros cinco, junto con tu sector.' },
  nombre: { etiqueta: 'Tu nombre completo', ayuda: 'Como aparece en tu cédula. Solo lo ve nuestro equipo al verificarte.' },
  nacimiento: { etiqueta: 'Fecha de nacimiento', ayuda: 'Nadie ve tu edad. La usamos para que en tu mesa no haya más de diez años de diferencia.' },
  genero: {
    etiqueta: 'Género',
    ayuda: 'No se muestra a nadie. Sirve para que la mesa quede balanceada.',
    opciones: [
      ['Mujer', 'mujer'],
      ['Hombre', 'hombre'],
      ['No binario', 'no-binario'],
      ['Prefiero no decirlo', 'sin-decir'],
    ] as [string, string][],
  },
  telefono: { etiqueta: 'Teléfono', ayuda: 'Solo lo usamos el día del encuentro, por WhatsApp. No lo ve nadie de tu mesa.' },
}

/** Las secciones, en el orden del cuestionario: la 0 son los datos base; la 1-5, sus pantallas. */
export const SECCIONES = [
  ['Datos personales', 'Lo que diste al entrar. Edad y género sostienen el reparto.'],
  ['Tu contexto', 'Con esto evitamos sentarte con alguien de tu empresa.'],
  ['Cómo eres en la mesa', 'Lo que más pesa al armar el grupo. Nada de esto se le muestra a nadie.'],
  ['De qué hablas', 'Dos horas se sostienen con temas.'],
  ['Qué buscas y cuánto', 'El rango que marques es el techo del sitio que elegimos.'],
  ['Logística', 'A qué mesa puedes llegar de verdad y qué sitio elegir.'],
] as const

export const campo = {
  sinResponder: 'Sin responder',
  editando: 'Editando',
  completaFecha: 'Completa la fecha',
  eligeAlMenos: (n: number) => `Elige al menos ${n}`,
  guardar: 'Guardar',
  guardando: 'Guardando…',
  cancelar: 'Cancelar',
  noGuardado: 'No pudimos guardarlo.',
  fecha: { dia: 'DÍA', mes: 'MES', anio: 'AÑO', ejemploDia: 'DD', ejemploAnio: 'AAAA' },
}

export const exclusiones = {
  titulo: 'Con quién no coincides',
  nota: 'Nadie sabe nunca que la bloqueaste.',
  vacio: 'No has bloqueado a nadie. Puedes hacerlo después de cualquier cena, desde Mi mesa.',
  quitar: (quitando: boolean) => (quitando ? 'Quitando…' : 'Quitar'),
  noQuitado: 'No pudimos quitarlo.',
}

export const cenas = {
  titulo: 'Mis cenas',
  nota: 'Dónde has estado y cuándo.',
  vacio: 'Todavía no has ido a ninguna. Cuando vayas, aparecen aquí.',
  estado: { fuiste: 'Fuiste', cancelaste: 'Cancelaste', 'no-llegaste': 'No llegaste' } as Record<string, string>,
  mesa: (n: number) => ` · mesa ${String(n).padStart(2, '0')}`,
  noAgenda: 'Quiénes se sentaron contigo no se guarda aquí: Aro no es una agenda de contactos.',
}

export const avisos = {
  titulo: 'Cómo te escribimos',
  nota: 'Nunca promociones. Solo esto.',
  fijos: 'Los dos primeros no se pueden apagar: sin ellos no sabrías dónde es tu cena.',
  desde: (fecha: string) => `Lo activaste el ${fecha}`,
  noGuardado: 'No pudimos guardarlo. Inténtalo otra vez.',
}

export const noTocaLaMesa = {
  titulo: 'Cambiar respuestas no toca la mesa que ya tienes',
  cuerpo: 'Lo que edites aquí entra en el emparejamiento de las próximas. La mesa que ya tienes está armada con lo que respondiste antes.',
}

export const baja = {
  titulo: 'Darse de baja',
  cuerpo:
    'Se borran tus respuestas, tu cédula y tu selfie, y dejas de entrar a cualquier reparto. Se conservan tus pagos, porque la ley nos obliga a guardar la facturación, y quedan sin tu nombre. No se puede deshacer.',
  quiero: 'Quiero darme de baja',
  escribe: 'Escribe BAJA para confirmar',
  palabra: 'BAJA',
  confirmar: (dando: boolean, puede: boolean) => (dando ? 'Dando de baja…' : puede ? 'Darme de baja' : 'Escribe BAJA'),
  cancelar: 'Cancelar',
  noPudimos: 'No pudimos completar la baja.',
}

export const pie = {
  verificacion: 'Mi verificación',
  privacidad: 'Qué hacemos con esto',
}

export const sinRespuesta = {
  cargar: 'No pudimos cargar tu perfil. Revisa tu conexión e inténtalo otra vez.',
  reintentar: 'Reintentar',
}

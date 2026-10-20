/**
 * El texto del Inicio, copiado de `Mi cuenta.dc.html` (casilla B de
 * TEXTO-tres-superficies). Las cifras y los días NO están aquí: salen del
 * servidor y de `texto/fechas.ts`.
 *
 * Cambios frente a la web, todos por la misma regla (§6 bis, 2):
 * - «el sábado a las doce / al mediodía» → `cuandoSeSabe(revelaEn)`;
 * - «Lo que viene en Caracas» → la ciudad de `CIUDAD_PRODUCTO`;
 * - «Tu puesto del sábado ya está pagado» → sin día;
 * - los días de cada polaroid («Sábado y viernes») → los de sus fechas
 *   abiertas de verdad (`diasDe`).
 */

import { reglas } from '../reglas'
import { CIUDAD_PRODUCTO } from './zona'

export type EstadoCuenta = 'perfil' | 'datos' | 'verificar' | 'revision' | 'reservar' | 'porconfirmar' | 'reservada' | 'abierta'

type Copia = {
  sello: string
  titulo: string
  cuerpo: (cuandoSeSabe: string) => string
  accion: string
  /** Adónde lleva la acción: una ruta de la app o `#agenda`. */
  destino: string
  calmado?: boolean
  tituloMov?: string
  cuerpoMov?: string
}

const Mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const ESTADOS: Record<EstadoCuenta, Copia> = {
  perfil: {
    sello: 'TE FALTAN PREGUNTAS',
    titulo: 'Termina tu perfil y ya podemos sentarte.',
    cuerpo: () =>
      'Cinco pantallas: cómo eres en la mesa, de qué hablas, cuánto quieres gastar y qué días puedes. Lo que respondiste al registrarte no se vuelve a preguntar.',
    accion: 'Continuar el perfil',
    destino: '/cuestionario',
  },
  datos: {
    sello: 'FALTAN TUS DATOS PERSONALES',
    titulo: 'Faltan cuatro datos para poder sentarte.',
    cuerpo: () =>
      'Tu nombre, cuándo naciste, tu género y un teléfono. Cuatro campos, medio minuto, y sin ellos no podemos armar tu mesa: la edad y el género son lo que más pesa al formar el grupo.',
    accion: 'Completar mis datos',
    destino: '/datos',
  },
  verificar: {
    sello: 'FALTA VERIFICAR',
    titulo: 'Verifica tu identidad para poder reservar.',
    cuerpo: () =>
      'Cédula y una selfie. Lo revisa una persona, no se le muestra a nadie más, y se borra a los 90 días. Es lo que hace que los otros cinco confíen.',
    accion: 'Verificar mi identidad',
    destino: '/verificacion',
  },
  revision: {
    sello: 'EN REVISIÓN',
    calmado: true,
    titulo: 'Estamos revisando tu identidad.',
    cuerpo: () => 'Menos de 24 horas, casi siempre el mismo día. Te escribimos al correo en cuanto esté. No hace falta que hagas nada.',
    accion: 'Ver mis respuestas',
    destino: '/perfil',
  },
  reservar: {
    sello: 'LISTA PARA RESERVAR',
    // El titular se calcula (`tituloHayCena`): este es el de sin fecha.
    titulo: 'Todavía no hay fecha abierta.',
    cuerpo: (cuando) => `Te apuntas a la fecha, pagas en bolívares, y ${cuando} sabes en qué mesa te tocó y con quién.`,
    accion: 'Elegir mi fecha',
    destino: '#agenda',
  },
  porconfirmar: {
    sello: 'PAGO EN REVISIÓN',
    titulo: 'Tu puesto está apartado.',
    cuerpo: () =>
      'Reportaste el pago y una persona lo está cuadrando con el banco. Suele tardar menos de una hora. Nadie más puede tomar tu puesto mientras tanto.',
    accion: 'Ver mi reserva',
    destino: '/mesa',
  },
  reservada: {
    sello: 'TIENES MESA',
    // El titular es la fecha de la reserva (`titularDeReserva`).
    titulo: 'Ya tienes mesa.',
    cuerpo: (cuando) =>
      `Ya está reservada a tu nombre. ${Mayus(cuando)} se abre todo: el sitio, la dirección, tu número de mesa y quiénes son los otros cinco.`,
    accion: 'Ver mi reserva',
    destino: '/mesa',
  },
  abierta: {
    sello: 'ABIERTO',
    titulo: 'Tu mesa de esta noche.',
    cuerpo: () => 'Llega diez minutos antes y pregunta por la reserva de Aro. Si se te hace tarde, avísanos y se lo decimos al grupo.',
    tituloMov: 'Tu grupo de hoy.',
    cuerpoMov: 'Llega diez minutos antes al punto de encuentro y pregunta por Aro. Si se te hace tarde, avísanos y se lo decimos al grupo.',
    accion: 'Cómo llegar',
    destino: '/mesa',
  },
}

/** El número solo cuando es pequeño: «te faltan 15» desanima; «te faltan 2», empuja (Michael, 01-10-2026). */
export const POCAS = 3
export const selloPreguntas = (faltan: number) =>
  faltan > POCAS || faltan < 1 ? 'UN PASO MÁS' : `TE FALTAN ${faltan} ${faltan === 1 ? 'PREGUNTA' : 'PREGUNTAS'}`

export const saludo = (nombre: string | null) => (nombre ? `Hola, ${nombre}.` : 'Hola.')

/** Sin fecha abierta, «Elegir mi fecha» no tiene nada que elegir. */
export const verAgenda = 'Ver la agenda'

/** Por debajo de esto no se enseña cuánta gente va: «0 apuntados» es verdad y desanima. */
export const UMBRAL_APUNTADOS = 3
export const MESA = 6

export const cuerpoReservar = (apuntados: number, seCierra: string, base: string) =>
  `${apuntados < UMBRAL_APUNTADOS ? 'Recién abierta' : `Ya van ${apuntados} apuntados`}${seCierra}. ${base}`
export const sinFecha = 'Te avisamos por correo en cuanto abramos la próxima. No hay que hacer nada.'

export const mesa = {
  etiqueta: 'MESA',
  losOtros: 'LOS OTROS CINCO',
}

export const agenda = {
  /** Con crédito, en una fecha que se graba, hasta marcar el permiso (18-10). */
  marcaPermiso: 'Marca el permiso para seguir',
  titulo: `Lo que viene en ${CIUDAD_PRODUCTO.nombre}`,
  /** Cómo se arma la mesa. Va en la hoja de reservar, no encima de la agenda: allí empujaba la primera fecha fuera de la pantalla (entrega 19), y es al reservar cuando hace falta. */
  /** El cierre sale de `reglas.textoCierre` (20-10): a medianoche las cenas, a las 5:00 p.m. del día antes los planes de mañana. Como la web. */
  comoFunciona: (cierre: string) =>
    `Te apuntas a una fecha, no a una mesa. Los apuntados se reparten en mesas de seis por toda la zona, y antes te decimos en cuál te tocó. La fecha ${cierre || 'se cierra a medianoche, cuando empieza su día'}.`,
  verTodo: 'Ver todo',
  vacia: 'Nada de ese tipo abierto ahora mismo. Abrimos según lo que pida la gente: marca ese plan en tu perfil y cuentas para que salga.',
  eligeHora: 'ELIGE LA HORA',
  cargo: 'Tu puesto en esta fecha',
  precio: (precioTexto: string) => `${precioTexto} en bolívares`,
  nota: 'Cubre el emparejamiento, la verificación del grupo y la mesa reservada a tu nombre. Tu consumo lo pagas en el sitio. Cancelas con más de 24 h y recuperas el crédito.',
  cancelar: 'Cancelar',
  apuntandote: 'Apuntándote',
  enRevision: 'Te avisamos al aprobarla',
  verificaPrimero: 'Verifica tu identidad primero',
  preguntasPrimero: (_n: number) => 'Termina tu perfil para reservar',
  datosPrimero: 'Completa tus datos para reservar',
  reservar: (conCredito: boolean, precioTexto: string) => `Reservar mi puesto · ${conCredito ? '1 encuentro' : precioTexto}`,
  proximamente: 'Próximamente',
  todos: 'Todos',
  todoLoQueViene: 'Todo lo que viene',
  /** Quien vive en una ciudad que aún no abre (no se le dice «Caracas» ni se le empuja a reservar). */
  tituloCiudad: (ciudad: string) => `Lo que viene en ${ciudad}`,
  ciudadCerrada: (ciudad: string) =>
    `Todavía no abrimos en ${ciudad}. Abrimos ciudad cuando hay suficiente gente que pueda llegar a la misma mesa el mismo día, y te avisamos en cuanto pase.`,
  zonaPorConfirmar: 'Zona por confirmar',
  noPudimos: 'No pudimos apuntarte.',
}

/** Los formatos, como se llaman en el calendario (plural) y en una fila propia (singular). */
export const FORMATOS: Record<string, { plural: string; singular: string }> = {
  dinner: { plural: 'Cenas', singular: 'Cena' },
  drinks: { plural: 'Drinks', singular: 'Drinks' },
  movement: { plural: 'Movimiento', singular: 'Movimiento' },
  coffee: { plural: 'Coffee', singular: 'Coffee' },
  /** Quinta familia (15-10, primera fecha el domingo 25; entrega 21 de Design). */
  brunch: { plural: 'Brunch', singular: 'Brunch' },
}
/** «Cena +40»: una fecha con edad mínima. */
export const conEdad = (singular: string, edad: number) => `${singular} +${edad}`

export const ORDEN_FORMATOS = ['dinner', 'drinks', 'movement', 'coffee', 'brunch'] as const

/** Lo que dice cada fecha de la agenda debajo de su barra. */
export function estadoDeFecha(n: number, mia: boolean, cerrada: boolean): string {
  const apuntados = `${n} ${n === 1 ? 'apuntado' : 'apuntados'}`
  if (cerrada) return mia ? 'Ya tienes puesto · cerrada' : `Cerrada · ${apuntados}`
  if (mia) return 'Ya tienes puesto'
  if (n < UMBRAL_APUNTADOS) return 'Una mesa son seis'
  if (n >= MESA) {
    const mesas = Math.ceil(n / MESA)
    return `${apuntados} · ${mesas} ${mesas === 1 ? 'mesa' : 'mesas'}`
  }
  const faltan = MESA - n
  return `${apuntados} · ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`} para la primera mesa`
}

export const valorar = {
  etiqueta: 'PENDIENTE DE VALORAR',
  titulo: (sitio: string | null) => (sitio ? `Tu mesa en ${sitio}.` : 'Tu última mesa.'),
  cuerpo: 'Dos preguntas. Lo que digas entra en el emparejamiento de la próxima, y nadie más lo ve.',
  boton: 'Valorar esa mesa',
}

export const proximo = {
  titulo: 'Lo próximo',
  cancelar: 'Cancelar',
  vacioTitulo: 'Todavía no te has apuntado a nada.',
  vacioCuerpo: 'Cuando te apuntes a una fecha aparece aquí, y después de ir podrás contarnos qué tal fue. Eso entra en el emparejamiento de la siguiente.',
  verLoQueViene: 'Ver lo que viene',
  porConfirmar: { detalle: 'Pago en revisión · puesto apartado', estado: 'Por confirmar' },
  /** Sin plazo (20-10): el cierre es de quien todavía no tiene puesto. Como la web. */
  confirmada: { detalle: 'Confirmada', estado: 'Confirmada' },
  mesa: (n: number) => ` · mesa ${String(n).padStart(2, '0')}`,
}

export const atajos = {
  respuestas: {
    titulo: 'Mis respuestas',
    cuerpo: (total: number | null) => `Las ${total ?? ''} del cuestionario, para ver y editar cuando quieras.`,
    pie: (faltan: number) => (faltan === 0 ? 'Completas' : `${faltan} ${faltan === 1 ? 'pendiente' : 'pendientes'}`),
  },
  creditos: {
    titulo: 'Mis créditos',
    pie: (n: number) => (n === 0 ? 'Ninguno' : n === 1 ? '1 crédito' : `${n} créditos`),
    cuerpo: (n: number, conReserva: boolean) =>
      (n === 0
        ? conReserva
          ? 'Tu puesto ya está pagado. Si cancelas con más de 24 horas, el crédito vuelve aquí.'
          : 'Se paga cada cena al reservarla. Si cancelas con más de 24 horas, el crédito queda aquí para la siguiente.'
        : n === 1
          ? 'Un crédito sin usar, de una cena que cancelaste a tiempo. No caduca.'
          : `${n} créditos sin usar, de cenas que cancelaste a tiempo. No caducan.`) + ' Cómo funcionan, en los términos.',
  },
  verificacion: {
    titulo: 'Mi verificación',
    cuerpo: 'Estado de tu cédula y tu selfie.',
    pie: { sin: 'Sin verificar', revision: 'En revisión', ok: 'Verificada' } as Record<string, string>,
  },
  exclusiones: {
    titulo: 'Exclusiones',
    cuerpo: 'Personas con las que no quieres volver a coincidir. Nadie se entera.',
    pie: (n: number | null) => (n == null ? 'Cargando' : n === 0 ? 'Ninguna' : n === 1 ? '1 persona' : `${n} personas`),
  },
  cenas: {
    titulo: 'Mis cenas',
    cuerpo: 'Dónde has estado y cuándo. La lista entera.',
    pie: (n: number | null) => (n == null ? 'Cargando' : n === 0 ? 'Ninguna todavía' : n === 1 ? '1 cena' : `${n} cenas`),
  },
}

/** El pie: páginas de la web, se abren en el navegador de la app. */
export const pie = [
  { texto: 'Preguntas', ruta: '/#faq' },
  /** El legal también dentro de la app (Michael, 18-10). */
  { texto: 'Reglas de la mesa', ruta: 'app:/legal?doc=reglas' },
  /** «app:» se abre dentro de la app, no en la web (Apple 1.2, 14-10). */
  { texto: 'Seguridad y normas', ruta: 'app:/normas' },
  { texto: 'Privacidad', ruta: 'app:/legal?doc=privacidad' },
]

export const nav = {
  inicio: 'Inicio',
  perfil: 'Perfil',
  operacion: 'Operación',
  salir: 'Cerrar sesión',
  saliendo: 'Cerrando…',
}

/** Lo que el servidor no dice porque no contestó (casilla C). */
export const sinRespuesta = {
  cargar: 'No pudimos cargar tu cuenta. Revisa tu conexión e inténtalo otra vez.',
  reintentar: 'Reintentar',
  cargando: 'Cargando tu cuenta',
}

/** El aviso de preguntas nuevas al reservar (18-10), palabra por palabra de la web. */
export const preguntasNuevas = {
  cinta: 'PARA TU MESA',
  titulo: (n: number) =>
    ['', 'Una pregunta nueva', 'Dos preguntas nuevas', 'Tres preguntas nuevas', 'Cuatro preguntas nuevas', 'Cinco preguntas nuevas', 'Seis preguntas nuevas'][n] ??
    `${n} preguntas nuevas`,
  bajada: 'Nos ayudan a armar mejor tu mesa, y no se le enseñan a nadie de tu cena.',
  guardar: (guardando: boolean) => (guardando ? 'Guardando…' : 'Guardar'),
  ahoraNo: 'Ahora no',
  sinAlcohol: 'Dijiste que no tomas alcohol, así que la dejamos en «sin alcohol».',
}

/** La fecha que se graba entera (18-10): el permiso es condición para apartar puesto. Palabra por palabra de la web. */
export const grabacionFecha = {
  titulo: 'Esta cena la grabamos',
  cuerpo: 'Vamos a grabar contenido en esta cena: fotos y video para las redes de Aro. Apartar puesto aquí es darnos permiso para que salgas. Si prefieres que no, hay otras fechas sin cámara.',
  permiso: (marcado: boolean) => (marcado ? 'Sí, pueden grabarme ✓' : 'Sí, pueden grabarme'),
}

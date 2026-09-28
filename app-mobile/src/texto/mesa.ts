/**
 * El texto de Mi mesa, copiado de `Mi mesa.dc.html` (casilla B de
 * TEXTO-tres-superficies). Mesa o grupo según el formato (`reglas.vozDe`).
 * Los días y las horas salen de `texto/fechas.ts`.
 *
 * Cambios frente a la web, por la regla de los días (§6 bis, 2):
 * - «A mediodía se abre todo» → `cuandoSeSabe(revelaEn)`;
 * - «se hace el mismo sábado» / «El sábado a mediodía se abre todo» (sin
 *   mesa aún, ya pasada la revelación) → el día de la cena y «en cuanto
 *   estén»: a esa hora la revelación ya pasó, y repetirla no dice nada.
 * - «Cena · sábado 3» → el formato real de la fecha.
 */

type Voz = { unidad: string; unidades: string; tu: string; TU: string }

const Mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const vacia = {
  revision: {
    sello: 'EN REVISIÓN',
    titulo: 'Estamos revisando tu cédula.',
    bajada: 'Lo mira una persona, no un programa. Suele estar en menos de 24 horas y te avisamos por correo en cuanto esté.',
    nota: 'Mientras tanto no tienes que hacer nada. En cuanto te verifiquemos podrás apartar puesto en la próxima fecha.',
  },
  sinMesa: {
    sello: 'PUESTO APARTADO',
    titulo: 'Tu puesto está apartado.',
    bajada: (elMismoDia: string) => `Ya estás dentro de esta fecha. Falta armar los grupos, y eso se hace ${elMismoDia}.`,
    nota: 'En cuanto estén, se abre todo: el sitio, la dirección, tu número de mesa y los otros cinco.',
  },
  sinReserva: {
    sello: 'TODAVÍA NO',
    titulo: 'Aún no tienes mesa.',
    bajada: 'Cuando apartes puesto en una fecha, aquí aparece tu mesa: el sitio, la hora y quiénes son los otros cinco.',
    nota: 'Cada semana se abre una fecha. Son seis personas, y el sitio lo elegimos nosotros.',
    accion: 'Ver la próxima fecha',
  },
}

export const cerrada = {
  bajada: (cuando: string) => `${Mayus(cuando)} se abre todo: el sitio, la dirección, tu número de mesa y quiénes son los otros cinco.`,
  paraQue: 'para que se abra',
  nota: 'Cenas con cinco personas. Te avisamos por correo en cuanto se abra.',
}

export const cancelar = 'Cancelar mi puesto'

export const abierta = {
  sello: 'ABIERTO',
  queSeHace: 'QUÉ SE HACE',
  selloReserva: (esMesa: boolean) => (esMesa ? 'Reserva a tu nombre' : 'Punto de encuentro'),
  comoLlegar: 'Cómo llegar',
  vozTarde: 'Voy tarde',
  conQuien: (esMesa: boolean) => (esMesa ? 'CON QUIÉN CENAS' : 'CON QUIÉN VAS'),
  sinSector: 'Sin sector',
  notaCompaneros: (esMesa: boolean) =>
    `Todos con identidad verificada. No hay fotos ni apellidos: eso lo cuenta cada quien ${esMesa ? 'en la mesa' : 'sobre la marcha'} si quiere.`,
  alLlegar: 'Al llegar',
  llegada: (esMesa: boolean, numero: string, total: number) => {
    const letras = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
    const son = letras[total] ?? String(total)
    return esMesa
      ? `Di que vas a la mesa de Aro, la ${numero}. Está reservada a tu nombre y el restaurante ya sabe que son ${son}.`
      : `Busca al grupo ${numero} de Aro en el punto de encuentro. Son ${son} y nadie lleva cartel: pregunta por Aro.`
  },
  km: (n: number) => `${n} km`,
  min: (n: number) => `${n} min`,
  nivel: (n: string) => `nivel ${n}`,
}

export const tarde = {
  titulo: '¿Cuánto te falta?',
  nota: (esMesa: boolean) => `Se lo decimos a${esMesa ? ' la mesa' : 'l grupo'}. Nadie se queda mirando la puerta.`,
  opciones: [
    { texto: '10 minutos', minutos: 10 },
    { texto: '20 minutos', minutos: 20 },
    { texto: 'Media hora', minutos: 30 },
  ],
  avisar: (esMesa: boolean, avisando: boolean) => (avisando ? 'Avisando…' : `Avisar a${esMesa ? ' la mesa' : 'l grupo'}`),
  cancelar: 'Cancelar',
  avisado: (minutos: number) => `Avisamos que llegas ${minutos === 30 ? 'media hora' : `${minutos} minutos`} tarde`,
  calma: 'Ya lo saben. Ve con calma.',
  noPudimos: 'No pudimos avisar. Inténtalo otra vez.',
  sinRed: 'No pudimos avisar. Revisa tu conexión.',
}

export const pasada = {
  sello: 'ANOCHE',
  titulo: '¿Qué tal estuvo?',
  bajada: (esMesa: boolean, sitio: string, unidad: string, numero: string) =>
    `${esMesa ? 'Cenaste en ' : 'Estuviste en '}${sitio}, ${unidad} ${numero}. Lo que nos cuentes entra en el emparejamiento de la próxima, y nadie más lo ve.`,
  pensado: 'Pensado para cenas. Un café o una salida de movimiento se van a preguntar distinto más adelante.',
  laMesa: '¿Qué tal la mesa que armamos para ti?',
  /** De mejor a peor, como los botones: el servidor da la vuelta (`notaDesdeIndice`). */
  escalaMesa: ['Excelente', 'Bien', 'Regular', 'Mala'],
  elSitio: '¿Qué tal el sitio?',
  escalaSitio: ['Excelente', 'Bien', 'Regular', 'Mal'],
  filasSitio: [
    { clave: 'ambiente', nombre: 'Ambiente' },
    { clave: 'servicio', nombre: 'Servicio' },
    { clave: 'conversar', nombre: 'Se podía conversar' },
    { clave: 'comida', nombre: 'Comida' },
  ] as const,
  volverias: '¿Volverías a Aro Club?',
  si: 'Sí, volvería',
  no: 'No, no volvería',
  noCoincidir: '¿Alguien con quien preferirías no volver a coincidir?',
  notaBloquear: (v: Voz) =>
    `Opcional. No se le avisa a nadie, y no es una queja: si nadie te chocó, déjalo así. Solo deja de salir en ${v.tu}s ${v.unidades}.`,
  bloqueadaPorReporte: 'Bloqueada por tu reporte',
  enviar: (enviando: boolean) => (enviando ? 'Enviando…' : 'Enviar'),
  ahoraNo: 'Ahora no',
  noGuardado: 'No pudimos guardarlo. Vuelve a intentarlo.',
  anotado: 'Anotado, gracias.',
  resumen: (bloqueados: number) =>
    bloqueados
      ? `Entra en tu próxima mesa. ${bloqueados === 1 ? 'La persona que marcaste no volverá' : 'Las personas que marcaste no volverán'} a coincidir contigo.`
      : 'Entra en el emparejamiento de tu próxima mesa.',
  volver: 'Volver al inicio',
}

export const reporte = {
  abrir: '¿Pasó algo grave? Reportarlo',
  titulo: '¿Qué pasó?',
  nota: 'Lo lee una persona hoy mismo. Quien acumula reportes sale del club.',
  sobreQuien: 'SOBRE QUIÉN',
  quePaso: 'QUÉ PASÓ',
  /** El texto ES lo que se guarda (`motivo`, máx. 60): no cambiarlo sin hablar con el servidor. */
  motivos: ['Comentarios sobre el cuerpo o insistencia', 'No aceptó un no', 'Vino a vender o a reclutar', 'No era quien decía ser', 'Otra cosa'],
  aviso: (nombre: string | null) =>
    nombre
      ? `Al enviarlo, ${nombre} deja de coincidir contigo para siempre. No se le avisa de que fuiste tú.`
      : 'Quien reportes deja de coincidir contigo para siempre. No se le avisa de que fuiste tú.',
  boton: (enviando: boolean, quien: boolean, motivo: boolean) =>
    enviando ? 'Enviando…' : quien && motivo ? 'Enviar el reporte' : !quien ? 'Elige sobre quién' : 'Elige qué pasó',
  cancelar: 'Cancelar',
  noRegistrado: 'No pudimos registrarlo. Vuelve a intentarlo.',
  enviado: 'Reporte enviado',
  resumen: (nombre: string) =>
    `Reportaste a ${nombre}, así que ya no volverá a coincidir contigo. Lo lee una persona hoy y te escribimos cuando esté revisado.`,
}

export const sinRespuesta = {
  cargar: 'No pudimos cargar tu mesa. Revisa tu conexión e inténtalo otra vez.',
  reintentar: 'Reintentar',
}

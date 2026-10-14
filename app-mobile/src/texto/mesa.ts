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
  /** `numero` vacío cuando es la única mesa del sitio: entonces no se nombra. */
  llegada: (esMesa: boolean, numero: string, total: number) => {
    const letras = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
    const son = letras[total] ?? String(total)
    return esMesa
      ? `Di que vas a la mesa de Aro${numero ? `, la ${numero}` : ''}. Está reservada a tu nombre y el restaurante ya sabe que son ${son}.`
      : `Busca al grupo${numero ? ` ${numero}` : ''} de Aro en el punto de encuentro. Son ${son} y nadie lleva cartel: pregunta por Aro.`
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
    `${esMesa ? 'Cenaste en ' : 'Estuviste en '}${sitio}${numero ? `, ${unidad} ${numero}` : ''}. Lo que nos cuentes entra en el emparejamiento de la próxima, y nadie más lo ve.`,
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

/**
 * El guion de la mesa (copy aprobado por Michael el 14-10-2026). Provisional
 * con los componentes del sistema hasta que Design entregue
 * (`Design/BRIEF-anfitrion.md`). Genérico: momentos, no horas fijas ni bares,
 * y nada de «noche»: no siempre es de noche.
 */
export const guion = {
  titulo: 'Paso a paso',
  bajada: 'Una guía, no un horario. Cada mesa va a su ritmo.',
  momentos: {
    llegada: { nombre: 'Mientras llegan', texto: (limite: string) => `Pidan algo de tomar si quieren. Esperamos a todos hasta ${/^1:/.test(limite) ? 'la' : 'las'} ${limite}${limite.endsWith('.') ? '' : '.'}` },
    voz: { nombre: 'La voz de Aro', texto: () => 'Antes de pedir, elijan a alguien que vaya leyendo en voz alta cada momento de esta lista. Si nadie se ofrece, le toca a quien llegó de último.' },
    pedir: { nombre: 'A pedir', texto: () => 'Falte quien falte, pidan la comida. Quien llegue después se suma sin problema.' },
    vuelta: { nombre: 'Una vuelta rápida', texto: () => 'Tu nombre y qué haces cuando no trabajas.' },
    hielo: { nombre: 'Para romper el hielo', texto: () => 'Mientras llega la comida, la primera ronda del juego.' },
    tema: { nombre: 'Si se acaba el tema', texto: () => 'Sigan con el juego donde lo dejaron. Se puede pasar.' },
    cuenta: { nombre: 'Lo último y la cuenta', texto: () => 'Pidan lo último que les provoque y luego la cuenta, cada quien lo suyo. Puede haber otra reserva esperando la mesa.' },
    despedida: { nombre: 'Despedida', texto: () => 'Si hay ganas de seguir, busquen un sitio cerca. Si alguien te cayó bien, díselo.' },
  } as Record<string, { nombre: string; texto: (limite: string) => string }>,
  ahora: 'AHORA',
  /** Los sitios para seguir que operación eligió para ese local (14-10). */
  seguir: {
    titulo: 'Si quieren seguir',
    aPie: (min: number) => `${min} min a pie`,
    comoLlegar: 'Cómo llegar',
  },
}

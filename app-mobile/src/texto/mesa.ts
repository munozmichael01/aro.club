import { reglas } from '../reglas'
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

/** La voz de un formato (`reglas.vozDe`): «mesa» o «grupo», y «cenas», «la cena», «esta noche»… según de qué sea. */
type Voz = Record<string, string>

const Mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)


/** Cuántos son, en letra. Hasta 22: `seats_per_table` llega a 20 y la mesa se estira +2 (24-10). */
const EN_LETRA = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuna', 'veintidós']


export const vacia = {
  revision: {
    sello: 'EN REVISIÓN',
    titulo: 'Estamos revisando tu cédula.',
    bajada: 'Lo mira una persona, no un programa. Suele estar en menos de 24 horas y te avisamos por correo en cuanto esté.',
    nota: 'Mientras tanto no tienes que hacer nada. En cuanto te verifiquemos podrás apartar puesto en la próxima fecha.',
  },
  /**
   * `sin-mesa` es DESPUÉS de la revelación y sin mesa (17-10, como la web):
   * la espera de antes es `cerrada`. La bajada no culpa a la persona; la
   * primera versión sí, y Michael la tumbó.
   */
  sinMesa: {
    sello: 'ESTA VEZ NO',
    titulo: 'Esta vez no entraste.',
    bajada: 'No salió una mesa en la que encajaras: los grupos se arman por zona, por días y por edad, y esta vez no cuadró.',
    nota: 'Tu crédito volvió entero a tu cuenta y no caduca: la próxima fecha la pagas con él.',
    /** El abono no está (17-10: cinco personas leyeron que había vuelto y no). */
    notaSinAbono: 'Tu crédito sigue descontado. Lo estamos arreglando hoy mismo: si no lo ves de vuelta esta tarde, escríbenos.',
    accion: 'Apuntarme a la próxima',
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
  /** `vasCon` sale de `vozDe` (reglas.js): «Cenas con…» solo si de verdad se cena. */
  nota: (vasCon: string) => `${vasCon} Te avisamos por correo en cuanto se abra.`,
}

export const cancelar = 'Cancelar mi puesto'

export const abierta = {
  sello: 'ABIERTO',
  queSeHace: 'QUÉ SE HACE',
  selloReserva: (esMesa: boolean) => (esMesa ? 'Reserva a tu nombre' : 'Punto de encuentro'),
  comoLlegar: 'Cómo llegar',
  vozTarde: 'Voy tarde',
  sinSector: 'Sin sector',
  /** Quien se sentó después de la revelación (16-10), igual que la web. */
  seUnio: 'se sumó después',
  notaCompaneros: (esMesa: boolean) =>
    `Todos con identidad verificada. No hay fotos ni apellidos: eso lo cuenta cada quien ${esMesa ? 'en la mesa' : 'sobre la marcha'} si quiere.`,
  alLlegar: 'Al llegar',
  /** `numero` vacío cuando es la única mesa del sitio: entonces no se nombra. */
  llegada: (esMesa: boolean, numero: string, total: number) => {
    const son = EN_LETRA[total] ?? String(total)
    return esMesa
      ? `Di que vas a la mesa de Aro${numero ? `, la ${numero}` : ''}. Está reservada a tu nombre y el restaurante ya sabe que son ${son}.`
      : `Busca al grupo${numero ? ` ${numero}` : ''} de Aro en el punto de encuentro. Son ${son} y nadie lleva cartel: pregunta por Aro.`
  },
  km: (n: number) => `${n} km`,
  min: (n: number) => `${n} min`,
  nivel: (n: string) => `nivel ${n}`,
}

/** «¿Te podemos grabar?» (16-10), palabra por palabra de la web. */
export const grabacion = {
  cinta: 'HOY, EN LA ZONA',
  titulo: '¿Te podemos grabar?',
  /** `cuando` y `elPlan` salen de la voz del formato: en la cena, «Esta noche…» y «la cena», como siempre. */
  cuerpo: (v: Voz) => `${Mayus(v.cuando)} estamos grabando contenido por la zona. Si dices que no, no te grabamos y no pasa nada: ${v.elPlan} es igual.`,
  si: 'Sí, pueden',
  no: 'No, gracias',
  guardando: 'Guardando…',
  pie: (v: Voz) => `Puedes cambiarlo cuando quieras, también en ${v.elPlan}.`,
  cerrar: 'Ahora no',
  dijisteSi: 'Dijiste que sí te podemos grabar.',
  dijisteNo: 'Dijiste que prefieres no salir en cámara.',
  cambiarlo: 'Cambiarlo',
  noGuardado: 'No pudimos guardarlo. Vuelve a intentarlo.',
}

/** «Hubo ajustes de última hora» (16-10), palabra por palabra de la web. */
export const ajustes = {
  titulo: 'Hubo ajustes de última hora',
  teMovimos: 'Te cambiamos de mesa esta tarde y te lo escribimos por correo. Esto es lo que vale: el sitio y la gente de abajo.',
  cancelYSuma: (cuantos: string) => `Alguien canceló hoy y movimos a otra persona a tu mesa, que va marcada abajo. Son ${cuantos}.`,
  seSuma: 'Se suma alguien que no estaba esta mañana, y va marcado abajo. Lo demás no cambia.',
  cancelo: (cuantos: string, v: Voz) => `Alguien canceló después de decirte con quién ${v.verboPasado}. Son ${cuantos}, y el sitio y la hora no cambian.`,
  enLetra: EN_LETRA,
  entendido: 'Entendido',
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
  /**
   * Cuándo fue, y no «ANOCHE» a secas: la encuesta ya no caduca a las 48 h
   * (8dc6b47) y aquí puede caer una cena de hace un mes. Como la web.
   */
  /** `ayer` sale de la voz: «ANOCHE» en la cena, «AYER» en un brunch. */
  sello: (dias: number | null, numero?: number | string, mes?: string, ayer = 'ANOCHE') =>
    dias == null ? 'TU ÚLTIMA MESA' : dias <= 1 ? ayer : dias < 7 ? `HACE ${dias} DÍAS` : numero != null && mes ? `EL ${numero} DE ${mes.toUpperCase()}` : 'TU ÚLTIMA MESA',
  titulo: '¿Qué tal estuvo?',
  /** `estuviste` sale de `vozDe` (reglas.js): «Cenaste en» / «Estuviste en». */
  bajada: (estuviste: string, sitio: string, unidad: string, numero: string) =>
    `${estuviste} ${sitio}${numero ? `, ${unidad} ${numero}` : ''}. Lo que nos cuentes entra en el emparejamiento de la próxima, y nadie más lo ve.`,
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
  /** Del sitio, así que va con las del sitio y antes del texto libre (17-10). */
  gasto: '¿Cuánto gastaste?',
  notaGasto: (precio: string) => `Sin contar los ${precio} de tu plaza. Opcional, y sirve para elegir mejor el sitio la próxima vez.`,
  /** [texto, punto medio]: se manda el punto medio, no el índice. De `reglas.js`, como la web y el panel (27-10). */
  tramosGasto: reglas.TRAMOS_GASTO,
  noRepetir: (marcado: boolean) => (marcado ? 'No me mandes más a este sitio ✓' : 'No me mandes más a este sitio'),
  notaNoRepetir: 'Es tuyo y lo puedes quitar en tu perfil. Caben dos sitios a la vez.',
  comentario: '¿Algo que quieras destacar o contarnos?',
  notaComentario: 'Lo lee el equipo, no la mesa. Opcional, como todo lo demás.',
  comentarioEjemplo: 'Lo que quieras',
  noCoincidir: '¿Alguien con quien preferirías no volver a coincidir?',
  notaBloquear: (v: Voz) =>
    `Opcional. No se le avisa a nadie, y no es una queja: si nadie te chocó, déjalo así. Solo deja de salir en ${v.tu}s ${v.unidades}.`,
  bloqueadaPorReporte: 'Bloqueada por tu reporte',
  enviar: (enviando: boolean) => (enviando ? 'Enviando…' : 'Enviar'),
  ahoraNo: 'Ahora no',
  saltando: 'Un momento',
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
  titulo: reglas.GUION.titulo,
  bajada: reglas.GUION.bajada,
  ahora: reglas.GUION.ahora,
  /** Los sitios para seguir que operación eligió para ese local (14-10). */
  seguir: {
    titulo: reglas.GUION.seguir.titulo,
    aPie: (min: number) => reglas.GUION.seguir.aPie.replace('{n}', String(min)),
    comoLlegar: reglas.GUION.seguir.comoLlegar,
  },
}

/**
 * Mi mesa de una cena, calcada de la entrega 20 (Design, 15-10-2026): la
 * tarjeta de la mesa con la foto de la entrada y tres tarjetas que se
 * despliegan.
 */
export const cena = {
  sello: { antes: 'ABIERTO', curso: 'EN CURSO', terminada: 'TERMINADA' } as Record<'antes' | 'curso' | 'terminada', string>,
  mesa: 'MESA',
  alLlegarFoto: 'AL LLEGAR · BUSCA ESTA ENTRADA',
  alLlegar: 'AL LLEGAR',
  diLaMesa: (numero: string) => (numero ? `Di que vas a la mesa de Aro, la ${numero}.` : 'Di que vas a la mesa de Aro.'),
  fotoEntrada: (sitio: string) => `La entrada de ${sitio}`,
  conQuien: {
    titulo: (v: Voz) => `Con quién ${v.verbo}`,
    resumen: (n: number) => (n === 1 ? '1 persona · verificada' : `${n} personas · todas verificadas`),
  },
  paso: {
    titulo: 'Paso a paso',
    resumenAntes: (n: number, desde: string, hasta: string) => `${n} momentos · de ${desde} a ${hasta}`,
    resumenAhora: (momento: string) => `Ahora: ${momento}`,
    resumenSitios: (momento: string, n: number) => `Ahora: ${momento} · ${n} ${n === 1 ? 'sitio' : 'sitios'} para seguir`,
  },
  abrir: (titulo: string) => `Abrir ${titulo}`,
  cerrar: (titulo: string) => `Cerrar ${titulo}`,
}

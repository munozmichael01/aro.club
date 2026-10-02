/**
 * El texto de Pago, copiado de `Pago.dc.html` (casilla B de
 * TEXTO-tres-superficies). Métodos, datos de cuenta, montos y tasa vienen
 * del servidor (`/api/pago`); los días, de `texto/fechas.ts`.
 *
 * Cambios frente a la web (§6 bis, 2):
 * - «A las doce del mediodía se abre todo» (listo y cupón) → `cuandoSeSabe`
 *   si el servidor manda `revelaEn`; si no, «En cuanto se abra tu mesa».
 */

const Mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const elegir = {
  titulo: 'Tu puesto.',
  bajada: 'Se paga en bolívares a la tasa oficial del día. El crédito no caduca.',
  unPuesto: 'Un puesto',
  tasaBcv: 'Tasa BCV',
  tasaDeHoy: 'Tasa BCV de hoy',
  tasaDel: (dia: number, mes: string) => `Tasa BCV del ${dia} de ${mes}`,
  unUsd: (bs: string) => `1 USD = ${bs}`,
  sinTasa: 'Sin tasa de hoy',
  total: 'Total a pagar',
  consumo: 'Esto no incluye tu consumo. La comida y la bebida las pagas en el restaurante, como en cualquier salida.',
  comoPagas: 'CÓMO PAGAS',
  pronto: 'PRONTO',
  todaviaNo: ' Todavía no está disponible.',
  notas: {
    pm: 'En bolívares, desde tu banco. Lo más usado.',
    zelle: 'En dólares, si tienes cuenta en Estados Unidos.',
    bizum: 'En euros, si estás en España.',
    debito: 'Se cobra de tu cuenta sin salir de aquí.',
    tarjeta: '',
  } as Record<string, string>,
  irDatos: (manual: boolean, nombre: string) => (manual ? 'Ver los datos para pagar' : `Pagar con ${nombre.toLowerCase()}`),
  cancelas: 'Cancelas con más de 24 horas y recuperas el crédito completo. Con menos, se pierde: la mesa ya está armada.',
}

export const cupon = {
  pregunta: '¿Tienes un código de invitación?',
  etiqueta: 'TU CÓDIGO',
  ejemplo: 'CÓDIGO',
  aplicar: (aplicando: boolean) => (aplicando ? 'Aplicando' : 'Aplicar'),
  nota: 'Si el código cubre tu puesto, no tienes que pagar nada: queda confirmado aquí mismo.',
  noPudimos: 'No pudimos aplicar el código.',
  sinRed: 'No pudimos aplicar el código. Revisa tu conexión.',
}

export const selloApartado = 'TU PUESTO SE APARTA AL REPORTAR EL PAGO'

export const datos = {
  titulo: (manual: boolean) => (manual ? 'Paga y vuelve aquí.' : 'Paga sin salir de aquí.'),
  bajada: (manual: boolean, id: string, nombre: string) =>
    manual
      ? id === 'pm'
        ? 'Sales de Aro, haces el pago móvil desde tu banco y vuelves con la referencia. Guardamos el sitio mientras tanto.'
        : `Sales de Aro, haces el envío por ${nombre} y vuelves a reportarlo. Guardamos el sitio mientras tanto.`
      : 'Con los mismos datos de tu pago móvil. Tu banco te manda un código y el cobro sale de tu cuenta.',
  pruebaTitulo: 'Esta cuenta es de prueba. No envíes dinero.',
  pruebaCuerpo:
    'Estamos probando el sistema y estos datos son inventados. Puedes seguir el recorrido y reportar el pago igual: sirve para probar, y nadie va a cobrarte nada.',
  etiqueta: (nombre: string) => `DATOS PARA ${nombre.toUpperCase()}`,
  copiar: 'Copiar',
  copiado: 'Copiado',
  irReportar: (manual: boolean) => (manual ? 'Ya pagué, lo reporto' : 'Continuar'),
  cambiarMetodo: 'Cambiar de método',
}

export const faltaVerificar = {
  sello: 'FALTA VERIFICAR',
  titulo: 'Verifica tu identidad y apartas el puesto.',
  bajada:
    'Sin verificar no podemos sentarte, así que tampoco te cobramos: es lo que hace que los otros cinco se sienten con alguien. Son la cédula y una selfie, lo mira una persona y suele estar el mismo día.',
  verificar: 'Verificar mi identidad',
  volver: 'Volver a mi cuenta',
}

export const reporte = {
  titulo: (manual: boolean) => (manual ? 'Reporta tu pago.' : 'Confirma el cobro.'),
  bajada: (manual: boolean) =>
    manual
      ? 'Con esto una persona cuadra tu pago con el del banco. Suele estar listo en menos de una hora.'
      : 'Tu banco confirma el cobro. No hace falta que reportes nada después.',
  pistas: {
    tel: { '+58': '4141234567', '+34': '611223344' } as Record<string, string>,
    doc: '12345678',
    ref: 'Últimos 6 dígitos',
    titular: 'Como aparece en tu banco',
    contacto: 'tu@correo.com',
    otp: '000000',
  } as Record<string, string | Record<string, string>>,
  notas: {
    ref: 'La que te dio el banco al confirmar.',
    contacto: 'Tiene que ser el que usaste en Zelle.',
    otp: 'Tu banco te lo manda por SMS. Solo se cobra al confirmar.',
  } as Record<string, string>,
  elegirBanco: 'Elige tu banco',
  fecha: { dia: 'DÍA', mes: 'MES', anio: 'AÑO', ejemploDia: 'DD', ejemploAnio: 'AAAA' },
  fechaFutura: 'Un pago no se reporta antes de hacerlo: esa fecha todavía no ha llegado.',
  captura: (obligatoria: boolean) => (obligatoria ? 'Captura del pago' : 'Captura del pago · opcional'),
  capturaTitulo: (subiendo: boolean, adjunta: boolean) => (subiendo ? 'Subiendo la captura…' : adjunta ? 'Captura adjunta' : 'Adjuntar captura'),
  capturaNota: (subiendo: boolean, adjunta: boolean, obligatoria: boolean, nombre: string) =>
    subiendo ? 'Un momento' : adjunta ? 'Toca para cambiarla' : obligatoria ? `Obligatoria para ${nombre}` : 'Acelera la revisión',
  noSubida: 'No pudimos subir la captura.',
  noSubidaRed: 'No pudimos subir la captura. Revisa tu conexión.',
  boton: (p: { ok: boolean; manual: boolean; camposOk: boolean; falta: string | null; faltaLetra: boolean }) =>
    p.ok
      ? p.manual
        ? 'Reportar mi pago'
        : 'Confirmar y pagar'
      : p.camposOk
        ? 'Adjunta la captura'
        : p.falta
          ? `Falta ${p.falta.toLowerCase()}`
          : p.faltaLetra
            ? 'Elige si tu documento es V o E'
            : 'Falta algo',
  verOtraVez: 'Ver los datos otra vez',
  nota: (manual: boolean) =>
    manual
      ? 'Lo revisa una persona. Si algo no cuadra te escribimos, y tu puesto sigue apartado mientras tanto.'
      : 'Se cobra al confirmar. Si cancelas con margen, vuelve a tu cuenta sola.',
  noRegistrado: 'No pudimos registrar tu pago.',
}

export const enviando = {
  titulo: (manual: boolean) => (manual ? 'Enviando tu reporte.' : 'Confirmando el cobro.'),
  noCierres: 'No cierres esta pantalla. Suele tardar unos segundos.',
}

export const pendiente = {
  sello: 'PENDIENTE DE CONFIRMAR',
  titulo: 'Tu pago está en revisión.',
  bajada: 'Recibimos el reporte. Una persona lo cuadra con el banco, normalmente en menos de una hora. ',
  bajadaEnfasis: 'Tu puesto ya está apartado',
  bajadaFin: ' mientras tanto.',
  quePasa: 'QUÉ PASA AHORA',
  pasos: [
    { tono: 'hecho', titulo: 'Tu puesto está apartado', cuerpo: 'Nadie más lo puede tomar. No hace falta que hagas nada más.' },
    { tono: 'ahora', titulo: 'Lo cuadramos con el banco', cuerpo: 'Una persona compara tu reporte con el movimiento real. Menos de una hora en horario normal.' },
    { tono: 'luego', titulo: 'Te avisamos al confirmarlo', cuerpo: 'Te llega un correo y un aviso en la app. Ahí tu reserva pasa a confirmada.' },
  ] as const,
  loQueReportaste: 'LO QUE REPORTASTE',
  irCuenta: 'Ir a mi cuenta',
  algoNoCuadra: 'Algo no cuadra',
}

/** Con la revelación, «El sábado a mediodía se abre todo…»; sin ella, sin hora (no se inventa). */
const seAbreTodo = (cuando: string | null) =>
  cuando
    ? `${Mayus(cuando)} se abre todo: el sitio, la dirección, tu número de mesa y quiénes son los otros cinco.`
    : 'En cuanto se abra tu mesa ves el sitio, la dirección, tu número de mesa y quiénes son los otros cinco.'

export const listo = {
  sello: 'PAGO CONFIRMADO',
  titulo: (dia: string | null, numero: number | null) => (dia && numero ? `Nos vemos el ${dia} ${numero}.` : 'Nos vemos.'),
  bajada: (cuando: string | null) => `Cuadramos tu pago con el banco y tu puesto está confirmado. ${seAbreTodo(cuando)}`,
  comprobante: 'COMPROBANTE',
  porCorreo: 'Te lo mandamos también por correo. Guárdalo: es lo que necesitas si algo no cuadra.',
  irCuenta: 'Ir a mi cuenta',
  verReserva: 'Ver mi reserva',
}

export const cuponListo = {
  sello: 'PUESTO APARTADO',
  titulo: 'Listo. Tu puesto es tuyo.',
  bajada: (cuando: string | null) => `Tu código cubre la plaza, así que no tienes que pagar nada ni reportar ningún pago. ${seAbreTodo(cuando)}`,
  consumo: 'Lo que consumas en la mesa va aparte y lo pagas en el restaurante, como en cualquier salida.',
}

export const cerrada = {
  sello: 'FECHA CERRADA',
  titulo: 'Esta fecha ya cerró.',
  bajada: 'Cerramos las apuntadas antes de la cena para armar las mesas. No te cobramos nada: elige otra fecha.',
  otraFecha: 'Ver otras fechas',
}

export const fallo = {
  sello: 'EL PAGO NO CUADRA',
  titulo: 'No encontramos tu pago.',
  bajada: 'Revisamos el banco con los datos que nos diste y no aparece. No te cobramos nada y tu puesto sigue apartado veinticuatro horas.',
  queHacer: 'Qué puedes hacer',
  salidas: [
    'Revisa la referencia y la fecha: un dígito cambiado es lo que más falla.',
    'Si adjuntaste captura, comprueba que se lea el monto y la fecha.',
    'Si el pago sí salió de tu cuenta, escríbenos y lo resolvemos a mano.',
  ],
  corregir: 'Corregir mi reporte',
  escribirnos: 'Escribirnos',
}

export const comprobante = {
  zona: 'Zona',
  zonaAlAbrirse: 'Se sabe al abrirse',
  metodo: 'Método',
  tasa: 'Tasa aplicada',
  porUsd: (bs: string) => `${bs} por USD`,
  reportaste: 'Reportaste',
  pagado: 'Pagado',
}

export const sinEvento = 'Falta la fecha. Vuelve a Mi cuenta y elige una.'
export const sinRespuesta = { cargar: 'No pudimos cargar el pago. Revisa tu conexión e inténtalo otra vez.', reintentar: 'Reintentar' }

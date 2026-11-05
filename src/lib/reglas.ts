import 'server-only'

// `public/reglas.js` es JavaScript plano a propósito: es EL MISMO fichero
// que carga el navegador con un <script>. Escribirlo en TypeScript obligaría
// a un paso de compilación para el cliente, y ese paso es exactamente donde
// volverían a existir dos copias.
import reglas from '../../public/reglas.js'

/**
 * Las reglas de entrada, del lado del servidor.
 *
 * Lo del navegador es ayuda; esto es la seguridad. Y son el mismo código a
 * propósito: cuando el filtro del cliente y el validador del servidor son
 * copias distintas, divergen —y el resultado fue que Bizum no se podía
 * enviar nunca, porque el campo cortaba a nueve dígitos y el validador
 * exigía diez—.
 */

/** Las cinco familias de «Cómo funciona» (entrega «Qué estás reservando», 02-11). */
type PlanComo = 'cena' | 'brunch' | 'grupo' | 'drinks' | 'coffee'
type PlanPasado = { cuando: string; fue: string; verbo: string; el: string; del: string; ese: string; porque: string }
type Marca = 'edad' | 'masUno' | 'idioma' | 'segundoActo'
type TarjetaComo = {
  clave: 'antes' | 'durante' | 'despues'
  icono: string
  titulo: string
  cuerpo: string
  panel: string
  colorIcono: string
  iconoPlan: string
}
type ColoresCapsula = { fondo: string; color: string; borde: string }
type CapsulaBase = ColoresCapsula & { texto: string; corto: string; icono: string; sobreVerde: ColoresCapsula }
/** La de una fecha: con su texto de verdad («+40») y su clave. */
type Capsula = CapsulaBase & { clave: Marca }
type FechaConHoras = { empiezaEn?: string | null; starts_at?: string | null; revelaEn?: string | null; reveal_at?: string | null; zonaHoraria?: string | null }
/** Lo que traen la agenda y Mi cuenta de cada fecha; también vale una fila de `events`. */
type FechaConMarcas = {
  formato?: string | null
  format?: string | null
  edadMinima?: number | null
  age_band_min?: number | null
  masUno?: boolean | null
  mas_uno?: boolean | null
  idioma?: string | null
  segundoActo?: boolean | null
  after_venue_id?: string | null
  porMesa?: number | null
  seats_per_table?: number | null
  precioUsd?: number | null
  price_usd?: number | string | null
}

type Campo =
  | 'telefonoPerfil'
  | 'telefonoPagoMovil'
  | 'telefonoBizum'
  | 'cedula'
  | 'dia'
  | 'mes'
  | 'anio'
  | 'fechaPago'
  | 'referencia'
  | 'otp'
  | 'banco'
  | 'codigoZelle'
  | 'correo'
  | 'clave'

type Api = {
  filtrar: (campo: Campo, valor: unknown) => string
  valido: (campo: Campo, valor: unknown) => boolean
  campoTelefonoDe: (prefijo: string) => Campo
  primerFallo: (valores: Partial<Record<Campo, unknown>>) => Campo | null
  campoDe: (definicion: { tipo?: string; prefijo?: string; largo?: number }) => Campo | null
  aE164: (valor: unknown) => string
  PRECIO_USD: number
  HORAS_DE_CIERRE: number
  /** Cuánto antes hay que avisar de que no vienes, o cambiarse de fecha. */
  HORAS_DE_MARGEN: number
  /** El arraigo dicho de otro, para ponerlo al lado de su nombre. */
  ARRAIGO_EN_LA_MESA: Record<string, string>
  arraigoDe: (codigo: unknown) => string
  cierreDe: (inicioIso: string) => string | null
  textoCierre: (inicioIso: string, zona?: string, cierreIso?: string) => string
  DIAS_GUARDA_FOTOS: number
  MAX_TEXTO: number
  precioTexto: () => string
  COCINAS: string[][]
  /** Los tramos de la encuesta, como pares [texto, punto medio]. */
  TRAMOS_GASTO: (string | number)[][]
  /** Del punto medio guardado al tramo que se pulsó, ya con su unidad. */
  tramoDeGasto: (usd: unknown) => string | null
  BANCOS: { codigo: string; nombre: string }[]
  REGLAS: Record<Campo, { etiqueta: string; ayuda?: string }>
  vozDe: (formato: string | null | undefined) => {
    unidad: string; unidades: string; Unidad: string; Unidades: string
    art: string; Art: string; esta: string; tu: string; La: string; el: string
    sitio: string; Sitio: string; sitioCorto: string
    sentados: string; juntarse: string; mia: string; TU: string
    /** «CON QUIÉN CENAS» solo si de verdad se cena; si no, «CON QUIÉN VAS». */
    conQuien: string
    /** «Cenaste en» / «Estuviste en», para la mesa de después. */
    estuviste: string
    /** Con quién es el plan, mientras la mesa está cerrada. */
    vasCon: string
    /** «cenas» o «vas», para las frases que se arman por trozos. */
    verbo: string
    /** «de la cena» / «del brunch» / «del plan». */
    delPlan: string
    /** «la cena» / «el brunch» / «el plan». */
    elPlan: string
    /** «esta noche» / «hoy», para la grabación. */
    cuando: string
    /** «cenabas» / «ibas», para «con quién ibas». */
    verboPasado: string
    /** «ANOCHE» / «AYER», para el sello de la encuesta. */
    ayer: string
  }
  NOMBRES_DE_FORMATO: Record<string, string>
  /** Las cinco de la agenda pública, como pares [pregunta, respuesta]. */
  FRECUENTES_AGENDA: string[][]
  /** Las opciones son pares [texto, código], y el código manda. */
  PUERTA: Record<string, { clave: string; pregunta: string; opciones: (string | null)[][] }>
  ZONA: string
  MESES: string[]
  HORAS_EN_LETRA: string[]
  horaEnLetra: (horas: number, minutos: number) => string
  horaEnLetraDe: (iso: string | null | undefined, zona?: string) => string
  JUEGO: {
    porRonda: number
    abreMin: number
    cierraMin: number
    reglas: string[]
    final: string
    rondas: { clave: string; titulo: string; bajada: string; preguntas: string[] }[]
  }
  // Con `zona`: la buena es la de la ciudad de cada fecha, y sin el parametro
  // en el tipo no habia forma de pedirla desde el servidor sin un cast.
  diaDe: (iso: string | null | undefined, zona?: string) => string | null
  revelaDe: (
    inicioIso: string | null | undefined,
    zona?: string,
    revelaIso?: string | null,
  ) => { cuando: string; mismoDia: boolean; dia: string; hora: string; enLetra: string } | null
  /** «El día de la cena, al mediodía» / «La víspera, a las seis de la tarde». */
  cuandoSeRevela: (
    inicioIso: string | null | undefined,
    zona?: string,
    revelaIso?: string | null,
    formato?: string | null,
  ) => string
  /** Las tres tarjetas de «Cómo funciona», compartidas con la app. */
  COMO_FUNCIONA: {
    titulo: string
    fila: { titulo: string; bajada: string }
    filaMesa: { titulo: string; bajada: string }
    siguiente: string
    entendido: string
    etiquetas: Record<'antes' | 'durante' | 'despues', string>
    iconos: Record<'antes' | 'durante' | 'despues', string>
    primeraVez: { sello: (plan: string) => string; titulo: string; tituloDia: string }
    pie: (miMesa: string) => string
    cuentaDe: (i: number, n: number) => string
    tarjetas: (tipo: PlanComo, cuando: string) => TarjetaComo[]
    /** Las tres de UNA fecha, con lo que cambian sus marcas (02-11). */
    tarjetasDe: (fecha: FechaConMarcas, cuando: string) => (TarjetaComo & { marca: string })[]
    tipoDe: (formato: string | null | undefined) => 'cena' | 'brunch' | 'grupo'
    /** `tipoDe` con drinks y coffee. */
    planDe: (formato: string | null | undefined) => PlanComo
  }
  ICONOS_PLAN: Record<PlanComo, string>
  ORDEN_MARCAS: Marca[]
  MARCAS: Record<Marca, { capsula: CapsulaBase; que: string; hoja: string; web: string }>
  IDIOMAS_DE_MESA: Record<string, { frase: string; capsula: string }>
  marcasDe: (fecha: FechaConMarcas) => Marca[]
  capsulaDe: (clave: Marca, fecha?: FechaConMarcas) => Capsula | null
  capsulasDe: (fecha: FechaConMarcas) => Capsula[]
  lineasDeHoja: (fecha: FechaConMarcas) => { clave: Marca; capsula: Capsula | null; texto: string }[]
  /** «Una cena en inglés a la que vienes con alguien, y toda la mesa llega de dos en dos.» */
  fraseDelPlan: (fecha: FechaConMarcas) => string
  /** «Mesa de 4 a 8 personas» · «Grupo de 4 a 8 personas» · «De dos a cuatro dúos». */
  tamanoDelPlan: (fecha: FechaConMarcas) => string
  /** «10 ref» · «10 ref c/u». */
  precioDelPlan: (fecha: FechaConMarcas) => string
  botonDelPlan: (fecha: FechaConMarcas) => string
  /** Lo que pasa si cancelas: «Cancelas con más de 24 horas…». */
  cancelaDelPlan: (fecha: FechaConMarcas) => string
  notaDelPlan: (fecha: FechaConMarcas & FechaConHoras, zona?: string) => string
  cubreDelPlan: (fecha: FechaConMarcas) => string
  lineaDeCierre: (inicioIso: string, zona?: string, cierreIso?: string | null, ahora?: number) => { texto: string; cerrada: boolean }
  pruebaSocial: (n: number, fecha: FechaConMarcas) => string
  /** Cómo se nombra un plan que ya pasó (encuesta y seguir en contacto). */
  pasadoDe: (formato: string | null | undefined) => PlanPasado
  DE_MESA_COMPLETA: string[]
  tieneMesaCompleta: (formato: string | null | undefined) => boolean
  DE_MANANA: string[]
  esDeManana: (formato: string | null | undefined) => boolean
  /** «Seguir en contacto»: el texto del flujo entero (entrega seguir-en-contacto). */
  CONTACTO: {
    DIAS: number
    nombres: (lista: string[]) => string
    hasta: (cierraIso: string, zona?: string) => string
    quedan: (cierraIso: string, zona?: string, ahora?: number) => string
    quedanCorto: (cierraIso: string, zona?: string, ahora?: number) => string
    plazoDeOtra: (nombre: string, cierraIso: string, zona?: string) => string
    push: {
      coincidencia: (lista: string[]) => { titulo: string; cuerpo: string }
      cruzado: (lista: string[] | string) => { titulo: string; cuerpo: string }
    }
    A: { telefonoFalta: string }
    D: { titulo: string; bajada: string; agenda: string }
    enlaces: { whatsapp: (e164: string) => string; instagram: (u: string) => string; tiktok: (u: string) => string }
  }
  /** «Estás dentro» y lo que se comparte (entrega estas-dentro). */
  DENTRO: {
    titulo: string
    vias: Record<ViaDentro, { sello: string; bajada: string }>
    evento: { titulo: (plan: string) => string; descripcion: (cuando: string) => string }
    mensaje: (inv: { codigo: string; enlace: string; pct: number } | null) => string
    planDe: (formato: string | null | undefined) => string
    conTarjetas: (formato: string | null | undefined) => boolean
    variantes: (conCodigo: boolean, formato?: string | null, masUno?: boolean) => number[]
    tarjetaDe: (formato: string | null | undefined) => 'historia' | 'plan' | null
    tarjetaPlan: (plan: PlanDentro, codigo: string | null) => TarjetaPlanDatos | null
    zonasEnTexto: (z: string[] | null | undefined) => string
    cuandoSeSabe: (revelaIso: string | null | undefined, zona?: string) => string
    diaYNumero: (iso: string | null | undefined, zona?: string) => string
    historia: (plan: PlanDentro, codigo: string | null) => Historia | null
  }
  /** El alta (nacimiento → cuenta → preguntas) y el cierre de la cuenta de un menor. */
  ALTA: {
    cuenta: { bajada: string }
    menor: {
      confirmar: { titulo: string; cuerpo: string; si: string; no: string }
      cerrada: { titulo: string; cuerpo: string }
    }
  }
  /** Las cuentas de Aro en redes (@somos.aroclub). */
  REDES: { instagram: string; tiktok: string; arroba: string }
  /** El precio con el que nace una fecha nueva de ese formato. */
  precioDe: (formato: string | null | undefined) => number
  /** «Segundo acto» (entrega segundo-acto, 03-11): el bar se dice en la mesa, a su hora. */
  CARGA: {
    tiempo: {
      umbral: number; minimoVisible: number; tarda: number; veloTope: number
      transicion: number; escalon: number; tandas: number; latido: number; vueltaAro: number; check: number
    }
    aro: { tamanos: number[]; enciende: number[]; mantiene: number; apaga: number; puntoApagado: number; anillo: number; tuyoSobreVerde: string }
    hueso: { sobreCrema: number; sobreVerde: number; alto: number[] }
    texto: {
      unMomento: string; tarda: string; reintentar: string; volverAIntentar: string
      noPudimos: (que: string) => string
      sinRed: string; esNuestro: string
      franja: (cuando: string) => string
      trabajando: { apartar: string; cancelar: string; cambiar: string; cupon: string; aceptar: string; reembolso: string }
      que: { inicio: string; mesa: string; pasadas: string; pago: string; dentro: string; cancelar: string; cambiar: string; masUno: string; legal: string; reembolso: string }
    }
  }
  SEGUNDO_ACTO: {
    marca: string
    minutosDespues: number
    barEn: (empiezaEn: string | null | undefined) => string | null
    caja: {
      abierta: { titulo: string; texto: string }
      plegada: { titulo: string; texto: string }
      ahora: { sello: string; aPie: string; texto: string; boton: string }
      resumenPaso: string
      resumenPasoAntes: string
    }
    /** `{hora}` con la hora de `horaDe`, sin «p.m..». */
    conHora: (texto: string, hora: string | null | undefined) => string
    conMinutos: (texto: string, n: number) => string
    paso: { nombre: string; texto: string }
    despedida: string
    revelacion: string
    aviso: { titulo: string; cuerpo: string; cuerpoSinMinutos: string; boton: string }
  }
  /** «+1 acompañante» (entrega mas-uno). Los textos, pendientes de que Michael los apruebe. */
  MAS_UNO: {
    nombre: string
    marca: string
    puestos: number
    DUOS: { minimo: number; maximo: number; bueno: number }
    tamanosDeMesas: (n: number) => number[]
    fraseDeDuos: (puestos: number) => string
    avanceDeDuos: (puestos: number) => number
    /** «viernes 6 a medianoche», sin «el». */
    plazo: (cierreIso: string, zona?: string) => string
    conPunto: (t: string) => string
    aviso: { titulo: string; lineas: (plazo: string) => string[]; casilla: string; falta: string }
    mensaje: (inv: { dia: string; hora: string; zonas: string; plazo: string; enlace: string }) => string
    tituloDelEnlace: (nombre: string | null) => string
    vienesCon: (nombre: string | null) => string
    mesa: { tuDuo: string; bajada: (duos: number) => string; pareja: (a: string, b: string) => string }
    correos: Record<CorreoMasUno, (d: DatosCorreoMasUno) => {
      asunto: string; sello: string; bajada: string; boton: string; ruta: string
      push: { titulo: string; cuerpo: string }
    }>
  }
  horaDe: (iso: string | null | undefined, zona?: string) => string | null
  partesDe: (
    iso: string | null | undefined,
    zona?: string,
  ) => {
    dia: string; diaNumero: number; numero: number
    mes: string; mesNumero: number; ano: number; hora: string; horas: number
    /** Los minutos de la hora local. Los devuelve `reglas.js` y faltaban aquí. */
    minutos: number
  } | null
}

/** Los avisos del +1. */
export type CorreoMasUno = 'mas_uno_recordatorio' | 'mas_uno_confirmado' | 'mas_uno_se_bajo' | 'mas_uno_cancelada' | 'mas_uno_sin_puesto'
export type DatosCorreoMasUno = {
  nombre: string | null
  invita: string | null
  plazo: string
  dia: string
  estado: string | null
  enRevision: boolean
  motivo: string | null
}

/** Cómo se llegó a «Estás dentro». */
export type ViaDentro = 'credito' | 'cupon' | 'confirmado' | 'reportado' | 'sinSaber'

/** La fecha de una reserva, con lo que hace falta para contarla. */
export type PlanDentro = {
  empiezaEn: string
  revelaEn: string | null
  zonaHoraria: string
  formato: string | null
  zonas: string[]
  /** Fecha +1: las historias no llevan la tarjeta del código. */
  masUno?: boolean
}

/** Lo que lleva la tarjeta de drinks y café (TarjetaPlan, entrega drinks-cafe). */
export type TarjetaPlanDatos = {
  plan: 'Drinks' | 'Café'
  cafe: boolean
  dia: string
  diaSemana: string
  numero: string
  hora: string
  zona: string
  codigo: string | null
  revelaDia: string
  revelaNum: string
  revelaSufijo: string
  sello: string
  sitioMayus: string
  frase1: string
  frase3: string
  cierre3: string
  titulo4: string
  cuerpo4: string
  frase5: string
  pregunta6: string
}

/** Lo que lleva la tarjeta para historias (TarjetaHistoria de la entrega). */
export type Historia = {
  plan: 'Cena' | 'Brunch'
  brunch: boolean
  dia: string
  diaSemana: string
  numero: string
  hora: string
  zona: string
  codigo: string | null
  revela: string
  revelaNum: string
  revelaSufijo: string
  sello: string
  frase1: string
  frase3: string
  frase6: string
}

const api = reglas as Api

/** «Estás dentro», el mismo texto que la pantalla y la app. */
export const DENTRO = api.DENTRO
/** «Seguir en contacto», el mismo texto en app, web y correos. */
export const CONTACTO = api.CONTACTO
/** El precio con el que nace una fecha nueva, por plan (hoy todos `PRECIO_USD`). */
export const precioDe = api.precioDe
/** El alta: textos de «Crea tu cuenta» y del cierre de la cuenta de un menor. */
export const ALTA = api.ALTA
/** Las cuentas de Aro en redes: lo que firma las tarjetas para historias. */
export const REDES = api.REDES
/** «+1 acompañante», el mismo texto en app, web y correos. */
export const MAS_UNO = api.MAS_UNO

export const SEGUNDO_ACTO = api.SEGUNDO_ACTO
export const CARGA = api.CARGA

export const filtrar = api.filtrar
export const valido = api.valido
export const campoTelefonoDe = api.campoTelefonoDe
export const primerFallo = api.primerFallo
export const campoDe = api.campoDe
export const aE164 = api.aE164
export const REGLAS = api.REGLAS
/** Mesa o grupo, según el formato. La tabla vive en public/reglas.js. */
export const vozDe = api.vozDe
export const pasadoDe = api.pasadoDe

/** Cómo se llama cada formato. Misma tabla para los correos, el panel y la app. */
export const NOMBRES_DE_FORMATO = api.NOMBRES_DE_FORMATO

/** Las cuatro preguntas de antes de tener cuenta, con sus códigos. */
export const PUERTA = api.PUERTA

/**
 * Horas de antelación con que se cierra el apuntarse a una fecha.
 *
 * Vive en `reglas.js` y no aquí: la leen el panel, el copy de la portada, el
 * de Legal, el correo de fecha cancelada y la app. Estaba escrita a mano en
 * `/api/operacion/fechas` y repetida en texto en cuatro sitios más.
 */
export const HORAS_DE_MARGEN: number = api.HORAS_DE_MARGEN
export const ARRAIGO_EN_LA_MESA: Record<string, string> = api.ARRAIGO_EN_LA_MESA
export const arraigoDe = api.arraigoDe.bind(api)
export const HORAS_DE_CIERRE: number = api.HORAS_DE_CIERRE

/**
 * Cuándo cierra una fecha: a medianoche, al empezar su día.
 *
 * La regla entera vive en `reglas.js` con su porqué. Aquí solo se asoma para
 * que el panel la use al abrir una fecha y para que el copy del servidor diga
 * lo mismo que la pantalla.
 */
export const cierreDe = api.cierreDe
export const textoCierre = api.textoCierre

/** Cuántos días guardamos la cédula y la selfie. Ciento veinte. */
export const DIAS_GUARDA_FOTOS: number = api.DIAS_GUARDA_FOTOS

/** Lo más largo que admite una respuesta escrita a mano. */
export const MAX_TEXTO: number = api.MAX_TEXTO
/**
 * El dia y la hora de una fecha, en la zona del producto.
 *
 * Del mismo fichero que los usa el navegador y la app: la hora de una cena
 * no es una regla —sale del evento— y calcularla en tres sitios es como se
 * acaba diciendo «a las siete» donde son las ocho.
 */
/**
 * La zona del producto, para cuando una fecha no tiene ciudad conocida.
 *
 * Se llama POR DEFECTO y no `ZONA` a secas desde que `cities.timezone`
 * existe: la zona buena es la de la ciudad de cada fecha, y esta es solo el
 * respaldo. Con el nombre viejo era fácil escribirla donde tocaba pedir la
 * de la ciudad, que es la trampa que la columna vino a quitar.
 */
export const ZONA_POR_DEFECTO: string = api.ZONA
export const diaDe = api.diaDe
/** «doce», «una», «dos»… por hora del reloj de doce, sin la franja. */
export const HORAS_EN_LETRA = api.HORAS_EN_LETRA
/** Qué formatos llevan la Mi mesa entera: foto, paso a paso, juego y las dos horas. */
export const tieneMesaCompleta = api.tieneMesaCompleta.bind(api)
/** Los que empiezan por la mañana: se revelan la víspera y no llevan bares. */
export const esDeManana = api.esDeManana.bind(api)
/** Cuándo se sabe con quién vas: el mismo día a mediodía, o la víspera a las seis. */
export const revelaDe = api.revelaDe.bind(api)
/** La frase de cuándo se sabe con quién vas, de la fecha y no escrita a mano. */
export const cuandoSeRevela = api.cuandoSeRevela.bind(api)
/** Las tres tarjetas de «Cómo funciona». El mismo texto que lee la app. */
export const COMO_FUNCIONA = api.COMO_FUNCIONA
export const horaDe = api.horaDe
export const partesDe = api.partesDe
export const MESES = api.MESES
/**
 * La hora como se dice en voz alta: «siete y media de la noche».
 *
 * De `reglas.js` y no escrita aquí porque estaba en TRES sitios —la app, los
 * correos y Mi cuenta— y dos de ellos tiraban los minutos: la cena de las
 * 7:30 salía como «siete de la noche» en la portada de la cuenta y en el
 * recordatorio de la mañana.
 */
export const horaEnLetra = api.horaEnLetra
export const horaEnLetraDe = api.horaEnLetraDe
/**
 * El juego de la mesa: el mazo, las rondas y su ventana.
 *
 * Aquí solo para `cierraMin`, del que sale `FIN_CENA`: el juego se cierra
 * cuando la cena se da por terminada, y eso tiene que ser UNA cifra.
 */
export const JUEGO = api.JUEGO
export type { Campo }

/**
 * El precio de un puesto para ENSEÑARLO. La verdad de lo que se cobra es
 * `events.price_usd` de cada fecha; esto es lo que se dice cuando se habla del
 * precio sin una fecha delante, y el respaldo si una fecha no lo trae.
 */
export const PRECIO_USD: number = api.PRECIO_USD

/**
 * Las cinco preguntas de `/agenda`, que no son las de la portada.
 *
 * Las lee la pantalla, para la gente, y esta ruta, para el JSON-LD. `{zonas}`
 * lo rellena quien la pinta con las zonas que de verdad tienen fecha abierta.
 */
export const FRECUENTES_AGENDA: string[][] = api.FRECUENTES_AGENDA
export const precioTexto = api.precioTexto.bind(api)

/** El catálogo de cocinas, uno solo: lo usan el cuestionario y la ficha del local. */
/**
 * Los bancos, de `reglas.js`, que es el catálogo que ya usan pagar y el
 * reembolso. Escribirlo otra vez aquí sería la tercera copia.
 */
export const BANCOS = api.BANCOS

export const COCINAS = api.COCINAS
export const nombreDeCocina = (codigo: string): string => {
  const par = api.COCINAS.find((c) => c[1] === codigo)
  return par ? par[0] : codigo
}

/**
 * Los tramos de gasto de la encuesta, y la vuelta desde lo guardado.
 *
 * `table_feedback.gasto_usd` guarda el punto medio del tramo, así que quien
 * lo lea tiene que traducirlo: un 32 es «25 a 40», y el panel que enseñe 32
 * está inventando una cifra que nadie dio.
 */
export const TRAMOS_GASTO: [string, number][] = api.TRAMOS_GASTO.map(
  (t) => [String(t[0]), Number(t[1])],
)
export const tramoDeGasto = api.tramoDeGasto.bind(api)

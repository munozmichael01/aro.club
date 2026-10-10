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
  precioTexto: () => string
  COCINAS: string[][]
  REGLAS: Record<Campo, { etiqueta: string; ayuda?: string }>
  vozDe: (formato: string | null | undefined) => {
    unidad: string; unidades: string; Unidad: string; Unidades: string
    art: string; Art: string; esta: string; tu: string; La: string; el: string
    sitio: string; Sitio: string; sitioCorto: string
    sentados: string; juntarse: string; mia: string; TU: string
  }
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
  horaDe: (iso: string | null | undefined, zona?: string) => string | null
  partesDe: (
    iso: string | null | undefined,
    zona?: string,
  ) => {
    dia: string; diaNumero: number; numero: number
    mes: string; mesNumero: number; ano: number; hora: string; horas: number
  } | null
}

const api = reglas as Api

export const filtrar = api.filtrar
export const valido = api.valido
export const campoTelefonoDe = api.campoTelefonoDe
export const primerFallo = api.primerFallo
export const campoDe = api.campoDe
export const aE164 = api.aE164
export const REGLAS = api.REGLAS
/** Mesa o grupo, según el formato. La tabla vive en public/reglas.js. */
export const vozDe = api.vozDe

/**
 * Horas de antelación con que se cierra el apuntarse a una fecha.
 *
 * Vive en `reglas.js` y no aquí: la leen el panel, el copy de la portada, el
 * de Legal, el correo de fecha cancelada y la app. Estaba escrita a mano en
 * `/api/operacion/fechas` y repetida en texto en cuatro sitios más.
 */
export const HORAS_DE_CIERRE: number = api.HORAS_DE_CIERRE
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
export const precioTexto = api.precioTexto.bind(api)

/** El catálogo de cocinas, uno solo: lo usan el cuestionario y la ficha del local. */
export const COCINAS = api.COCINAS
export const nombreDeCocina = (codigo: string): string => {
  const par = api.COCINAS.find((c) => c[1] === codigo)
  return par ? par[0] : codigo
}

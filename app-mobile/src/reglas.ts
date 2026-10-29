/**
 * Las reglas de entrada: el MISMO `public/reglas.js` que cargan el
 * navegador y el servidor. Se importa, no se reescribe (PEDIDO §6 bis).
 *
 * Aquí solo van los tipos de lo que la app usa. La lógica no se toca.
 */
import crudo from '../../public/reglas.js'

export type Campo =
  | 'correo'
  | 'clave'
  | 'telefonoPerfil'
  | 'dia'
  | 'mes'
  | 'anio'
  | 'cedula'
  | 'referencia'
  | 'telefonoPagoMovil'
  | 'telefonoBizum'
  | 'fechaPago'
  | 'otp'
  | 'banco'

type Api = {
  filtrar: (campo: Campo, valor: unknown) => string
  valido: (campo: Campo, valor: unknown) => boolean
  REGLAS: Record<Campo, { etiqueta: string; ayuda?: string }>
  PREFIJOS: { codigo: string; pais: string }[]
  partirTelefono: (e164: string) => { prefijo: string; resto: string }
  aE164: (valor: string) => string
  /** «DD/MM/AAAA» → «AAAA-MM-DD», o '' si no cuadra. */
  fechaAISO: (v: string) => string
  /** «AAAA-MM-DD» → «DD/MM/AAAA», o '' si no cuadra. */
  fechaDesdeISO: (v: string) => string
  PRECIO_USD: number
  /** Lo más largo que admite una respuesta escrita (hoy, «¿Dónde trabajas?»). */
  MAX_TEXTO: number
  /** Cuándo cierra una fecha (20-10): las cenas a medianoche al empezar su día; los planes de mañana, a las 5:00 p.m. del día anterior. */
  cierreDe: (inicioIso: string) => string | null
  /** «se cierra a medianoche, cuando empieza el viernes» / «se cierra el sábado a las 5:00 p.m.»: lo mismo en web, app y correos. */
  textoCierre: (inicioIso: string, zona?: string | null) => string
  /** El juego de la mesa (mazo aprobado por Michael, JUEGO.md). */
  JUEGO: JuegoDeMesa
  /** Las `porRonda` preguntas de una ronda, deterministas por mesa: todos los teléfonos de la mesa ven las mismas. `ronda` = índice o clave; `[]` si no existe. */
  preguntasDeRonda: (mesaId: string, ronda: number | string) => string[]
  precioTexto: () => string
  /** La zona del producto. Cuando `cities` tenga su columna, se cambia aquí para web y app. */
  ZONA: string
  /** «sábado»: el nombre del día de una fecha, en `ZONA`. `null` si la fecha no vale. */
  diaDe: (iso: string | null | undefined, zona?: string | null) => string | null
  /** «12:00 p.m.»: la hora de una fecha, en `ZONA`. La misma que usan los correos. */
  horaDe: (iso: string | null | undefined, zona?: string | null) => string | null
  /** «Viernes y sábado»: los días en que caen unas fechas, en orden y sin repetir. `''` sin fechas. */
  diasDe: (fechas: { iso: string; zona?: string | null }[]) => string
  /** «enero» … «diciembre», en minúscula. */
  MESES: string[]
  /** «siete y media de la noche», «7:20 p.m.» con minutos sueltos. */
  horaEnLetra: (horas: number, minutos: number) => string
  /** Las partes de una fecha en la zona que se pase (`zonaHoraria` de esa fecha); sin zona, `ZONA`. */
  partesDe: (iso: string | null | undefined, zona?: string | null) => PartesFecha | null
  /** 0 esta semana · 1 la que viene · 2 más adelante. Lunes a domingo, en la zona de la fecha; el domingo ya es la que empieza. `ahora` opcional (58f40f4). */
  semanaDe: (iso: string, zona?: string | null, ahora?: number) => 0 | 1 | 2
  /** Los días que se guardan la cédula y la selfie tras aprobarse: lo que dice Privacidad (120). Nunca escrito a mano. */
  DIAS_GUARDA_FOTOS: number
  /** Cuántas horas antes hay que avisar para cancelar con crédito o cambiar de fecha (24). No es `HORAS_DE_CIERRE`, aunque hoy valgan igual. */
  HORAS_DE_MARGEN: number
  /** El arraigo dicho de otra persona («Volvió al país»), por código (f8f4cf5). */
  ARRAIGO_EN_LA_MESA: Record<string, string>
  /** Los tramos de gasto de la encuesta, [texto, punto medio]: se guarda el punto medio. Uno para app, web y panel. */
  TRAMOS_GASTO: [string, number][]
  /** Las cuatro preguntas de la puerta, UN sitio para web y app. Opciones como [texto, código]. */
  PUERTA: Record<string, PreguntaPuerta>
  ORDEN_PUERTA: string[]
  /** La puerta entera: la ciudad y, si está abierta, las cuatro (15-10). `abierta` indefinido: aún no lo dijo. */
  pasosDePuerta: (abierta?: boolean) => string[]
  /** Lo que se le dice a quien vive donde todavía no abrimos. */
  CIUDAD_CERRADA: (nombre: string | null | undefined, slug: string) => { titulo: string; bajada: string }
  /** Mesa o grupo según el formato: «Mi mesa» / «Mi grupo», y el resto del vocabulario. */
  /** Los bancos de Venezuela, por código: se guarda el código, que es lo que sale en el movimiento. */
  BANCOS: { codigo: string; nombre: string }[]
  /** Qué regla aplica a un campo de un método de pago (`null`: solo que no esté vacío). */
  campoDe: (definicion: CampoDePago) => Campo | null
  vozDe: (formato: string | null | undefined) => { unidad: 'mesa' | 'grupo'; mia: string } & Record<string, string>
  /** Las cenas: lo que se dice «cenas» y lleva la nota de la encuesta «Pensado para cenas». */
  DE_CENA: string[]
  /** La Mi mesa completa (foto de la entrada, paso a paso, juego): las cenas y el brunch (Michael, 24-10). */
  DE_MESA_COMPLETA: string[]
  tieneMesaCompleta: (formato: string | null | undefined) => boolean
  /** El guion de la mesa (paso a paso), compartido con la web desde el 15-10. */
  GUION: {
    titulo: string
    bajada: string
    ahora: string
    duracionDeLaMesa: number
    momentos: { clave: string; desde: 'inicio' | 'cierre'; min: number; nombre: string; texto: string }[]
    delJuego: Record<string, string>
    seguir: { titulo: string; aPie: string; comoLlegar: string }
  }
  /** Los momentos de esta mesa con su hora puesta, en la zona de la ciudad. `[]` sin hora de inicio. */
  pasosDeLaMesa: (empiezaEn: string | null | undefined, zona?: string | null, formato?: string | null) => PasoDeLaMesa[]
  momentoDeLaMesa: (pasos: PasoDeLaMesa[], ahora: number) => 'antes' | 'curso' | 'terminada'
  /** El índice del primero de los momentos en curso, o -1. */
  enCursoDeLaMesa: (pasos: PasoDeLaMesa[], ahora: number) => number
  /** «7:30 p.m.» → «7:30». */
  horaCorta: (hora: string | null | undefined) => string
}

export type PasoDeLaMesa = { clave: string; en: string; hora: string; nombre: string; texto: string; botonJuego: string }

/** Un campo de un método de pago, tal como lo define `payment_methods.campos`. */
export type CampoDePago = {
  campo: string
  etiqueta: string
  tipo?: 'tel' | 'documento' | 'banco' | 'fecha' | 'numero' | 'texto' | string
  prefijo?: string
  conTipo?: boolean
  largo?: number
  requerido?: boolean
}

export type PartesFecha = {
  /** «sábado» */
  dia: string
  /** 0 = domingo */
  diaNumero: number
  numero: number
  /** «octubre» */
  mes: string
  mesNumero: number
  ano: number
  horas: number
  minutos: number
  /** «8:00 p.m.» */
  hora: string | null
}

export type PreguntaPuerta = {
  clave: string
  etiqueta: string
  tipo: 'unica' | 'multi'
  pregunta: string
  ayuda: string | null
  min?: number
  max?: number
  /** [texto, código]. Vacío en zonas: esas vienen de /api/zonas. */
  opciones: [string, string][]
}

export type RondaDeJuego = { clave: string; titulo: string; bajada: string; preguntas: string[]; /** La bajada corta de la tarjeta de Mi mesa. */ enLaTarjeta?: string; /** «MIENTRAS LLEGA LA COMIDA». */ cuando?: string }
export type JuegoDeMesa = {
  rondas: RondaDeJuego[]
  porRonda: number
  /** Minutos respecto a `starts_at`: se abre a `abreMin` (negativo, antes) y se cierra a `cierraMin`. */
  abreMin: number
  cierraMin: number
  reglas: string[]
  /** «Tres rondas · la última, opcional»: el subtítulo de la pantalla de reglas. */
  subtituloReglas: string
  final: string
}

// JavaScript sin tipos a propósito: se declara la forma que la app usa y se
// fía de ella. Si `reglas.js` cambiara esa forma, lo cazan las pruebas.
export const reglas = crudo as unknown as Api

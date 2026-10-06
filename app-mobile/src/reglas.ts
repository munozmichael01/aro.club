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
  /** Cuántas horas antes de empezar cierra una fecha (24 desde el 01-10-2026). Web, servidor y app leen esta. */
  HORAS_DE_CIERRE: number
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
  /** Las partes de una fecha en la zona que se pase (`zonaHoraria` de esa fecha); sin zona, `ZONA`. */
  partesDe: (iso: string | null | undefined, zona?: string | null) => PartesFecha | null
  /** Las cuatro preguntas de la puerta, UN sitio para web y app. Opciones como [texto, código]. */
  PUERTA: Record<string, PreguntaPuerta>
  ORDEN_PUERTA: string[]
  /** Mesa o grupo según el formato: «Mi mesa» / «Mi grupo», y el resto del vocabulario. */
  /** Los bancos de Venezuela, por código: se guarda el código, que es lo que sale en el movimiento. */
  BANCOS: { codigo: string; nombre: string }[]
  /** Qué regla aplica a un campo de un método de pago (`null`: solo que no esté vacío). */
  campoDe: (definicion: CampoDePago) => Campo | null
  vozDe: (formato: string | null | undefined) => { unidad: 'mesa' | 'grupo'; mia: string } & Record<string, string>
}

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

export type RondaDeJuego = { clave: string; titulo: string; bajada: string; preguntas: string[] }
export type JuegoDeMesa = {
  rondas: RondaDeJuego[]
  porRonda: number
  /** Minutos respecto a `starts_at`: se abre a `abreMin` (negativo, antes) y se cierra a `cierraMin`. */
  abreMin: number
  cierraMin: number
  reglas: string[]
  final: string
}

// JavaScript sin tipos a propósito: se declara la forma que la app usa y se
// fía de ella. Si `reglas.js` cambiara esa forma, lo cazan las pruebas.
export const reglas = crudo as unknown as Api

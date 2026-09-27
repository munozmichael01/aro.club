/**
 * Las reglas de entrada: el MISMO `public/reglas.js` que cargan el
 * navegador y el servidor. Se importa, no se reescribe (PEDIDO §6 bis).
 *
 * Aquí solo van los tipos de lo que la app usa. La lógica no se toca.
 */
import crudo from '../../public/reglas.js'

export type Campo = 'correo' | 'clave' | 'telefonoPerfil' | 'dia' | 'mes' | 'anio' | 'cedula' | 'referencia'

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
  precioTexto: () => string
  /** La zona del producto. Cuando `cities` tenga su columna, se cambia aquí para web y app. */
  ZONA: string
  /** «sábado»: el nombre del día de una fecha, en `ZONA`. `null` si la fecha no vale. */
  diaDe: (iso: string | null | undefined) => string | null
  /** Las cuatro preguntas de la puerta, UN sitio para web y app. Opciones como [texto, código]. */
  PUERTA: Record<string, PreguntaPuerta>
  ORDEN_PUERTA: string[]
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

// JavaScript sin tipos a propósito: se declara la forma que la app usa y se
// fía de ella. Si `reglas.js` cambiara esa forma, lo cazan las pruebas.
export const reglas = crudo as unknown as Api

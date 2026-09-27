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
}

export const reglas = crudo as Api

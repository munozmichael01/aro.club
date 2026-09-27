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
  PRECIO_USD: number
  precioTexto: () => string
}

export const reglas = crudo as Api

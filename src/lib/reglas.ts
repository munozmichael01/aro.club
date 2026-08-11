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
  REGLAS: Record<Campo, { etiqueta: string; ayuda?: string }>
}

const api = reglas as Api

export const filtrar = api.filtrar
export const valido = api.valido
export const campoTelefonoDe = api.campoTelefonoDe
export const primerFallo = api.primerFallo
export const campoDe = api.campoDe
export const REGLAS = api.REGLAS
export type { Campo }

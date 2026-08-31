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
  precioTexto: () => string
  COCINAS: string[][]
  REGLAS: Record<Campo, { etiqueta: string; ayuda?: string }>
  vozDe: (formato: string | null | undefined) => {
    unidad: string; unidades: string; Unidad: string; Unidades: string
    art: string; Art: string; esta: string; tu: string; La: string; el: string
    sitio: string; Sitio: string; sitioCorto: string
    sentados: string; juntarse: string; mia: string; TU: string
  }
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

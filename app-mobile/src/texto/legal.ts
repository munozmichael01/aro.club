import { reglas } from '../reglas'
/**
 * Lo único escrito aquí es la navegación de la pantalla del legal. El texto
 * legal viene entero de `/api/legal` (una sola fuente, 30b0c3d).
 */
export const volver = 'Volver'
export const indice = { reglas: 'Reglas de la mesa', terminos: 'Términos', privacidad: 'Privacidad' } as const
export const noCargo = 'No pudimos cargar el texto. Revisa tu conexión e inténtalo otra vez.'
export const reintentar = 'Reintentar'
/** «No pudimos cargar el texto.» (entrega carga): el resto lo pone `reglas.CARGA`. */
export const que = reglas.CARGA.texto.que.legal
export const cargando = 'Cargando el texto'

/**
 * El reembolso, sin React. Lo decide el servidor (`reembolso` de
 * `/api/mi-cuenta` y de `/api/mi-mesa` en `sin-mesa`): la pantalla solo
 * pinta y manda. `estado` manda sobre `puede`.
 */
import * as P from '../pago/maquina'
import type { CampoDePago } from '../reglas'
import { etiquetas } from '../texto/reembolso'

export type Reembolso = {
  puede: boolean
  estado: null | 'pendiente' | 'reembolsado' | string
  hasta?: string
  precio?: number
  montoBs?: number | null
  tasa?: number | null
  solicitadoEn?: string | null
  reembolsadoEn?: string | null
  referencia?: string | null
}

/** Los mismos campos y reglas que pagar con Pago Móvil (`campoDe`, `BANCOS`). */
export const CAMPOS: CampoDePago[] = [
  { tipo: 'tel', campo: 'tel', prefijo: '+58', etiqueta: etiquetas.tel, requerido: true },
  { tipo: 'documento', campo: 'doc', conTipo: true, etiqueta: etiquetas.doc, requerido: true },
  { tipo: 'banco', campo: 'banco', etiqueta: etiquetas.banco, requerido: true },
]

/** Qué se ve: el botón, el acuse (pendiente), el pagado, o nada. */
export function fase(r: Reembolso | null | undefined): 'nada' | 'pedir' | 'pendiente' | 'hecho' {
  if (!r) return 'nada'
  if (r.estado === 'pendiente') return 'pendiente'
  if (r.estado === 'reembolsado') return 'hecho'
  return r.puede ? 'pedir' : 'nada'
}

export const bs = (n: number | null | undefined) =>
  n == null ? '' : Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const listo = (rep: Record<string, string>) => CAMPOS.every((c) => P.cumple(c, rep[c.campo])) && !!rep.doc_tipo

/** El teléfono como lo escribe la gente: 0414…, con el cero de delante. */
const conCero = (tel: string) => (tel.startsWith('0') ? tel : `0${tel}`)

export function cuerpo(rep: Record<string, string>, tasaVista: number | null | undefined) {
  return {
    telefono: conCero((rep.tel ?? '').trim()),
    cedula: `${rep.doc_tipo ?? 'V'}${(rep.doc ?? '').trim()}`,
    banco: rep.banco ?? '',
    ...(tasaVista ? { tasaVista } : {}),
  }
}

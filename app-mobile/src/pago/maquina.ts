/**
 * Pago, sin React. Métodos, datos de cuenta, campos del reporte, monto y
 * tasa salen del servidor (`/api/pago`): encender Zelle un sábado no puede
 * exigir publicar la app. Las reglas de cada campo, de `reglas.js`, el
 * mismo fichero con el que valida el servidor: si divergen, el campo se
 * cierra a sí mismo (así nació el fallo de Bizum en la web).
 */

import { reglas, type CampoDePago } from '../reglas'
import { FORMATOS } from '../texto/cuenta'
import * as F from '../texto/fechas'
import * as T from '../texto/pago'

export type Metodo = {
  id: string
  nombre: string
  moneda: 'VES' | 'USD' | 'EUR' | string
  activo: boolean
  manual: boolean
  datos: { campo: string; valor: string; copiar: string }[]
  datosDePrueba: boolean
  campos: CampoDePago[]
  capturaObligatoria: boolean
}

export type DeServidor = {
  evento: { id: string; empiezaEn: string; cierraEn: string | null; zona: string | null; revelaEn?: string | null; zonaHoraria?: string | null; formato?: string | null }
  montoUsd: number
  tasa: number | null
  tasaDe: string | null
  montoLocal: number | null
  metodos: Metodo[]
  verificada: boolean
  pago: { estado: string; metodo: string; reportadoEn: string } | null
}

/**
 * Las fases de la web, con nombre en vez de número: elegir → datos →
 * reportar → enviando → pendiente | listo | fallo, y cupón aparte.
 */
export type Fase = 'elegir' | 'datos' | 'reportar' | 'enviando' | 'pendiente' | 'listo' | 'fallo' | 'cupon' | 'cerrada'

/** Si ya reportó, no se le vuelve a pedir: se le enseña en qué va. */
export function faseDeServidor(d: DeServidor, ahora: number = Date.now()): Fase {
  // Sin pago reportado y con la fecha ya cerrada, no se enseñan los datos
  // para pagar: antes se llegaba hasta «Reportar mi pago» y ahí el servidor
  // decía «Esa fecha ya cerró» (Michael, 01-10-2026).
  if (!d.pago) return fechaCerrada(d, ahora) ? 'cerrada' : 'elegir'
  if (d.pago.estado === 'confirmed') return 'listo'
  if (d.pago.estado === 'rejected') return 'fallo'
  return 'pendiente'
}

/** El primero que se puede usar; si ya reportó, el que usó. */
export function metodoInicial(d: DeServidor): number {
  const usado = d.pago ? d.metodos.findIndex((m) => m.id === d.pago!.metodo) : -1
  if (usado >= 0) return usado
  return Math.max(0, d.metodos.findIndex((m) => m.activo))
}

/** «5.999,04 Bs», «7,00 USD»: como se escribe en Venezuela. */
export function dinero(n: number | null | undefined, moneda: string): string {
  if (n == null) return '—'
  const [ent, dec] = n.toFixed(2).split('.')
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} ${moneda}`
}

/** El monto en la moneda del método: solo el de bolívares pasa por la tasa. */
export const montoDe = (d: DeServidor, m: Metodo) => (m.moneda === 'VES' ? dinero(d.montoLocal, 'Bs') : dinero(d.montoUsd, m.moneda))

export function etiquetaTasa(d: DeServidor, ahora: number): string {
  const de = F.deQueDiaEsLaTasa(d.tasaDe, ahora)
  if (!de) return T.elegir.tasaBcv
  return de === 'hoy' ? T.elegir.tasaDeHoy : T.elegir.tasaDel(de.dia, de.mes)
}

export const notaDe = (m: Metodo) => (T.elegir.notas[m.id] ?? '') + (m.activo ? '' : T.elegir.todaviaNo)

/** «Cena · Sábado 4» y «8:00 p.m. · Las Mercedes». */
export function cabecera(d: DeServidor) {
  const e = d.evento
  const nombre = (FORMATOS[e.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  const dia = F.diaYNumero(e.empiezaEn, e.zonaHoraria)
  return {
    nombre: dia ? `${nombre} · ${dia}` : nombre,
    detalle: [F.horaEn(e.empiezaEn, e.zonaHoraria), e.zona].filter(Boolean).join(' · '),
  }
}

// --- El reporte ------------------------------------------------------------------

/** La V va puesta de verdad, no solo pintada: la inmensa mayoría de las cédulas son V. */
export const repInicial = (): Record<string, string> => ({ doc_tipo: 'V' })

export function filtrar(c: CampoDePago, v: string): string {
  const regla = reglas.campoDe(c)
  return regla ? reglas.filtrar(regla, v) : v
}

export function cumple(c: CampoDePago, v: string | undefined): boolean {
  const s = (v ?? '').trim()
  if (!s) return false
  const regla = reglas.campoDe(c)
  return regla ? reglas.valido(regla, s) : s.length >= 3
}

export type EstadoReporte = { ok: boolean; camposOk: boolean; falta: string | null; faltaLetra: boolean; fechaFutura: boolean }

/** El botón NOMBRA lo que falta: «Completa los datos» obliga a repasar cinco campos para encontrarlo. */
export function estadoReporte(m: Metodo, rep: Record<string, string>, conCaptura: boolean, ahora: number): EstadoReporte {
  const falta = m.campos.find((c) => !cumple(c, rep[c.campo]))
  // La letra del documento la exige el servidor: si la pantalla no la cuenta,
  // el botón se enciende y el 400 llega sin que se vea por qué.
  const faltaLetra = m.campos.some((c) => c.conTipo) && !rep.doc_tipo
  const campoFecha = m.campos.find((c) => c.tipo === 'fecha')
  const fechaFutura = !!campoFecha && F.esFutura(rep[campoFecha.campo] ?? '', ahora)
  const camposOk = m.campos.length > 0 && !falta && !faltaLetra && !fechaFutura
  return {
    ok: camposOk && (!m.capturaObligatoria || conCaptura),
    camposOk,
    falta: falta ? falta.etiqueta : fechaFutura && campoFecha ? campoFecha.etiqueta : null,
    faltaLetra,
    fechaFutura,
  }
}

/** Lo que viaja a `POST /api/pago`: solo los campos del método (y la letra si la pide). */
export function cuerpoReporte(d: DeServidor, m: Metodo, rep: Record<string, string>, captura: string | null) {
  const datos: Record<string, string> = {}
  for (const c of m.campos) datos[c.campo] = (rep[c.campo] ?? '').trim()
  if (m.campos.some((c) => c.conTipo)) datos.doc_tipo = rep.doc_tipo ?? 'V'
  return {
    eventoId: d.evento.id,
    metodo: m.id,
    datos,
    ...(captura ? { captura } : {}),
    // La tasa que se le ENSEÑÓ: si el cron la cambió mientras estaba en el banco, vale la suya.
    ...(d.tasa ? { tasaVista: d.tasa } : {}),
  }
}

/** La fecha del reporte, entre «DD/MM/AAAA» (lo que se guarda) y las tres partes del selector. */
export function partesDeFechaPago(v: string | undefined): { dia: string; mes: number; anio: string } {
  const [dd = '', mm = '', aaaa = ''] = (v ?? '').split('/')
  return { dia: dd, mes: parseInt(mm, 10) || 0, anio: aaaa }
}
export function fechaPagoDePartes(p: { dia: string; mes: number; anio: string }): string {
  const dd = p.dia.length === 1 ? `0${p.dia}` : p.dia
  return `${dd}/${p.mes ? String(p.mes).padStart(2, '0') : ''}/${p.anio}`
}

// --- Después ----------------------------------------------------------------------

export function comprobante(d: DeServidor, m: Metodo, fase: Fase) {
  const e = d.evento
  const nombre = (FORMATOS[e.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  return [
    [nombre, [F.diaYNumero(e.empiezaEn, e.zonaHoraria), F.horaEn(e.empiezaEn, e.zonaHoraria)].filter(Boolean).join(', '), false],
    [T.comprobante.zona, e.zona || T.comprobante.zonaAlAbrirse, false],
    [T.comprobante.metodo, m.nombre, false],
    // La tasa que se CONGELÓ al reportar, no la de ahora.
    [T.comprobante.tasa, d.tasa ? T.comprobante.porUsd(dinero(d.tasa, 'Bs')) : '—', false],
    [fase === 'pendiente' ? T.comprobante.reportaste : T.comprobante.pagado, `${montoDe(d, m)} · ${dinero(d.montoUsd, 'USD')}`, true],
  ]
    .filter((c) => c[1] !== '—')
    .map(([campo, valor, fuerte]) => ({ campo: campo as string, valor: valor as string, fuerte: fuerte as boolean }))
}

/** «el sábado a mediodía», si el servidor manda la revelación; si no, null (se dice sin hora). */
export const cuandoSeAbre = (d: DeServidor) => (d.evento.revelaEn ? F.cuandoSeSabe(d.evento.revelaEn, d.evento.zonaHoraria) : null)

/** El código se escribe en mayúsculas y sin espacios. */
export const normalizarCupon = (v: string) => v.toUpperCase().replace(/\s+/g, '')

/** Si ya pasó el cierre de la fecha (lo da el servidor en `cierraEn`). */
export function fechaCerrada(d: DeServidor, ahora: number): boolean {
  const c = d.evento.cierraEn ? Date.parse(d.evento.cierraEn) : NaN
  return Number.isFinite(c) && c <= ahora
}

/** El rechazo del servidor por fecha cerrada. Con `motivo` si lo manda; si no, por el texto. */
export function esFechaCerrada(r: { status?: number; motivo?: string; error: string }): boolean {
  return r.status === 409 && (r.motivo === 'fecha-cerrada' || /ya cerr/i.test(r.error))
}

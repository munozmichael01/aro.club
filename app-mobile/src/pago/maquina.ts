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
  evento: { id: string; empiezaEn: string; cierraEn: string | null; zona: string | null; revelaEn?: string | null; zonaHoraria?: string | null; formato?: string | null; /** La fecha se graba (18-10). */ grabamos?: boolean; /** Requerida: el permiso es condición para apartar puesto (48f5823). */ permisoObligatorio?: boolean }
  montoUsd: number
  tasa: number | null
  tasaDe: string | null
  montoLocal: number | null
  metodos: Metodo[]
  verificada: boolean
  pago: { estado: string; metodo: string; reportadoEn: string } | null
  /** Solo de la app: el código parcial ya aplicado. El servidor lo vuelve a calcular al reportar. */
  descuento?: Descuento | null
}

/**
 * `origen`: «cupon» si lo tecleó (su código viaja al reportar) o «invitacion»
 * si llegó con el enlace de alguien (el servidor lo aplica solo al reportar,
 * y si ya no vale cobra el pleno sin pararla: mandarlo la pararía).
 */
export type Descuento = { codigo: string; pct: number; nombre: string; montoPleno: number | null; origen: 'cupon' | 'invitacion' }

/**
 * El GET de quien llegó invitada (30-10) trae `descuento: { codigo, pct, nombre }`
 * y `montoPleno` en la RAÍZ, con los importes ya rebajados. Se pasa a la forma
 * de la app para que la fila del recibo salga igual que con el cupón.
 */
export function normalizar(d: DeServidor & { montoPleno?: number | null; descuento?: { codigo: string; pct: number; nombre?: string | null; montoPleno?: number | null } | null }): DeServidor {
  const x = d.descuento
  return {
    ...d,
    descuento: x ? { codigo: x.codigo, pct: x.pct, nombre: x.nombre || '', montoPleno: d.montoPleno ?? x.montoPleno ?? null, origen: 'invitacion' } : null,
  }
}

/**
 * Lo que contesta `POST /api/cupon` cuando se le manda `acepta: ['descuento']`
 * (98b3728). Sin ese campo, un código parcial es un 409 `descuento-parcial`:
 * así las versiones que trataban cualquier 200 como «listo» no dejan entrar
 * a nadie sin pagar.
 */
export type RespuestaCupon =
  | { estado: 'confirmado'; puestoApartado?: boolean }
  | {
      estado: 'descuento'
      codigo: string
      pct: number
      nombre?: string | null
      montoPleno: number
      montoUsd: number
      tasa?: number | null
      tasaDe?: string | null
      montoLocal?: number | null
      metodos?: { id: string; datos: Metodo['datos'] }[]
      puestoApartado: false
    }

/**
 * El código parcial puesto: los importes rebajados y los datos para pagar de
 * cada método, sustituidos POR ID. La lista del cupón lleva solo los métodos
 * encendidos: emparejarla por posición pondría el monto de Pago Móvil en Zelle.
 */
export function conDescuento(d: DeServidor, x: Extract<RespuestaCupon, { estado: 'descuento' }>): DeServidor {
  const nuevos = new Map((x.metodos ?? []).map((m) => [m.id, m.datos]))
  return {
    ...d,
    montoUsd: x.montoUsd,
    montoLocal: x.montoLocal ?? d.montoLocal,
    tasa: x.tasa ?? d.tasa,
    tasaDe: x.tasaDe || d.tasaDe,
    metodos: d.metodos.map((m) => (nuevos.has(m.id) ? { ...m, datos: nuevos.get(m.id)! } : m)),
    descuento: { codigo: x.codigo, pct: x.pct, nombre: x.nombre || '', montoPleno: x.montoPleno ?? null, origen: 'cupon' },
  }
}

/** La fila del recibo: «Código de Andrea · −20%» y «−2,00 ref» (copy de Michael, 29-10). */
export function filaDescuento(d: DeServidor): { texto: string; cifra: string } | null {
  const x = d.descuento
  if (!x) return null
  return {
    texto: T.elegir.descuento(x.nombre, x.pct),
    cifra: x.montoPleno != null ? `−${dinero(x.montoPleno - d.montoUsd, 'ref')}` : '',
  }
}

/** Los `motivo` con los que el servidor dice que el CÓDIGO dejó de valer (98b3728). */
export const MOTIVOS_DEL_CODIGO = ['no-vale', 'caducado', 'agotado', 'otra-fecha', 'ya-usado', 'tu-propio-codigo', 'otro-referido', 'no-es-la-primera']

/** «Un puesto» enseña el precio PLENO cuando hay descuento; el total, el rebajado. */
export const precioPleno = (d: DeServidor) => (d.descuento?.montoPleno != null ? d.descuento.montoPleno : d.montoUsd)

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

/** «5.999,04 Bs», «10,00 ref»: como se escribe en Venezuela. */
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
  const s = c.tipo === 'fecha' ? conCeros((v ?? '').trim()) : (v ?? '').trim()
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
  const fechaFutura = !!campoFecha && F.esFutura(conCeros(rep[campoFecha.campo] ?? ''), ahora)
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
export function cuerpoReporte(d: DeServidor, m: Metodo, rep: Record<string, string>, captura: string | null, permiteGrabacion = false) {
  const datos: Record<string, string> = {}
  for (const c of m.campos) datos[c.campo] = c.tipo === 'fecha' ? conCeros((rep[c.campo] ?? '').trim()) : (rep[c.campo] ?? '').trim()
  if (m.campos.some((c) => c.conTipo)) datos.doc_tipo = rep.doc_tipo ?? 'V'
  return {
    eventoId: d.evento.id,
    metodo: m.id,
    datos,
    ...(captura ? { captura } : {}),
    // La tasa que se le ENSEÑÓ: si el cron la cambió mientras estaba en el banco, vale la suya.
    ...(d.tasa ? { tasaVista: d.tasa } : {}),
    // Solo en una fecha que se graba: sin él, el servidor responde 409 `falta-permiso-grabacion`.
    ...(d.evento.permisoObligatorio && permiteGrabacion ? { permiteGrabacion: true } : {}),
    // El código, no el importe: el descuento lo vuelve a calcular el servidor.
    // El de la invitación no se manda: el servidor lo pone solo.
    ...(d.descuento?.origen === 'cupon' ? { codigo: d.descuento.codigo } : {}),
  }
}

/** La fecha del reporte, entre «DD/MM/AAAA» (lo que se guarda) y las tres partes del selector. */
export function partesDeFechaPago(v: string | undefined): { dia: string; mes: number; anio: string } {
  const [dd = '', mm = '', aaaa = ''] = (v ?? '').split('/')
  return { dia: dd, mes: parseInt(mm, 10) || 0, anio: aaaa }
}
export function fechaPagoDePartes(p: { dia: string; mes: number; anio: string }): string {
  // El día tal cual se teclea, SIN el cero delante: poniéndolo aquí, «1» se
  // volvía «01» al instante, el campo (2 cifras) quedaba lleno y no dejaba
  // escribir la segunda; y borrar dejaba «00», imposible de vaciar (testers,
  // Android, 06-10-2026). El cero se pone al validar y al enviar: `conCeros`.
  return `${p.dia}/${p.mes ? String(p.mes).padStart(2, '0') : ''}/${p.anio}`
}

/** «5/10/2026» → «05/10/2026»: la forma que valida `reglas.js` y la que viaja al servidor. */
export function conCeros(v: string): string {
  const [d = '', m = '', a = ''] = v.split('/')
  const dos = (x: string) => (x.length === 1 ? `0${x}` : x)
  return v.includes('/') ? `${dos(d)}/${dos(m)}/${a}` : v
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
    [T.comprobante.tasa, d.tasa ? T.comprobante.porRef(dinero(d.tasa, 'Bs')) : '—', false],
    [fase === 'pendiente' ? T.comprobante.reportaste : T.comprobante.pagado, `${montoDe(d, m)} · ${dinero(d.montoUsd, 'ref')}`, true],
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

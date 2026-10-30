/**
 * «Estás dentro», sin React: qué momento es, qué dice y el enlace del
 * calendario. Los días salen de `texto/fechas.ts`, en la zona de la fecha.
 */

import { reglas } from '../reglas'
import { FORMATOS } from '../texto/cuenta'
import * as T from '../texto/dentro'
import * as F from '../texto/fechas'

export type Plan = {
  empiezaEn: string
  zonaHoraria?: string | null
  formato?: string | null
  revelaEn?: string | null
  zonas?: string[]
}

/** A: pago reportado, sin confirmar. B: confirmado (o con crédito o cupón). */
export type Momento = 'A' | 'B'
/** Cómo se llegó a B: con crédito al reservar, con el pago confirmado, recién reportado, o no se sabe. */
export type Via = 'credito' | 'cupon' | 'confirmado' | 'reportado' | null

const zonasEnTexto = (z: string[] | undefined) =>
  !z?.length ? '' : z.length === 1 ? z[0] : `${z.slice(0, -1).join(', ')} o ${z[z.length - 1]}`

export function vista(p: Plan, momento: Momento, via: Via) {
  const z = p.zonaHoraria
  const plan = (FORMATOS[p.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  const esMesa = reglas.vozDe(p.formato ?? 'dinner').unidad !== 'grupo'
  const dia = F.diaYNumero(p.empiezaEn, z)
  const hora = reglas.horaDe(p.empiezaEn, z) ?? ''
  const b = via === 'credito' ? T.B.credito : via === 'cupon' ? T.B.cupon : via === 'confirmado' ? T.B.confirmado : via === 'reportado' ? T.B.reportado : T.B.sinSaber
  return {
    momento,
    plan,
    PLAN: plan.toUpperCase(),
    dia,
    hora,
    zona: zonasEnTexto(p.zonas),
    sello: momento === 'A' ? T.A.sello : b.sello,
    bajada: momento === 'A' ? T.A.bajada : b.bajada,
    // «EL VIERNES A MEDIODÍA»: la misma frase que el resto de la app, en mayúsculas.
    seAbre: p.revelaEn ? F.cuandoSeSabe(p.revelaEn, z).toUpperCase() : '',
    revela: T.revela(esMesa),
    cancela: T.cancela(esMesa),
  }
}

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/**
 * El enlace de Google Calendar con el evento ya escrito. Un enlace y no un
 * módulo nativo: sale sin compilar. Dura dos horas, como la mesa.
 */
export function enlaceCalendario(p: Plan): string {
  const inicio = Date.parse(p.empiezaEn)
  const fin = new Date(inicio + 2 * 3600_000).toISOString()
  const plan = (FORMATOS[p.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: T.evento.titulo(plan),
    dates: `${utc(p.empiezaEn)}/${utc(fin)}`,
    details: T.evento.descripcion(F.cuandoSeSabe(p.revelaEn, p.zonaHoraria)),
    location: zonasEnTexto(p.zonas),
  })
  if (p.zonaHoraria) q.set('ctz', p.zonaHoraria)
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

/**
 * La pantalla B se ve UNA vez por reserva (HANDOFF). Se recuerda por la hora
 * de la fecha, que es lo que saben los tres sitios que la abren (Pago, Inicio
 * y /estas-dentro): así quien la vio al reportar no la vuelve a ver al confirmarse.
 */
export const claveVista = (empiezaEn: string) => `estas-dentro:${empiezaEn}`

/** Lo que pinta la historia para compartir (TarjetaHistoria de la entrega estas-dentro). */
export type Historia = {
  plan: 'Cena' | 'Brunch'
  /** «Viernes 30», y sus dos mitades. */
  dia: string
  diaSemana: string
  numero: string
  hora: string
  zona: string
  /** La hora de la revelación como la escribe la maqueta: «12:00 m.», «8:00 a.m.». */
  revela: string
  revelaNum: string
  revelaSufijo: string
  codigo: string | null
}

/**
 * Las historias son de cena y de brunch: los planes de movimiento no tienen
 * tarjeta (su copy habla de mesa y de silla) y comparten solo el mensaje.
 */
export function historia(p: Plan, codigo: string | null): Historia | null {
  const tipo = reglas.COMO_FUNCIONA.tipoDe(p.formato ?? 'dinner')
  if (tipo === 'grupo') return null
  const z = p.zonaHoraria
  const dia = F.diaYNumero(p.empiezaEn, z)
  const [diaSemana = '', numero = ''] = dia.split(' ')
  return {
    plan: tipo === 'brunch' ? 'Brunch' : 'Cena',
    dia,
    diaSemana,
    numero,
    hora: reglas.horaDe(p.empiezaEn, z) ?? '',
    zona: zonasEnTexto(p.zonas),
    ...F.revelaDeHistoria(p.revelaEn, z),
    codigo,
  }
}

/**
 * Las tarjetas que se ofrecen. La 4 («Hay una silla para ti») es entera el
 * código: sin referidos todavía, no sale.
 */
export const variantesDe = (h: Historia) => (h.codigo ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 5, 6, 7, 8])

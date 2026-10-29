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
/** Cómo se llegó a B: con crédito al reservar, con el pago confirmado, o no se sabe. */
export type Via = 'credito' | 'confirmado' | null

const zonasEnTexto = (z: string[] | undefined) =>
  !z?.length ? '' : z.length === 1 ? z[0] : `${z.slice(0, -1).join(', ')} o ${z[z.length - 1]}`

export function vista(p: Plan, momento: Momento, via: Via) {
  const z = p.zonaHoraria
  const plan = (FORMATOS[p.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  const esMesa = reglas.vozDe(p.formato ?? 'dinner').unidad !== 'grupo'
  const dia = F.diaYNumero(p.empiezaEn, z)
  const hora = reglas.horaDe(p.empiezaEn, z) ?? ''
  const b = via === 'credito' ? T.B.credito : via === 'confirmado' ? T.B.confirmado : T.B.sinSaber
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

/** La pantalla B se ve UNA vez por reserva (HANDOFF): la clave con que se recuerda. */
export const claveVista = (reservaId: string) => `estas-dentro:${reservaId}`

/**
 * Perfil, sin React. Los campos son los cinco datos base más las preguntas
 * del catálogo que manda `/api/mi-perfil`: las opciones salen de ahí, nunca
 * de una copia (la de la web ya había derivado una vez). Se guarda por
 * CÓDIGO; los índices solo viven mientras se edita.
 */

import { reglas } from '../reglas'
import * as F from '../texto/fechas'
import * as T from '../texto/perfil'

export type PreguntaPerfil = {
  clave: string
  enunciado: string
  ayuda: string | null
  tipo: 'single' | 'multi' | 'text' | 'date' | string
  opciones: { value: string; label: string }[] | null
  min: number | null
  max: number | null
  exclusiva: string | null
  pantalla: number | null
  valor: string | string[] | null
}

export type DeServidor = {
  verificada: boolean
  completo: boolean
  faltanPreguntas?: number
  faltanBase?: number
  creditos: number
  correo: string
  contacto: string
  base: { nombre: string; trato: string; nacimiento: string; genero: string | null; telefono: string }
  preguntas: PreguntaPerfil[]
  historial: { cuando: string; formato: string; sitio: string | null; numeroMesa: number | null; mesaUnica?: boolean; estado: string; zonaHoraria?: string | null }[]
}

export type Tipo = 'texto' | 'fecha' | 'unica' | 'multi'

export type Campo = {
  clave: string
  seccion: number
  etiqueta: string
  ayuda: string | null
  tipo: Tipo
  /** [texto, código], como en `reglas.PUERTA`. */
  opciones: [string, string][]
  min: number | null
  max: number | null
  exclusiva: string | null
  /** Se enseña en terracota: «no se muestra a nadie». */
  privada?: boolean
}

/** El valor de un campo: texto (texto y fecha) o códigos (únicas y múltiples). */
export type Valor = string | string[] | null

const BASE_CLAVES = ['trato', 'nombre', 'nacimiento', 'genero', 'telefono'] as const

function campoBase(clave: (typeof BASE_CLAVES)[number]): Campo {
  const b = T.BASE[clave]
  return {
    clave,
    seccion: 0,
    etiqueta: b.etiqueta,
    ayuda: b.ayuda,
    tipo: clave === 'nacimiento' ? 'fecha' : clave === 'genero' ? 'unica' : 'texto',
    opciones: clave === 'genero' ? T.BASE.genero.opciones : [],
    min: null,
    max: null,
    exclusiva: null,
    privada: clave === 'genero',
  }
}

const tipoDe = (t: string): Tipo => (t === 'multi' ? 'multi' : t === 'text' ? 'texto' : t === 'date' ? 'fecha' : 'unica')

/** Los campos, en su sección. Una pregunta del catálogo con la clave de un dato base (nacimiento, género) se queda en el base. */
export function campos(d: DeServidor): Campo[] {
  const lista = BASE_CLAVES.map(campoBase)
  for (const q of d.preguntas ?? []) {
    if ((BASE_CLAVES as readonly string[]).includes(q.clave)) continue
    lista.push({
      clave: q.clave,
      seccion: Math.min(5, q.pantalla || 1),
      etiqueta: q.enunciado,
      ayuda: q.ayuda || null,
      tipo: tipoDe(q.tipo),
      opciones: (q.opciones ?? []).map((o) => [o.label, o.value]),
      min: q.min || null,
      max: q.max || null,
      exclusiva: q.exclusiva || null,
    })
  }
  return lista
}

export function valores(d: DeServidor): Record<string, Valor> {
  const v: Record<string, Valor> = {
    nombre: d.base.nombre || '',
    trato: d.base.trato || '',
    nacimiento: d.base.nacimiento || '',
    telefono: d.base.telefono || '',
    genero: d.base.genero,
  }
  for (const q of d.preguntas ?? []) if (!(q.clave in v)) v[q.clave] = q.valor
  return v
}

/** Cómo se lee un valor en la fila cerrada. */
export function texto(c: Campo, v: Valor): string {
  const SR = T.campo.sinResponder
  if (c.tipo === 'fecha') return F.fechaDeNacimiento(typeof v === 'string' ? v : null) ?? SR
  if (c.tipo === 'texto') {
    if (c.clave === 'telefono' && typeof v === 'string' && v) {
      const n = v.replace(/^\+?58/, '')
      return v.startsWith('+58') || !v.startsWith('+') ? `+58 ${n.slice(0, 3)} ${n.slice(3)}` : v
    }
    return (typeof v === 'string' && v) || SR
  }
  const nombre = (cod: string) => c.opciones.find((o) => o[1] === cod)?.[0]
  if (c.tipo === 'unica') return (typeof v === 'string' && nombre(v)) || SR
  const l = (Array.isArray(v) ? v : []).map(nombre).filter(Boolean)
  return l.length ? l.join(' · ') : SR
}

// --- Editar ---------------------------------------------------------------------

/** Marcar una opción en el borrador: única reemplaza; múltiple respeta la exclusiva y el tope. */
export function marcar(c: Campo, borrador: Valor, cod: string): Valor {
  if (c.tipo === 'unica') return cod
  const a = Array.isArray(borrador) ? borrador : []
  if (a.includes(cod)) return a.filter((x) => x !== cod)
  if (c.exclusiva && cod === c.exclusiva) return [cod]
  const limpio = c.exclusiva ? a.filter((x) => x !== c.exclusiva) : a
  if (c.max && limpio.length >= c.max) return limpio
  return [...limpio, cod]
}

/** Lo que impide guardar, o null si se puede. */
export function falta(c: Campo, borrador: Valor): string | null {
  if (c.tipo === 'fecha') return /^\d{4}-\d{2}-\d{1,2}$/.test(String(borrador ?? '')) ? null : T.campo.completaFecha
  if (c.tipo === 'multi' && c.min && (Array.isArray(borrador) ? borrador.length : 0) < c.min) return T.campo.eligeAlMenos(c.min)
  return null
}

/** Lo que se manda a `POST /api/mi-perfil`: el teléfono en E.164, el resto tal cual (códigos). */
export function paraGuardar(c: Campo, borrador: Valor): Valor {
  if (c.clave === 'telefono') return reglas.aE164(String(borrador ?? ''))
  if (c.tipo === 'unica') return typeof borrador === 'string' ? borrador : null
  return borrador
}

/** La fecha del borrador en sus tres partes, y al revés. */
export function partesFecha(v: Valor): { anio: string; mes: number; dia: string } {
  const p = String(v ?? '').split('-')
  return { anio: p[0] ?? '', mes: parseInt(p[1] ?? '', 10) || 0, dia: p[2] ?? '' }
}
export function juntarFecha(p: { anio: string; mes: number; dia: string }): string {
  return `${p.anio}-${p.mes ? String(p.mes).padStart(2, '0') : ''}-${p.dia}`
}

// --- Lo demás -------------------------------------------------------------------

export function credenciales(d: DeServidor) {
  return [
    { texto: T.credenciales.verificada(d.verificada), destacada: d.verificada },
    { texto: T.credenciales.completo(d), destacada: d.completo },
    { texto: T.credenciales.creditos(d.creditos ?? 0), destacada: false },
  ]
}

export function historial(d: DeServidor) {
  return (d.historial ?? []).map((c) => ({
    sitio: c.sitio ? c.sitio + (c.numeroMesa != null && !c.mesaUnica ? T.cenas.mesa(c.numeroMesa) : '') : ({ dinner: 'Cena', drinks: 'Drinks', movement: 'Movimiento', coffee: 'Coffee' } as Record<string, string>)[c.formato] ?? 'Cena',
    cuando: F.fechaCompleta(c.cuando, c.zonaHoraria),
    estado: T.cenas.estado[c.estado] ?? T.cenas.estado['no-llegaste'],
    fuiste: c.estado === 'fuiste',
  }))
}

export type Aviso = { clave: string; titulo: string; cuerpo: string; encendido: boolean; fijo: boolean }

/** Se pinta el cambio antes de que conteste el servidor: un interruptor que tarda se toca dos veces. */
export const alternarAviso = (lista: Aviso[], clave: string, valor: boolean) => lista.map((a) => (a.clave === clave ? { ...a, encendido: valor } : a))

export const puedeBaja = (palabra: string) => palabra.trim().toUpperCase() === T.baja.palabra

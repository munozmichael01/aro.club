import { edad } from '../datos/maquina'
import type { PreguntaCatalogo, Zona } from '../entrada/preguntas'
import { reglas } from '../reglas'
import * as T from '../texto/cuestionario'

/**
 * El cuestionario, sin React. Las preguntas, opciones y reglas salen del
 * catálogo (`/api/questions`), que es el autoritativo. Todo se guarda por
 * CÓDIGO: las exclusivas («Ninguno») y el atajo «cualquier zona» también se
 * resuelven por código, nunca por posición —la posición es lo que ya guardó
 * «Depende del momento» como «lleva la conversación» sin que nadie lo viera.
 *
 * Se guarda por respuesta, no al final: quien contesta tres de cuatro y se
 * va, no pierde las tres.
 */

export type Tipo = 'fecha' | 'unica' | 'ficha' | 'multi' | 'texto'

export type Pregunta = {
  clave: string
  tipo: Tipo
  enunciado: string
  ayuda: string | null
  obligatoria: boolean
  min: number | null
  max: number | null
  /** El código que, marcado, deja solo a sí mismo («ninguno»). */
  exclusiva: string | null
  opciones: { valor: string; label: string }[]
  /** 0–4. */
  pantalla: number
  /** Para el texto libre (empleador): la lista de sugerencias del catálogo. */
  sugerencias: string[]
  /** Si lleva el atajo de «cualquier zona». */
  todas: boolean
}

export const TOTAL_PANTALLAS = T.pantallas.length

const TIPOS: Record<string, (p: PreguntaCatalogo & { layout?: string | null }) => Tipo> = {
  date: () => 'fecha',
  single: (p) => (p.layout === 'compacta' ? 'ficha' : 'unica'),
  multi: () => 'multi',
  text: () => 'texto',
}

/**
 * Del catálogo a las preguntas. Las zonas, en el orden de `/api/zonas` si
 * llegó (el que tiene gente), con los mismos códigos. `null` si trae un tipo
 * que la app no sabe pintar: se abre la web antes que guardar mal (PROPUESTA §e.1).
 */
export function armar(
  catalogo: (PreguntaCatalogo & { layout?: string | null; obligatoria?: boolean; exclusiva?: string | null; autocomplete?: unknown; pantalla?: number })[],
  zonas: Zona[] | null,
): Pregunta[] | null {
  const salida: Pregunta[] = []
  for (const p of catalogo) {
    const tipo = TIPOS[p.tipo]?.(p)
    if (!tipo || !p.pantalla || p.pantalla < 1 || p.pantalla > TOTAL_PANTALLAS) return null
    let opciones = p.opciones.filter((o): o is { valor: string; label: string } => typeof o.valor === 'string')
    if (p.clave === 'zonas' && zonas?.length) {
      const validas = new Set(opciones.map((o) => o.valor))
      const ordenadas = zonas.filter((z) => validas.has(z.slug)).map((z) => ({ valor: z.slug, label: z.nombre }))
      // Las del catálogo que /api/zonas no traiga, al final: nunca se pierde una.
      opciones = [...ordenadas, ...opciones.filter((o) => !ordenadas.some((x) => x.valor === o.valor))]
    }
    salida.push({
      clave: p.clave,
      tipo,
      enunciado: p.enunciado,
      ayuda: p.ayuda,
      obligatoria: p.obligatoria !== false,
      min: p.min,
      max: p.max,
      exclusiva: p.exclusiva ?? null,
      opciones,
      pantalla: p.pantalla - 1,
      sugerencias: Array.isArray(p.autocomplete) ? (p.autocomplete as string[]) : [],
      todas: p.clave === 'zonas',
    })
  }
  return salida
}

export type Estado = {
  pantalla: number
  /** Las respuestas, POR CÓDIGO: un código en las de una, una lista en las de varias. */
  r: Record<string, string | string[]>
  empleador: string
  dia: string
  mes: number
  anio: string
  heredadas: string[]
  retomada: boolean
  fin: boolean
  sinSesion: boolean
  algoGuardado: boolean
  donde: string
  /** Lo que el SERVIDOR dice que falta. La pantalla no lo deduce. */
  faltan: string[] | null
  /** Se enciende al pulsar Continuar con algo sin contestar; nunca antes. */
  senalar: boolean
}

export const inicial = (): Estado => ({
  pantalla: 0,
  r: {},
  empleador: '',
  dia: '',
  mes: 0,
  anio: '',
  heredadas: [],
  retomada: false,
  fin: false,
  sinSesion: false,
  algoGuardado: false,
  donde: '',
  faltan: null,
  senalar: false,
})

export type DeServidor = {
  respuestas?: Record<string, unknown>
  heredadas?: string[]
  pantalla?: number | null
  completado?: boolean
  faltan?: string[]
  donde?: string
}

/**
 * Lo guardado, al estado. Solo entran códigos que existen hoy en el
 * catálogo: un código viejo no se pinta como marcado ni se reenvía.
 */
export function desdeServidor(e: Estado, d: DeServidor, preguntas: Pregunta[]): Estado {
  const r: Estado['r'] = {}
  const resp = d.respuestas ?? {}
  for (const q of preguntas) {
    const v = resp[q.clave]
    if (q.tipo === 'texto' || q.tipo === 'fecha' || v == null) continue
    const validos = new Set(q.opciones.map((o) => o.valor))
    if (Array.isArray(v)) {
      const lista = v.filter((x): x is string => typeof x === 'string' && validos.has(x))
      if (lista.length) r[q.clave] = lista
    } else if (typeof v === 'string' && validos.has(v)) r[q.clave] = v
  }
  const nuevo: Estado = { ...e, r, empleador: typeof resp.empleador === 'string' ? resp.empleador : '' }
  const fecha = typeof resp.nacimiento === 'string' ? reglas.fechaDesdeISO(resp.nacimiento) : ''
  if (fecha) {
    const [dd, mm, aa] = fecha.split('/')
    Object.assign(nuevo, { dia: String(parseInt(dd, 10)), mes: parseInt(mm, 10), anio: aa })
    nuevo.r.nacimiento = resp.nacimiento as string
  }
  // Heredadas (contestadas al registrarse): se saltan solo si están completas.
  nuevo.heredadas = (d.heredadas ?? []).filter((clave) => {
    const q = preguntas.find((x) => x.clave === clave)
    return q ? contestada(nuevo, q) : false
  })
  nuevo.algoGuardado = Object.keys(resp).length > 0
  nuevo.donde = d.donde ?? ''
  nuevo.faltan = d.faltan ?? null
  if (d.completado) nuevo.fin = true
  else if (d.pantalla && d.pantalla > 0) {
    nuevo.pantalla = Math.min(d.pantalla, TOTAL_PANTALLAS - 1)
    nuevo.retomada = true
  }
  // Idiomas viene premarcado con el primero (Español), como en la web; se
  // guarda al continuar aunque no se toque (ver `aReenviar`).
  const idiomas = preguntas.find((q) => q.clave === 'idiomas')
  if (idiomas && !nuevo.r.idiomas && idiomas.opciones[0]) nuevo.r.idiomas = [idiomas.opciones[0].valor]
  return nuevo
}

/** Las de la pantalla actual que se enseñan: las heredadas completas se saltan. */
export const visibles = (e: Estado, preguntas: Pregunta[]) =>
  preguntas.filter((q) => q.pantalla === e.pantalla && !e.heredadas.includes(q.clave))

/**
 * La pantalla de al lado CON algo que preguntar (`dir` 1 adelante, -1 atrás),
 * o `null` si no queda ninguna. Una pantalla cuyas preguntas vinieron todas
 * contestadas (heredadas) se salta: enseñarla vacía se lee como un fallo.
 */
export function vecina(e: Pick<Estado, 'pantalla' | 'heredadas'>, preguntas: Pregunta[], dir: 1 | -1): number | null {
  for (let x = e.pantalla + dir; x >= 0 && x < TOTAL_PANTALLAS; x += dir)
    if (preguntas.some((q) => q.pantalla === x && !e.heredadas.includes(q.clave))) return x
  return null
}

export function contestada(e: Estado, q: Pregunta, hoy = new Date()): boolean {
  if (!q.obligatoria) return true
  if (q.tipo === 'texto') return e.empleador.trim().length > 0
  if (q.tipo === 'fecha') {
    const x = edad(e, hoy)
    return x !== null && x >= 18
  }
  const v = e.r[q.clave]
  if (q.tipo === 'unica' || q.tipo === 'ficha') return typeof v === 'string'
  return Array.isArray(v) && v.length >= (q.min || 1)
}

export const faltantes = (e: Estado, preguntas: Pregunta[], hoy = new Date()) =>
  visibles(e, preguntas).filter((q) => !contestada(e, q, hoy))

/** El botón dice qué falta: el nombre si es una, el número si son más. */
export function textoContinuar(e: Estado, preguntas: Pregunta[], hoy = new Date()): string {
  const f = faltantes(e, preguntas, hoy)
  if (!f.length) return e.pantalla >= TOTAL_PANTALLAS - 1 ? T.boton.terminar : T.boton.continuar
  return f.length === 1 ? T.boton.faltaUna(T.corto[f[0].clave]) : T.boton.faltan(f.length)
}

/** Una de una sola: el código elegido. */
export function elegir(e: Estado, q: Pregunta, valor: string): Estado {
  return { ...e, r: { ...e.r, [q.clave]: valor } }
}

/** Si «cualquier zona» cuenta como marcada: están todas las reales. */
export const todasMarcadas = (e: Estado, q: Pregunta) => {
  const sel = (e.r[q.clave] as string[] | undefined) ?? []
  return q.opciones.length > 0 && q.opciones.every((o) => sel.includes(o.valor))
}

/**
 * Una de varias. `valor` es un código, o `null` para el atajo de «cualquier
 * zona», que no se guarda como valor propio: se expande a todas (con un valor
 * propio, esa persona no cuadraría con ninguna zona real y se quedaría fuera
 * de todas las mesas sin un solo error). Devuelve el estado igual si el tope
 * no deja marcar.
 */
export function alternar(e: Estado, q: Pregunta, valor: string | null): Estado {
  const sel = (e.r[q.clave] as string[] | undefined) ?? []
  let nueva: string[]
  if (valor === null) {
    nueva = todasMarcadas(e, q) ? [] : q.opciones.map((o) => o.valor)
  } else if (sel.includes(valor)) {
    nueva = sel.filter((v) => v !== valor)
  } else if (q.exclusiva && valor === q.exclusiva) {
    nueva = [valor]
  } else {
    const limpia = q.exclusiva ? sel.filter((v) => v !== q.exclusiva) : sel
    if (q.max && limpia.length >= q.max) return e
    nueva = [...limpia, valor]
  }
  return { ...e, r: { ...e.r, [q.clave]: nueva } }
}

/** Si una opción no marcada queda fuera por el tope: se atenúa. */
export function enTope(e: Estado, q: Pregunta, valor: string): boolean {
  const sel = (e.r[q.clave] as string[] | undefined) ?? []
  if (!q.max || sel.includes(valor) || valor === q.exclusiva) return false
  return sel.filter((v) => v !== q.exclusiva).length >= q.max
}

/**
 * La fecha, por partes. Solo se guarda cuando es entera y de alguien mayor de
 * 18: guardar «19» mientras se teclea el año escribiría a alguien nacido en
 * el año 19. Devuelve el ISO a guardar, o `null` si todavía no.
 */
export function ponerFecha(e: Estado, parte: Partial<Pick<Estado, 'dia' | 'mes' | 'anio'>>, hoy = new Date()): { e: Estado; guardar: string | null } {
  const n = { ...e, ...parte }
  const x = edad(n, hoy)
  if (x === null || x < 18) {
    const { nacimiento: _fuera, ...resto } = n.r
    return { e: { ...n, r: resto }, guardar: null }
  }
  const dos = (v: string | number) => String(v).padStart(2, '0')
  const iso = reglas.fechaAISO(`${dos(n.dia)}/${dos(n.mes)}/${n.anio}`)
  return { e: { ...n, r: { ...n.r, nacimiento: iso } }, guardar: iso }
}

/** El chip bajo la fecha. */
export function textoEdad(e: Estado, hoy = new Date()): string | null {
  const x = edad(e, hoy)
  if (x === null) return null
  return x < 18 ? T.edadMenor : T.edad(x)
}

/** Lo que se manda por una pregunta: su código, su lista de códigos o su texto. */
export function valorDe(e: Estado, q: Pregunta): string | string[] | null {
  if (q.tipo === 'texto') return e.empleador
  const v = e.r[q.clave]
  return v === undefined ? null : v
}

/**
 * Al pasar de pantalla se reenvía lo que hay en ella, no solo lo tocado:
 * `idiomas` viene premarcado y quien no lo cambiaba nunca lo guardaba (se
 * quedaba en 16 de 17 para siempre). Reenviar es idempotente.
 */
export const aReenviar = (e: Estado, preguntas: Pregunta[]) =>
  visibles(e, preguntas).filter((q) => {
    if (q.tipo === 'texto') return false
    const v = e.r[q.clave]
    return v !== undefined && !(Array.isArray(v) && !v.length)
  })

/** Cuántas obligatorias hay, del catálogo: el «Dieciséis respuestas» del cierre. */
export const obligatorias = (preguntas: Pregunta[]) => preguntas.filter((q) => q.obligatoria).length

/** Los nombres de lo que falta, para decírselo a una persona (no los códigos). */
export const nombresDe = (claves: string[]) => claves.map((c) => T.corto[c] ?? c)

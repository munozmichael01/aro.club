/**
 * La verificación, sin React. Las fases de la web (sin la del QR, que es del
 * ordenador) con un cambio que pide el pedido (§7, criterio 9.3): la foto NO
 * se sube al hacerla. Se hace, se ve, y solo al pulsar «Usar esta» se envía;
 * «Repetir» antes de eso no toca el servidor.
 *
 * Qué falta lo dice el servidor (`cedulaLista`, `selfieLista`), no la
 * pantalla: se arranca y se repite solo lo que falta.
 */

export const TIPOS = ['cedula', 'selfie'] as const
export type Toma = 0 | 1
export type Fase = 'intro' | 'captura' | 'revision' | 'hecha' | 'rechazo'

export type Motivo = { mensaje: string; permiteReintento: boolean }

export type Estado = {
  fase: Fase
  toma: Toma
  /** Las fotos que el servidor todavía no tiene, en orden. */
  pendientes: Toma[]
  /** La foto hecha y AÚN NO enviada: se ve, y se usa o se repite. */
  previa: string | null
  subiendo: boolean
  intentos: number
  fallo: string
  motivo: Motivo | null
  revisadaEl: string | null
  seBorraEl: string | null
  yaBorradas: boolean
}

export const inicial = (): Estado => ({
  fase: 'intro',
  toma: 0,
  pendientes: [0, 1],
  previa: null,
  subiendo: false,
  intentos: 0,
  fallo: '',
  motivo: null,
  revisadaEl: null,
  seBorraEl: null,
  yaBorradas: false,
})

export type DeServidor = {
  estado: 'sin-empezar' | 'revision' | 'rechazada' | 'aprobada' | string
  cedulaLista?: boolean
  selfieLista?: boolean
  motivo?: Motivo | null
  revisadaEl?: string | null
  seBorraEl?: string | null
  yaBorradas?: boolean
}

const faltan = (d: DeServidor): Toma[] => [...(d.cedulaLista ? [] : [0 as Toma]), ...(d.selfieLista ? [] : [1 as Toma])]

export function desdeServidor(e: Estado, d: DeServidor): Estado {
  const base = { ...e, pendientes: faltan(d), motivo: d.motivo ?? null }
  if (d.estado === 'aprobada')
    return { ...base, fase: 'hecha', revisadaEl: d.revisadaEl ?? null, seBorraEl: d.seBorraEl ?? null, yaBorradas: !!d.yaBorradas }
  if (d.estado === 'rechazada') return { ...base, fase: 'rechazo' }
  if (d.estado === 'revision') return { ...base, fase: 'revision' }
  // Con una foto ya mandada no se vuelve a la intro: se entra directo en la
  // que falta. Explicarle otra vez que son dos fotos a quien ya mandó una es
  // hacerle repetir el camino.
  if (base.pendientes.length === 1) return { ...base, fase: 'captura', toma: base.pendientes[0] }
  return { ...base, fase: 'intro' }
}

/** Empezar (o repetir tras un rechazo): por la primera que falta. */
export function empezar(e: Estado): Estado {
  const pendientes = e.pendientes.length ? e.pendientes : ([0, 1] as Toma[])
  return { ...e, fase: 'captura', pendientes, toma: pendientes[0], previa: null, fallo: '' }
}

export const conFoto = (e: Estado, uri: string): Estado => ({ ...e, previa: uri, fallo: '' })
export const repetir = (e: Estado): Estado => ({ ...e, previa: null, fallo: '' })
export const subiendo = (e: Estado): Estado => ({ ...e, subiendo: true, fallo: '' })

/**
 * La marca se pone cuando el servidor la tiene, no al elegirla: un «lista»
 * con la subida caída sería mentir en verde. Sin más pendientes, a revisión.
 */
export function subida(e: Estado): Estado {
  const pendientes = e.pendientes.filter((t) => t !== e.toma)
  if (!pendientes.length) return { ...e, subiendo: false, intentos: 0, previa: null, pendientes, fase: 'revision' }
  return { ...e, subiendo: false, intentos: 0, previa: null, pendientes, toma: pendientes[0] }
}

/** La foto no se pierde: se queda en pantalla para reintentar con la misma. */
export const falloAlSubir = (e: Estado, error: string): Estado => ({ ...e, subiendo: false, intentos: e.intentos + 1, fallo: error })

/** Dos fallos seguidos: se ofrece otra vía. Un error idéntico tres veces no es información, es un muro. */
export const atascado = (e: Estado) => e.intentos >= 2

/** Las barras de los dos pasos: hechos, el actual, y lo que falta. */
export function barras(e: Estado): ('hecha' | 'actual' | 'falta')[] {
  return ([0, 1] as Toma[]).map((t) => (!e.pendientes.includes(t) ? 'hecha' : t === e.toma ? 'actual' : 'falta'))
}

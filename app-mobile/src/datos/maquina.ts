import { reglas } from '../reglas'
import * as T from '../texto/datos'

/**
 * Los datos personales, sin React: los mismos cuatro pasos que
 * `Datos base.dc.html`, el paso del correo delante (-1) para quien llega sin
 * nada, y el resumen (4) donde, si el servidor ya lo permite, se crea la cuenta.
 *
 * Todas las reglas de los campos son las de `reglas.js`, cargado, no copiado.
 */

export const PASO_CORREO = -1
export const PASO_FIN = 4

export type Estado = {
  paso: number
  correo: string
  nombre: string
  trato: string
  dia: string
  /** 1–12, o 0 si no se ha elegido. */
  mes: number
  anio: string
  /** El CÓDIGO del catálogo (`mujer`, `no-binario`…), nunca una posición. */
  genero: string | null
  prefijo: string
  telefono: string
  clave: string
  clave2: string
  verClave: boolean
  puedeCuenta: boolean
}

export const inicial = (): Estado => ({
  paso: 0,
  correo: '',
  nombre: '',
  trato: '',
  dia: '',
  mes: 0,
  anio: '',
  genero: null,
  prefijo: '+58',
  telefono: '',
  clave: '',
  clave2: '',
  verClave: false,
  puedeCuenta: false,
})

/** La edad a una fecha dada. `null` si la fecha no existe (31 de febrero) o está a medias. */
export function edad(e: Pick<Estado, 'dia' | 'mes' | 'anio'>, hoy: Date): number | null {
  const d = parseInt(e.dia, 10)
  const m = e.mes
  const a = parseInt(e.anio, 10)
  if (!d || !m || !a || e.anio.length !== 4) return null
  const n = new Date(a, m - 1, d)
  if (n.getFullYear() !== a || n.getMonth() !== m - 1 || n.getDate() !== d) return null
  let anios = hoy.getFullYear() - a
  if (hoy.getMonth() < m - 1 || (hoy.getMonth() === m - 1 && hoy.getDate() < d)) anios--
  return anios
}

/** El número entero en E.164, con el prefijo del selector: la misma expresión para guardar y para enseñar. */
export const telefonoE164 = (e: Pick<Estado, 'prefijo' | 'telefono'>) => reglas.aE164(e.prefijo + e.telefono)
export const telefonoValido = (e: Pick<Estado, 'prefijo' | 'telefono'>) => reglas.valido('telefonoPerfil', e.prefijo + e.telefono)

/** «+58 412 1234567», desde el E.164 que se va a mandar: lo que se enseña es lo que se guarda. */
export function telefonoBonito(e: Pick<Estado, 'prefijo' | 'telefono'>): string {
  if (!telefonoValido(e)) return '—'
  const e164 = telefonoE164(e)
  const resto = e.prefijo && e164.startsWith(e.prefijo) ? e164.slice(e.prefijo.length) : e164.replace(/^\+/, '')
  return (e.prefijo ? e.prefijo + ' ' : '+') + resto.replace(/(\d{3})(?=\d)/, '$1 ')
}

/** Si el paso actual deja seguir, y si no, qué falta (es el texto del botón). */
export function validar(e: Estado, hoy: Date): { listo: boolean; falta: string } {
  switch (e.paso) {
    case PASO_CORREO: {
      const c = e.correo.trim()
      return { listo: reglas.valido('correo', c), falta: c ? T.correo.revisar : T.correo.vacio }
    }
    case 0: {
      const n = e.nombre.trim()
      return { listo: n.length >= 2, falta: n ? T.nombre.corto : T.nombre.vacio }
    }
    case 1: {
      const x = edad(e, hoy)
      const incompleta = !e.dia || !e.mes || !e.anio
      return {
        listo: x !== null && x >= 18 && x <= 99,
        falta: incompleta ? T.nacimiento.incompleta : x !== null && x < 18 ? T.nacimiento.menorCorto : T.nacimiento.revisar,
      }
    }
    case 2:
      return { listo: !!e.genero, falta: T.genero.falta }
    case 3:
      return { listo: telefonoValido(e), falta: e.telefono.replace(/\D/g, '') ? T.telefono.corto : T.telefono.vacio }
    default:
      return { listo: true, falta: '' }
  }
}

/** El aviso bajo la fecha: menor de edad, o una fecha que no cuadra. */
export function avisoEdad(e: Estado, hoy: Date): string | null {
  const x = edad(e, hoy)
  if (x === null) return null
  if (x < 18) return T.nacimiento.menor
  if (x > 99) return T.nacimiento.rara
  return null
}

/** El error del teléfono, solo cuando ya hay cifras suficientes para juzgarlo. */
export function errorTelefono(e: Estado): string | null {
  return e.telefono.replace(/\D/g, '').length >= 8 && !telefonoValido(e) ? T.telefono.incompleto : null
}

/** El «¿Cómo quieres que te llamen?» sugerido: el primer nombre. */
export const tratoSugerido = (e: Estado) => e.nombre.trim().split(' ')[0] || T.nombre.tratoEjemplo

export type DeServidor = {
  nombre?: string | null
  trato?: string | null
  nacimiento?: string | null
  genero?: string | null
  telefono?: string | null
  puedeCuenta?: boolean
}

/**
 * Lo que ya había guardado, al estado. Quien llega con los cuatro datos
 * aterriza en el resumen, no en el paso 1: es el camino normal (el
 * cuestionario manda aquí al terminar), y «PASO 1 DE 4» con todo relleno se
 * lee como que no se guardó nada.
 */
export function desdeServidor(e: Estado, d: DeServidor): Estado {
  const tel = reglas.partirTelefono(d.telefono || '')
  const fecha = reglas.fechaDesdeISO(d.nacimiento || '')
  const [dia, mes, anio] = fecha ? fecha.split('/') : ['', '', '']
  const completo = !!(d.nombre && d.trato && d.nacimiento && d.genero && d.telefono)
  return {
    ...e,
    nombre: d.nombre || '',
    trato: d.trato || '',
    dia: dia ? String(parseInt(dia, 10)) : '',
    mes: mes ? parseInt(mes, 10) : 0,
    anio: anio || '',
    genero: d.genero || null,
    prefijo: tel.prefijo,
    telefono: tel.resto,
    puedeCuenta: !!d.puedeCuenta,
    paso: completo && e.paso === 0 ? PASO_FIN : e.paso,
  }
}

/** Lo que se manda a `/api/datos-base`: los cuatro de una vez, validados juntos. */
export function cuerpoGuardar(e: Estado) {
  const dos = (x: string | number) => String(x).padStart(2, '0')
  return {
    nombre: e.nombre.trim(),
    trato: e.trato.trim(),
    nacimiento: reglas.fechaAISO(`${dos(e.dia)}/${dos(e.mes)}/${e.anio}`),
    genero: e.genero,
    telefono: telefonoE164(e),
  }
}

/** La tarjeta de la contraseña: qué dice el botón, si se puede crear y qué avisa. */
export function estadoClave(e: Estado) {
  const larga = reglas.valido('clave', e.clave)
  const dispares = !!e.clave2 && e.clave !== e.clave2
  const lista = larga && e.clave === e.clave2
  const boton = !larga ? T.cuenta.boton.corta : !e.clave2 ? T.cuenta.boton.repetir : dispares ? T.cuenta.boton.dispares : T.cuenta.boton.crear
  return { lista, dispares, boton, pista: larga ? T.cuenta.pistaLista : T.cuenta.pistaCorta }
}

export type Fila = { campo: string; valor: string; visible: string; loVen: boolean; editar: number | null }

/** «Lo que guardamos»: cada fila vuelve a su paso; el correo no, porque cambiarlo es empezar de nuevo. */
export function resumen(e: Estado, correo: string, generoTexto: string | null, hoy: Date): Fila[] {
  const x = edad(e, hoy)
  const F = T.fin.filas
  const V = T.fin.visible
  return [
    { campo: F.correo, valor: correo || '—', visible: V.equipo, loVen: false, editar: null },
    { campo: F.nombre, valor: e.nombre.trim() || '—', visible: V.equipo, loVen: false, editar: 0 },
    { campo: F.trato, valor: e.trato.trim() || e.nombre.trim().split(' ')[0] || '—', visible: V.cinco, loVen: true, editar: 0 },
    { campo: F.edad, valor: x !== null ? T.nacimiento.edad(x) : '—', visible: V.nadie, loVen: false, editar: 1 },
    { campo: F.genero, valor: generoTexto || '—', visible: V.nadie, loVen: false, editar: 2 },
    { campo: F.telefono, valor: telefonoBonito(e), visible: V.eseDia, loVen: false, editar: 3 },
  ]
}

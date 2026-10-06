/**
 * Las push, sin React ni módulos nativos: a dónde lleva tocar una.
 *
 * Cada push cuelga de un correo que ya existe (NOTIFICACIONES.md): el
 * servidor la manda en el mismo sitio donde encola el correo, con su `tipo`
 * en `data`. Aquí solo se decide qué pantalla abre.
 *
 * Solo rutas de la app, de una lista cerrada: aunque las push las manda
 * nuestro servidor, `data` es texto que viene de fuera, y una ruta
 * cualquiera no se abre.
 */

/** Qué pantalla abre cada tipo (los mismos nombres que los correos). */
const POR_TIPO: Record<string, string> = {
  mesa_asignada: '/mesa',
  mesa_cambiada: '/mesa',
  recordatorio: '/mesa',
  llego_tarde: '/mesa',
  pago_confirmado: '/mesa',
  puesto_con_cupon: '/mesa',
  verificacion: '/verificacion',
  verificacion_rechazada: '/verificacion',
  abrimos_zona: '/cuenta',
  sin_mesa: '/cuenta',
  fecha_cancelada: '/cuenta',
  cierra_manana: '/cuenta',
  pago_no_cuadra: '/pago',
}

/** Las rutas que una push puede abrir. `/pago` solo con su `evento`. */
const PERMITIDAS = ['/mesa', '/verificacion', '/cuenta', '/perfil', '/pago']

export type DatosPush = { tipo?: unknown; ruta?: unknown; eventoId?: unknown }

/** La pantalla que abre una push, o `null` si no se sabe (entonces no se navega). */
export function destinoDe(data: DatosPush | null | undefined): string | null {
  if (!data) return null
  const evento = typeof data.eventoId === 'string' && /^[0-9a-f-]{36}$/i.test(data.eventoId) ? data.eventoId : null

  // Si el servidor dice la ruta, manda ella, siempre que sea de la lista.
  const ruta = typeof data.ruta === 'string' ? data.ruta : null
  const base = ruta ? ruta.split('?')[0] : null
  const elegida = base && PERMITIDAS.includes(base) ? base : typeof data.tipo === 'string' ? POR_TIPO[data.tipo] ?? null : null
  if (!elegida) return null

  // Pago sin fecha no sabe qué cobrar: mejor el Inicio, que lo tiene.
  if (elegida === '/pago') return evento ? `/pago?evento=${evento}` : '/cuenta'
  return elegida
}

/** El token se manda otra vez solo si cambió o pasó una semana: el servidor guarda `visto_en`. */
export const SEMANA = 7 * 24 * 3600 * 1000
export function hayQueMandar(ultimo: { token: string; en: number } | null, token: string, ahora: number): boolean {
  return !ultimo || ultimo.token !== token || ahora - ultimo.en > SEMANA
}

// --- La pregunta previa ------------------------------------------------------
//
// El texto de iOS no se puede cambiar y solo sale UNA vez: si dicen que no,
// recuperarlo depende de que vayan a Ajustes. Por eso antes sale la nuestra
// («¿Te avisamos…?»): solo «Sí, avísame» gasta la del sistema, y «Ahora no»
// la guarda para otro momento.
//
// Tres momentos, decididos con Michael el 02-10-2026, cada uno una vez:
//   alta          al terminar el alta: «abrimos fecha en tu zona» llega
//                 aunque no haya verificado ni reservado;
//   verificacion  al subir la cédula y la selfie: espera un resultado;
//   reserva       al apartar puesto: espera su mesa.
// Si el sistema ya tiene respuesta (sí o no), no se pregunta nunca más.

export type Momento = 'alta' | 'verificacion' | 'reserva'
export type Permiso = { estado: 'granted' | 'denied' | 'undetermined'; puedePreguntar: boolean }

export function debePreguntar(permiso: Permiso, vistos: Momento[], momento: Momento): boolean {
  // Sin respuesta del sistema = todo lo que no es «granted» y aún se puede
  // preguntar. iOS dice `undetermined`; Android, antes de preguntar, puede
  // decir `denied` con `canAskAgain: true`, y con solo `undetermined` la
  // hoja no salía nunca en Android (testers, 05-10-2026).
  return permiso.estado !== 'granted' && permiso.puedePreguntar && !vistos.includes(momento)
}

/** «Chacao», «Chacao y otras» o nada: el nombre de la zona para la pregunta del alta. */
export function zonaParaPregunta(nombres: string[]): string | null {
  if (!nombres.length) return null
  return nombres.length === 1 ? nombres[0] : `${nombres[0]} y otras`
}

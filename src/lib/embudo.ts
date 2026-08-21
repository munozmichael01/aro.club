import 'server-only'

import { leerCatalogo } from '@/lib/questionnaire/catalogo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * ¿Qué le falta a esta persona? Una respuesta, no cinco opiniones.
 *
 * Cada pantalla decidía por su cuenta dónde estaba alguien en el embudo, y de
 * ahí salieron los dos agujeros que dieron origen a esto:
 *
 *  - el cuestionario dejaba terminar sin datos de contacto, y `/api/cuenta`
 *    creaba la cuenta igual: hay un perfil en `pending_verification` sin
 *    fecha de nacimiento ni teléfono, y la cola de verificaciones no puede
 *    comparar el documento contra una fecha que no existe;
 *  - la pantalla decía «COMPLETO» contando lo que la persona había pulsado,
 *    no lo que se había guardado.
 *
 * La cadena de abajo ya existía —dentro de `/api/mi-cuenta`, y solo la usaba
 * esa ruta—. Aquí es de todos: el cuestionario al abrir, la pantalla de datos
 * al terminar, `/api/cuenta` antes de crear nada y la vuelta de sesión.
 *
 * ## El orden importa y es este
 *
 *   correo → preguntas → contacto → cuenta → verificación
 *
 * Los datos de contacto van ANTES que la verificación, y no es un detalle de
 * presentación: a quien le falta la fecha de nacimiento no se le puede pedir
 * que verifique, porque verificar es comparar el documento contra esa fecha.
 * Decirle «verifica tu identidad» a quien todavía no nos ha dicho cuándo
 * nació es mandarlo a una puerta que no abre.
 *
 * ## Y el nacimiento va pronto
 *
 * Dentro de las preguntas, el nacimiento es la primera: es la puerta de los
 * 18 años, y no se rechaza a nadie después de diecisiete preguntas.
 */

/** Los pasos, en orden. `listo` es haberlos pasado todos. */
export type Paso = 'correo' | 'preguntas' | 'contacto' | 'cuenta' | 'verificacion' | 'listo'

export type Situacion = {
  paso: Paso
  /** Qué falta exactamente, para poder decirlo en vez de solo señalar. */
  falta: {
    preguntas: string[]
    contacto: ('nombre' | 'nacimiento' | 'telefono')[]
  }
  /** Dónde se completa el paso pendiente. */
  donde: string
  /** Si ya se puede reservar: todo lo anterior hecho y verificada. */
  puedeReservar: boolean
}

/** Los tres que hacen falta para sentar a alguien y para verificarla. */
type Contacto = {
  full_name: string | null
  birthdate: string | null
  phone_e164: string | null
}

const RUTA: Record<Paso, string> = {
  correo: '/',
  preguntas: '/cuestionario',
  contacto: '/datos',
  cuenta: '/datos',
  verificacion: '/verificacion',
  listo: '/cuenta',
}

/**
 * Las obligatorias que faltan por contestar, según el catálogo activo.
 *
 * Se cuenta contra lo GUARDADO, que es el punto: el contador de la pantalla
 * contaba pulsaciones y por eso podía decir «catorce respuestas» con la base
 * vacía.
 */
async function preguntasQueFaltan(respuestas: Record<string, unknown>): Promise<string[]> {
  const catalogo = await leerCatalogo()
  if (!catalogo) return []

  return catalogo.preguntas
    .filter((p) => p.obligatoria)
    .filter((p) => {
      const v = respuestas[p.clave]
      if (v == null) return true
      if (Array.isArray(v)) return v.length === 0
      return String(v).trim() === ''
    })
    .map((p) => p.clave)
}

/**
 * Lo que falta de CONTACTO: nombre y teléfono.
 *
 * El nacimiento ya no está aquí. Desde que es una pregunta del cuestionario
 * lo cuenta `preguntasQueFaltan`, y tenerlo en los dos sitios hacía que el
 * mismo dato ausente se contara dos veces. El género nunca estuvo.
 */
function contactoQueFalta(c: Contacto | null): Situacion['falta']['contacto'] {
  const falta: Situacion['falta']['contacto'] = []
  if (!c?.full_name?.trim()) falta.push('nombre')
  if (!c?.phone_e164?.trim()) falta.push('telefono')
  return falta
}

/**
 * Las respuestas de quien ya tiene cuenta, tal y como hay que contarlas.
 *
 * Se exporta porque hay DOS pantallas que preguntan lo mismo —Inicio, por
 * `situacionDePerfil`, y Perfil, por `/api/mi-perfil`— y cada una lo estaba
 * resolviendo por su cuenta. Resultado: Inicio decía «completas» y Perfil
 * decía que faltaban dos, al mismo usuario y el mismo día. Dos pantallas no
 * pueden dar dos respuestas a la misma pregunta; la forma de garantizarlo no
 * es escribir el mismo parche dos veces, es que haya una sola función.
 *
 * Sobre el respaldo desde `profiles`: `nacimiento` y `genero` ya viven en
 * `answers` —se rellenaron el 21 de agosto de 2026 y `convertir_lead` los
 * escribe desde entonces—, así que esto no debería hacer falta nunca. Se
 * queda como red: si una fila faltara, la columna sigue siendo el dato de
 * verdad —de ella derivan los rasgos y el pool del reparto— y mandar a
 * alguien a contestar otra vez algo que sí contestó es peor que la red.
 */
export async function respuestasDePerfil(
  perfilId: string,
): Promise<Record<string, unknown>> {
  const admin = createAdminClient()

  const [{ data: perfil }, { data: respuestas }] = await Promise.all([
    admin.from('profiles').select('birthdate, gender').eq('id', perfilId).maybeSingle(),
    admin.from('answers').select('question_key, value').eq('profile_id', perfilId),
  ])

  const dadas: Record<string, unknown> = Object.fromEntries(
    (respuestas ?? []).map((r) => [r.question_key, r.value]),
  )
  if (dadas.nacimiento == null && perfil?.birthdate) dadas.nacimiento = perfil.birthdate
  if (dadas.genero == null && perfil?.gender) dadas.genero = perfil.gender
  return dadas
}

/** Cuántas obligatorias faltan, contando como cuenta todo el mundo. */
export async function faltanDePerfil(perfilId: string): Promise<string[]> {
  return preguntasQueFaltan(await respuestasDePerfil(perfilId))
}

function armar(
  paso: Paso,
  preguntas: string[],
  contacto: Situacion['falta']['contacto'],
): Situacion {
  return {
    paso,
    falta: { preguntas, contacto },
    donde: RUTA[paso],
    puedeReservar: paso === 'listo',
  }
}

/**
 * La situación de un LEAD: alguien que dejó el correo y no tiene cuenta.
 *
 * Sus respuestas viven en `waitlist.profile_answers`, y las que tienen
 * columna propia —arraigo, zonas, días, temas, nacimiento y género— en su
 * columna. Se juntan para preguntar, igual que hace la pantalla.
 */
export async function situacionDeLead(correo: string): Promise<Situacion> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('waitlist')
    .select('email, full_name, birthdate, phone_e164, gender, rootedness, zones, days, conversation_topics, profile_answers, converted_profile_id')
    .eq('email', correo.trim().toLowerCase())
    .maybeSingle()

  if (!data) return armar('correo', [], [])

  // Si ya tiene cuenta, quien manda es el perfil: el lead es su pasado.
  if (data.converted_profile_id) return situacionDePerfil(data.converted_profile_id)

  const respuestas: Record<string, unknown> = {
    ...((data.profile_answers ?? {}) as Record<string, unknown>),
    arraigo: data.rootedness,
    zonas: data.zones,
    dias: data.days,
    temas: data.conversation_topics,
    nacimiento: data.birthdate,
    genero: data.gender,
  }

  const preguntas = await preguntasQueFaltan(respuestas)
  if (preguntas.length) return armar('preguntas', preguntas, [])

  const contacto = contactoQueFalta(data)
  if (contacto.length) return armar('contacto', [], contacto)

  // Contestado y con sus datos: lo que falta es la cuenta.
  return armar('cuenta', [], [])
}

/** La situación de quien ya tiene cuenta. */
export async function situacionDePerfil(perfilId: string): Promise<Situacion> {
  const admin = createAdminClient()

  const [{ data: perfil }, preguntas, { data: verificada }] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name, birthdate, phone_e164, gender')
      .eq('id', perfilId)
      .maybeSingle(),
    faltanDePerfil(perfilId),
    admin.from('v_verified_profiles').select('id').eq('id', perfilId).maybeSingle(),
  ])

  // El contacto va ANTES que las preguntas para quien ya tiene cuenta: sin
  // nombre no se puede verificar, y eso es lo primero que hay que resolver
  // aunque le falten preguntas.
  const contacto = contactoQueFalta(perfil)
  if (contacto.length) return armar('contacto', preguntas, contacto)
  if (preguntas.length) return armar('preguntas', preguntas, [])
  if (!verificada) return armar('verificacion', [], [])

  return armar('listo', [], [])
}

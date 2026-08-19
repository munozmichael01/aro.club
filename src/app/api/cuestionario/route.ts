import { NextResponse } from 'next/server'
import { z } from 'zod'

import { situacionDeLead } from '@/lib/embudo'
import { verificar } from '@/lib/lead-token'
import { leerCatalogo, validar } from '@/lib/questionnaire/catalogo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Guardado incremental del cuestionario, pregunta a pregunta.
 *
 * El contrato pide por pregunta y no por pantalla (HANDOFF §2.4): quien
 * responde tres de las cuatro de una pantalla y cierra, no pierde las tres.
 *
 * GET devuelve lo guardado más lo que se hereda de la landing, para que la
 * pantalla sepa qué esconder y dónde retomar.
 */

const CORREO = z.string().trim().toLowerCase().email().max(254)

/**
 * Las preguntas con COLUMNA PROPIA, que no viven en el jsonb.
 *
 * Las cuatro primeras vienen de la landing. Las dos últimas —nacimiento y
 * género— se añadieron al pasar del formulario de datos al cuestionario, y
 * entran por aquí precisamente para que no haya dos verdades: la edad y el
 * género son las dos restricciones más duras del reparto y su fuente es
 * `profiles.birthdate` / `profiles.gender`, adonde `convertir_lead` las
 * lleva desde estas columnas. Si la respuesta se quedara en el jsonb
 * habríamos creado la fecha de nacimiento número dos.
 */
const HEREDABLES = ['arraigo', 'zonas', 'dias', 'temas', 'nacimiento', 'genero'] as const

type FilaLead = {
  rootedness: string | null
  zones: string[] | null
  days: string[] | null
  conversation_topics: string[] | null
  birthdate: string | null
  gender: string | null
  profile_answers: Record<string, unknown> | null
  questionnaire_screen: number
  profile_completed_at: string | null
}

function heredadasDe(fila: FilaLead): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  if (fila.rootedness) out.arraigo = fila.rootedness
  if (fila.zones?.length) out.zonas = fila.zones
  if (fila.days?.length) out.dias = fila.days
  if (fila.conversation_topics?.length) out.temas = fila.conversation_topics
  if (fila.birthdate) out.nacimiento = fila.birthdate
  if (fila.gender) out.genero = fila.gender
  return out
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const correoCrudo = url.searchParams.get('correo')
  const token = url.searchParams.get('token')

  const parsed = CORREO.safeParse(correoCrudo)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }
  const correo = parsed.data

  if (!verificar(correo, token)) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('waitlist')
    .select('rootedness, zones, days, conversation_topics, birthdate, gender, profile_answers, questionnaire_screen, profile_completed_at')
    .eq('email', correo)
    .maybeSingle<FilaLead>()

  if (error) {
    console.error('[cuestionario] lectura falló', error)
    return NextResponse.json({ error: 'No pudimos recuperar tus respuestas.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const heredadas = heredadasDe(data)

  // Qué le falta lo dice la MISMA pieza que se lo dice a todos los demás. La
  // pantalla ya no lo deduce contando lo que la persona pulsó: contaba
  // pulsaciones, no filas guardadas, y por eso podía decir «COMPLETO» sobre
  // una base vacía cuando los guardados estaban devolviendo 403.
  const situacion = await situacionDeLead(correo)

  return NextResponse.json({
    respuestas: { ...heredadas, ...(data.profile_answers ?? {}) },
    // Cuáles vienen de la landing: el cuestionario las esconde y lo avisa.
    heredadas: Object.keys(heredadas),
    pantalla: data.questionnaire_screen,
    completado: situacion.falta.preguntas.length === 0,
    faltan: situacion.falta.preguntas,
    paso: situacion.paso,
    donde: situacion.donde,
  })
}

const cuerpo = z.object({
  correo: CORREO,
  token: z.string().min(1),
  clave: z.string().min(1).max(40),
  valor: z.union([z.string(), z.array(z.string()), z.null()]),
  /** Pantalla en la que está, para poder retomar. */
  pantalla: z.number().int().min(0).max(4).optional(),
  /** Marca el final; a partir de ahí el cuestionario está completo. */
  fin: z.boolean().optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const parsed = cuerpo.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  // `fin` sigue aceptándose para no romper a una pantalla vieja en vuelo,
  // pero NO se usa: quien decide que el cuestionario está completo es el
  // servidor mirando lo guardado.
  const { correo, token, clave, valor, pantalla } = parsed.data

  if (!verificar(correo, token)) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const catalogo = await leerCatalogo()
  if (!catalogo) {
    return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
  }

  const pregunta = catalogo.porClave.get(clave)
  if (!pregunta) {
    return NextResponse.json({ error: `Pregunta desconocida: ${clave}` }, { status: 400 })
  }

  // Un valor a medias es válido mientras se responde: el mínimo solo se
  // exige al cerrar, no en cada tecla.
  if (valor !== null) {
    const problema = validar(pregunta, valor)
    if (problema) {
      console.error('[cuestionario] respuesta inválida', problema)
      return NextResponse.json({ error: 'Esa respuesta no cuadra.' }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  // Las cuatro de la landing tienen columna propia: se escriben ahí para que
  // el panel y el matcher las vean donde esperan, no duplicadas en el jsonb.
  if ((HEREDABLES as readonly string[]).includes(clave)) {
    const columna: Record<string, unknown> = {}
    if (clave === 'arraigo') columna.rootedness = valor
    if (clave === 'zonas') columna.zones = valor ?? []
    if (clave === 'dias') columna.days = valor ?? []
    if (clave === 'temas') columna.conversation_topics = valor ?? []
    // `single` llega como cadena o como lista de una: se guarda plano, que
    // es lo que espera la columna `gender_t`.
    if (clave === 'genero') columna.gender = Array.isArray(valor) ? valor[0] : valor
    if (clave === 'nacimiento') columna.birthdate = valor

    const { error } = await supabase
      .from('waitlist')
      .update(columna as never)
      .eq('email', correo)

    if (error) {
      console.error('[cuestionario] no se guardó', error)
      return NextResponse.json({ error: 'No pudimos guardar tu respuesta.' }, { status: 500 })
    }
  }

  // El resto va al jsonb, y la fusión la hace Postgres. Leer-modificar-
  // escribir aquí perdía respuestas: dos guardados seguidos leían el mismo
  // estado y el segundo borraba al primero.
  const { error } = await supabase.rpc('guardar_respuesta', {
    p_email: correo,
    p_clave: clave,
    p_valor: (HEREDABLES as readonly string[]).includes(clave) ? null : (valor as never),
    p_pantalla: pantalla ?? 0,
    // NUNCA lo que diga la pantalla. `p_fin` marca `profile_completed_at`, o
    // sea «este cuestionario está terminado», y lo mandaba el cliente: la
    // pantalla se declaraba completa contando lo que la persona había
    // pulsado. Con los guardados devolviendo 403, eso fue exactamente lo que
    // pasó —«COMPLETO · catorce respuestas» sobre una base vacía—.
    //
    // Ahora se cierra cuando las obligatorias del catálogo están GUARDADAS,
    // y eso se pregunta después de escribir esta.
    p_fin: false,
  })

  if (error) {
    console.error('[cuestionario] no se guardó', error)
    return NextResponse.json({ error: 'No pudimos guardar tu respuesta.' }, { status: 500 })
  }

  // Se relee de la base, no del cuerpo de la petición: es la única forma de
  // que «completo» signifique «está escrito» y no «lo pulsó».
  const situacion = await situacionDeLead(correo)
  const completo = situacion.falta.preguntas.length === 0

  // Se cierra con un update directo y NO con la RPC: ahí `p_valor = null`
  // significa «borra esta clave», así que reusarla para marcar el final
  // habría borrado la respuesta que se acaba de guardar. El `is null` lo hace
  // idempotente: la primera vez que se completa, y no cada guardado después.
  if (completo) {
    await supabase
      .from('waitlist')
      .update({ profile_completed_at: new Date().toISOString() } as never)
      .eq('email', correo)
      .is('profile_completed_at', null)
  }

  return NextResponse.json({
    estado: 'guardado',
    // Lo que la pantalla necesita para no tener que adivinarlo.
    completo,
    faltan: situacion.falta.preguntas,
    paso: situacion.paso,
    donde: situacion.donde,
  })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { respuestasDePerfil, situacionDeLead, situacionDePerfil } from '@/lib/embudo'
import { verificar } from '@/lib/lead-token'
import { leerCatalogo, validar } from '@/lib/questionnaire/catalogo'
import { createClient } from '@/lib/supabase/server'
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

/**
 * Quién está contestando: una cuenta o un lead.
 *
 * Son DOS entradas legítimas y en este orden. El token de lead existe para
 * quien todavía no tiene cuenta —el camino normal: correo, preguntas, cuenta
 * al final—. Con Google la cuenta llega primero, y esa persona tiene una
 * sesión de Supabase de verdad: está MÁS autenticada que un lead y la ruta la
 * rechazaba igual.
 *
 * Y no se le fabrica un lead. Duplicaría su identidad y metería un token en
 * la URL de alguien que ya está identificado: es rodear la puerta en vez de
 * abrirla.
 */
type Quien =
  | { tipo: 'perfil'; id: string }
  | { tipo: 'lead'; correo: string }

async function quienContesta(correo: string | null, token: string | null): Promise<Quien | null> {
  // La cuenta primero. Si hay sesión, manda ella: es la identidad fuerte.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return { tipo: 'perfil', id: user.id }

  const parsed = CORREO.safeParse(correo)
  if (!parsed.success || !verificar(parsed.data, token)) return null
  return { tipo: 'lead', correo: parsed.data }
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  const quien = await quienContesta(
    url.searchParams.get('correo'),
    url.searchParams.get('token'),
  )
  if (!quien) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })

  // --- quien ya tiene cuenta ------------------------------------------
  //
  // Sus respuestas viven en `answers`, no en `waitlist`. Y NO se le pasa por
  // `convertir_lead`: no hay lead que convertir, hay una cuenta que contesta.
  //
  // `heredadas` va vacío a propósito. Quien llega por Google sin lead no ha
  // contestado arraigo, zonas, días ni temas —no ha pasado por la landing—
  // así que el cuestionario tiene que preguntárselas. Esconderlas como
  // «heredadas» dejaría un perfil sin zonas, y un perfil sin zonas no se
  // puede sentar en ninguna mesa.
  if (quien.tipo === 'perfil') {
    const respuestas = await respuestasDePerfil(quien.id)
    const situacion = await situacionDePerfil(quien.id)
    const { data: perfil } = await createAdminClient()
      .from('profiles')
      // `as never`: la columna es de esta entrega y los tipos generados no la
      // conocen todavía.
      .select('questionnaire_screen' as never)
      .eq('id', quien.id)
      .maybeSingle()

    // La MISMA forma que la respuesta del lead. Dos formas distintas para la
    // misma pantalla es la manera de que una de las dos se quede vieja.
    return NextResponse.json({
      respuestas,
      heredadas: [],
      pantalla: (perfil as { questionnaire_screen?: number } | null)?.questionnaire_screen ?? 0,
      completado: situacion.falta.preguntas.length === 0,
      faltan: situacion.falta.preguntas,
      paso: situacion.paso,
      donde: situacion.donde,
    })
  }

  const correo = quien.correo
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
  // Opcionales: quien entra con cuenta no tiene llave de lead que mandar, y
  // exigirlas aquí lo dejaba fuera antes de mirar su sesión.
  correo: CORREO.nullish(),
  token: z.string().min(1).nullish(),
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

  const quien = await quienContesta(correo ?? null, token ?? null)
  if (!quien) return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })

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

  // --- quien ya tiene cuenta: se guarda contra SU perfil ---------------
  //
  // No pasa por `waitlist` ni por `convertir_lead`: no hay lead que
  // convertir, hay una cuenta que contesta.
  //
  // Todo va a `answers`, que es de donde `refrescar_rasgos` deriva
  // `profile_traits` —zonas, días, temas, arraigo, sector…— o sea el pool del
  // reparto. Y `nacimiento` y `genero` van ADEMÁS a su columna de `profiles`,
  // porque de ahí es de donde esa misma función saca la edad y el género: sin
  // ese espejo, el perfil quedaría con las respuestas puestas y sin edad, que
  // es un perfil que no se puede sentar.
  if (quien.tipo === 'perfil') {
    const { data: version } = await supabase
      .from('questionnaire_versions')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()

    if (!version) {
      return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
    }

    if (valor === null) {
      await supabase
        .from('answers')
        .delete()
        .eq('profile_id', quien.id)
        .eq('version_id', version.id)
        .eq('question_key', clave)
    } else {
      const { error } = await supabase.from('answers').upsert(
        {
          profile_id: quien.id,
          version_id: version.id,
          question_key: clave,
          value: valor as never,
        } as never,
        { onConflict: 'profile_id,version_id,question_key' },
      )

      if (error) {
        console.error('[cuestionario] no se guardó la respuesta del perfil', error)
        return NextResponse.json({ error: 'No pudimos guardar tu respuesta.' }, { status: 500 })
      }
    }

    const espejo: Record<string, unknown> = { questionnaire_screen: pantalla ?? 0 }
    if (clave === 'nacimiento') espejo.birthdate = valor
    if (clave === 'genero') espejo.gender = Array.isArray(valor) ? valor[0] : valor
    // `rootedness` también: es columna de `profiles` desde el primer día y la
    // usa el panel. `refrescar_rasgos` la deriva de `answers`, así que esto
    // es para que las dos digan lo mismo y no para que el reparto funcione.
    if (clave === 'arraigo') espejo.rootedness = valor

    const { error: errorEspejo } = await supabase
      .from('profiles')
      .update(espejo as never)
      .eq('id', quien.id)

    if (errorEspejo) {
      console.error('[cuestionario] no se guardó el espejo del perfil', errorEspejo)
      return NextResponse.json({ error: 'No pudimos guardar tu respuesta.' }, { status: 500 })
    }

    const situacionPerfil = await situacionDePerfil(quien.id)
    const completoPerfil = situacionPerfil.falta.preguntas.length === 0

    if (completoPerfil) {
      /**
       * Cerrado. En un perfil eso NO es `profile_completed_at` —esa columna
       * es de `waitlist`, y `profiles` no la tiene— sino el estado: se pasa
       * de «le falta el cuestionario» a «le falta verificarse», que es lo
       * mismo que hace `convertir_lead` al crear la cuenta.
       *
       * Lo escribí con la columna del lead y el `update` moría con un 400 en
       * silencio, porque no miraba el error. Ahora se mira.
       */
      const { error: errorCerrar } = await supabase
        .from('profiles')
        .update({ status: 'pending_verification' } as never)
        .eq('id', quien.id)
        .eq('status', 'pending_questionnaire')

      if (errorCerrar) console.error('[cuestionario] no se cerró el perfil', errorCerrar)
    }

    return NextResponse.json({
      estado: 'guardado',
      // `completo`, con el mismo nombre que la rama del lead: la pantalla lee
      // una sola clave y no tiene que saber por dónde entró.
      completo: completoPerfil,
      faltan: situacionPerfil.falta.preguntas,
      paso: situacionPerfil.paso,
      donde: situacionPerfil.donde,
    })
  }

  // De aquí abajo es la rama del LEAD, y ahí el correo existe por
  // construcción: `quienContesta` solo devuelve `lead` si validó la firma.
  const correoLead = quien.correo

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
      .eq('email', correoLead)

    if (error) {
      console.error('[cuestionario] no se guardó', error)
      return NextResponse.json({ error: 'No pudimos guardar tu respuesta.' }, { status: 500 })
    }
  }

  // El resto va al jsonb, y la fusión la hace Postgres. Leer-modificar-
  // escribir aquí perdía respuestas: dos guardados seguidos leían el mismo
  // estado y el segundo borraba al primero.
  const { error } = await supabase.rpc('guardar_respuesta', {
    p_email: correoLead,
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
  const situacion = await situacionDeLead(correoLead)
  const completo = situacion.falta.preguntas.length === 0

  // Se cierra con un update directo y NO con la RPC: ahí `p_valor = null`
  // significa «borra esta clave», así que reusarla para marcar el final
  // habría borrado la respuesta que se acaba de guardar. El `is null` lo hace
  // idempotente: la primera vez que se completa, y no cada guardado después.
  if (completo) {
    await supabase
      .from('waitlist')
      .update({ profile_completed_at: new Date().toISOString() } as never)
      .eq('email', correoLead)
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

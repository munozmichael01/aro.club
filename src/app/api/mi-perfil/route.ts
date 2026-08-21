import { NextResponse } from 'next/server'
import { z } from 'zod'

import { valido } from '@/lib/reglas'
import { faltanDePerfil, respuestasDePerfil } from '@/lib/embudo'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Mi perfil: ver y editar lo que respondió.
 *
 * Las opciones salen del catálogo de preguntas, no de una copia en la
 * pantalla. La copia ya había derivado: seguía ofreciendo «Soy extranjero
 * viviendo aquí», que dejó de existir en la entrega 7, y no tenía los dos
 * códigos nuevos. Una pantalla que ofrece una opción que la base rechaza es
 * un callejón sin salida para quien la elige.
 *
 * Los datos base van aparte porque no son respuestas: viven en el perfil y
 * los usa el reparto directamente.
 */

const guardar = z.object({
  clave: z.string().min(1),
  valor: z.union([z.string(), z.array(z.string()), z.null()]),
})

const BASE = new Set(['nombre', 'trato', 'nacimiento', 'genero', 'telefono'])

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('profiles')
    .select('full_name, display_name, birthdate, gender, phone_e164')
    .eq('id', user.id)
    .maybeSingle()

  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const { data: preguntas } = await admin
    .from('questions')
    .select('key, prompt, help_text, input_type, options, min_select, max_select, is_required, exclusive_value, screen, sort_order')
    .eq('version_id', version?.id ?? 0)
    .order('screen')
    .order('sort_order')

  // Los valores que se pintan en cada pregunta salen de la MISMA fuente con
  // la que se cuenta lo que falta. Leyendo `answers` a secas aquí y contando
  // con el respaldo allí, la pantalla podía decir «completo» y enseñar el
  // campo del nacimiento vacío.
  const dadas = new Map(Object.entries(await respuestasDePerfil(user.id)))

  // Sus cenas (§10): el historial vive aqui porque es identidad acumulada,
  // no algo que tengas que hacer, y en la portada era una lista sin techo.
  //
  // DONDE y CUANDO, nunca con quien. Aro no es una agenda de contactos: los
  // nombres de quienes se sentaron contigo no vuelven a aparecer despues de
  // la cena, y esa lista seria justo eso.
  const { data: susCenas } = await admin
    .from('bookings')
    .select(
      'id, status, cancelled_at, events(starts_at, format, reveal_at), table_members(dinner_tables(table_number, restaurants!dinner_tables_restaurant_id_fkey(name)))',
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60)

  const ahoraMs = Date.now()
  const historial = (susCenas ?? [])
    .map((b) => {
      const ev = b.events as unknown as { starts_at: string; format: string; reveal_at: string } | null
      if (!ev) return null
      const empiezaMs = new Date(ev.starts_at).getTime()
      // Solo lo que ya paso: lo que tiene fecha por delante vive en "Lo
      // proximo", en la portada. Que una fecha aparezca en las dos listas
      // es como se acaba cancelando dos veces la misma reserva.
      if (empiezaMs > ahoraMs) return null
      const mesa = (b.table_members as unknown as {
        dinner_tables: { table_number: number; restaurants: { name: string } | null } | null
      }[])?.[0]?.dinner_tables
      return {
        cuando: ev.starts_at,
        formato: ev.format,
        sitio: mesa?.restaurants?.name ?? null,
        numeroMesa: mesa?.table_number ?? null,
        // Lo que de verdad paso, en sus palabras y no en las nuestras.
        estado: b.cancelled_at || b.status === 'cancelled_by_user'
          ? 'cancelaste'
          : b.status === 'attended'
            ? 'fuiste'
            : 'no-llegaste',
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    // Por la fecha de la cena, no por cuando se hizo la reserva: dos
    // reservas hechas el mismo dia para cenas de meses distintos salian en
    // el orden en que se apunto, que en un historial no significa nada.
    .sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime())

  const cenas = historial.filter((c) => c.estado === 'fuiste').length

  // Los tres sellos de la cabecera estaban escritos a mano: "Identidad
  // verificada", "Perfil completo" y "3 creditos" fijos, en la pantalla que
  // resume su estado.
  const { data: verificaciones } = await admin
    .from('verifications')
    .select('kind, status')
    .eq('profile_id', user.id)
    .eq('status', 'approved')

  const tipos = new Set((verificaciones ?? []).map((v) => v.kind))

  const { data: saldo } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', user.id)
    .maybeSingle()

  // El perfil completo son DIECINUEVE: las dieciséis preguntas obligatorias
  // del cuestionario más los tres datos de contacto.
  //
  // Eran «catorce más cinco», y el cinco incluía nacimiento y género. Cuando
  // esos dos pasaron a ser preguntas, las obligatorias subieron a dieciséis y
  // los dos datos se quedaron ADEMÁS en la base: se contaban dos veces. Y
  // como el hueco se cuenta desde sitios distintos —`answers` para la
  // pregunta, la columna para el dato base— esta pantalla podía decir que
  // faltaban dos mientras Inicio decía que no faltaba ninguna. El mismo
  // usuario, el mismo día, dos respuestas.
  //
  // Ahora las preguntas se cuentan con `faltanDePerfil`, que es la MISMA
  // función que usa Inicio. No es que las dos cuenten igual: es que cuentan
  // una sola vez, en un solo sitio.
  const obligatorias = (preguntas ?? []).filter((q) => q.is_required)
  const faltanPreguntas = (await faltanDePerfil(user.id)).length

  const base = {
    nombre: perfil?.full_name,
    trato: perfil?.display_name,
    telefono: perfil?.phone_e164,
  }
  const faltanBase = Object.values(base).filter((v) => !v).length

  const faltan = faltanPreguntas + faltanBase
  const total = obligatorias.length + Object.keys(base).length

  return NextResponse.json({
    verificada: tipos.has('id_document') && tipos.has('selfie'),
    completo: faltan === 0,
    faltan,
    // El total y el desglose, para que la pantalla no tenga que deducirlos
    // ni —peor— llevar su propia cuenta y discrepar de esta.
    total,
    faltanPreguntas,
    faltanBase,
    creditos: saldo?.balance ?? 0,
    base: {
      nombre: perfil?.full_name ?? '',
      trato: perfil?.display_name ?? '',
      nacimiento: perfil?.birthdate ?? '',
      genero: perfil?.gender ?? null,
      telefono: perfil?.phone_e164 ?? '',
    },
    preguntas: (preguntas ?? []).map((q) => ({
      clave: q.key,
      enunciado: q.prompt,
      ayuda: q.help_text,
      tipo: q.input_type,
      opciones: q.options,
      min: q.min_select,
      max: q.max_select,
      obligatoria: q.is_required,
      exclusiva: q.exclusive_value,
      pantalla: q.screen,
      valor: dadas.get(q.key) ?? null,
    })),
    cenas,
    historial,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = guardar.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const { clave, valor } = parsed.data
  const admin = createAdminClient()

  // --- datos base -------------------------------------------------------
  if (BASE.has(clave)) {
    const columna = {
      nombre: 'full_name',
      trato: 'display_name',
      nacimiento: 'birthdate',
      genero: 'gender',
      telefono: 'phone_e164',
    }[clave]!

    if (typeof valor !== 'string' || !valor.trim()) {
      return NextResponse.json({ error: 'Ese dato no puede quedar vacío.' }, { status: 400 })
    }

    // El teléfono del perfil admite cualquier prefijo internacional: hay
    // miembros escribiendo desde fuera y exigir un móvil venezolano los
    // dejaba sin poder guardar el suyo. El del pago móvil sí es venezolano,
    // porque ahí es un dato del banco, y esa regla vive en `reglas.js`.
    if (clave === 'telefono' && !valido('telefonoPerfil', valor)) {
      return NextResponse.json(
        { error: 'Ese teléfono no parece válido. Ponlo con el prefijo de tu país.' },
        { status: 400 },
      )
    }

    const { error } = await admin
      .from('profiles')
      .update({ [columna]: valor } as never)
      .eq('id', user.id)

    if (error) {
      console.error('[mi-perfil] no se guardó el dato base', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    // El trigger de `profiles` recalcula los rasgos si cambió nacimiento o
    // género, así que el reparto se entera solo.
    return NextResponse.json({ estado: 'guardado' })
  }

  // --- respuestas -------------------------------------------------------
  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const { data: pregunta } = await admin
    .from('questions')
    .select('key, input_type, options, min_select, is_required')
    .eq('version_id', version?.id ?? 0)
    .eq('key', clave)
    .maybeSingle()

  if (!pregunta) return NextResponse.json({ error: 'Esa pregunta no existe.' }, { status: 404 })

  // Se valida contra el catálogo. Es lo que impide que una pantalla vieja
  // guarde un código retirado —como `extranjero`— y lo deje ahí para que
  // el reparto se lo encuentre.
  const validos = new Set(
    ((pregunta.options ?? []) as { value: string }[]).map((o) => o.value),
  )

  if (pregunta.input_type !== 'text' && validos.size) {
    const lista = Array.isArray(valor) ? valor : valor ? [valor] : []
    const fuera = lista.filter((v) => !validos.has(v))
    if (fuera.length) {
      console.error('[mi-perfil] código fuera de catálogo', clave, fuera)
      return NextResponse.json({ error: 'Esa opción ya no existe.' }, { status: 400 })
    }
    if (pregunta.is_required && lista.length < (pregunta.min_select ?? 1)) {
      return NextResponse.json({ error: 'Falta elegir.' }, { status: 400 })
    }
  }

  const { error } = await admin
    .from('answers')
    .upsert(
      {
        profile_id: user.id,
        version_id: version?.id ?? 0,
        question_key: clave,
        value: valor as never,
      },
      { onConflict: 'profile_id,version_id,question_key' },
    )

  if (error) {
    console.error('[mi-perfil] no se guardó la respuesta', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  // El trigger de `answers` recalcula los rasgos: editar aquí cambia el
  // reparto de la próxima fecha sin que nadie tenga que acordarse.
  return NextResponse.json({ estado: 'guardado' })
}

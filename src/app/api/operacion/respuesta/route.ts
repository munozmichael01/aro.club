import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Corregir una respuesta del cuestionario de otra persona.
 *
 * Es lo más delicado que hace el panel sobre un perfil. El cuestionario es
 * lo que dijo ELLA, y escribir ahí desde fuera convierte su respuesta en la
 * nuestra. Por eso: `motivo` obligatorio, con su nombre en el historial, y
 * nunca sin que lo haya pedido.
 *
 * EXISTE PORQUE LA ALTERNATIVA ERA PEOR. Daniela —la de la cena del 10-10—
 * marcó «Hombre» por error y es «Mujer». Eso no es cosmético: el reparto
 * equilibra la mesa por género, así que una respuesta mal puesta sienta mal
 * a seis personas. Sin esta ruta, la única salida era tocar la fila a mano,
 * que no deja rastro y se salta el trigger que deriva los rasgos.
 *
 * VA POR EL CAMINO NORMAL. Escribe en `answers`, que es la fuente, y deja
 * que `trg_rasgos` recalcule `profile_traits` —de donde lee el reparto— y
 * actualiza el espejo de `profiles` para las claves que lo tienen. Lo mismo
 * que hace `/api/cuestionario` cuando contesta la propia persona.
 *
 * Y EL VALOR SE VALIDA CONTRA EL CATÁLOGO. Un código que `questions` no
 * conoce se guarda igual —la columna es texto— y lo que se rompe es el
 * reparto, semanas después, sin que nadie lo relacione. Es el mismo fallo
 * que ya costó una tarde con las opciones del cuestionario.
 */

const cuerpo = z.object({
  profileId: z.string().uuid(),
  clave: z.string().regex(/^[a-z_]+$/),
  /** Un código, o varios si la pregunta es de varias. */
  valor: z.union([z.string(), z.array(z.string())]),
  motivo: z.string().trim().min(5, 'Escribe por qué. Queda en el historial.').max(300),
})

/** Las que además viven en una columna de `profiles`. */
const ESPEJO: Record<string, string> = {
  genero: 'gender',
  arraigo: 'rootedness',
  nacimiento: 'birthdate',
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Petición inválida.' },
      { status: 400 },
    )
  }

  const d = parsed.data
  const admin = createAdminClient()

  const { data: persona } = await admin
    .from('profiles')
    .select('id, display_name, full_name, email, deleted_at')
    .eq('id', d.profileId)
    .maybeSingle()

  if (!persona || persona.deleted_at) {
    return NextResponse.json({ error: 'Esa persona no existe.' }, { status: 404 })
  }

  const quien = persona.display_name || persona.full_name || persona.email

  // La pregunta, de la versión ACTIVA: corregir contra un catálogo viejo
  // escribiría un código que ya no existe.
  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (!version) {
    return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
  }

  const { data: pregunta } = await admin
    .from('questions')
    .select('key, options, input_type')
    .eq('key', d.clave)
    .eq('version_id', version.id)
    .maybeSingle()

  if (!pregunta) {
    return NextResponse.json({ error: `«${d.clave}» no está en el catálogo.` }, { status: 400 })
  }

  const codigos = new Set(
    ((pregunta.options ?? []) as { value: string }[]).map((o) => o.value).filter(Boolean),
  )
  const valores = Array.isArray(d.valor) ? d.valor : [d.valor]

  // Sin opciones es una pregunta de texto o fecha: ahí no hay catálogo que
  // cruzar y se guarda lo que venga.
  if (codigos.size) {
    const malos = valores.filter((v) => !codigos.has(v))
    if (malos.length) {
      return NextResponse.json(
        {
          error: `«${malos.join('», «')}» no es una respuesta de esa pregunta.`,
          opciones: [...codigos],
        },
        { status: 400 },
      )
    }
  }

  const { data: antes } = await admin
    .from('answers')
    .select('value')
    .eq('profile_id', d.profileId)
    .eq('question_key', d.clave)
    .eq('version_id', version.id)
    .maybeSingle()

  // Igual que `/api/cuestionario`: a `answers`, que es de donde el trigger
  // `trg_rasgos` deriva `profile_traits`, que es lo que lee el reparto.
  const { error } = await admin
    .from('answers')
    .upsert(
      {
        profile_id: d.profileId,
        version_id: version.id,
        question_key: d.clave,
        value: d.valor as never,
      },
      { onConflict: 'profile_id,version_id,question_key' },
    )

  if (error) {
    console.error('[respuesta] no se pudo corregir', error)
    return NextResponse.json({ error: 'No pudimos guardar la corrección.' }, { status: 500 })
  }

  const columna = ESPEJO[d.clave]
  if (columna) {
    const { error: errorEspejo } = await admin
      .from('profiles')
      .update({ [columna]: valores[0] } as never)
      .eq('id', d.profileId)
    // El espejo no manda: si falla, la respuesta ya está bien guardada y los
    // rasgos ya se refrescaron. Se anota y se sigue.
    if (errorEspejo) console.error('[respuesta] no se actualizó el espejo', errorEspejo)
  }

  await anotar(actor, 'respuesta_corregida', 'perfil', d.profileId, {
    quien,
    clave: d.clave,
    antes: antes?.value ?? null,
    ahora: d.valor,
    motivo: d.motivo,
  })

  // Lo que ve el reparto AHORA, que es el único sitio donde esto importa.
  const { data: rasgo } = await admin
    .from('profile_traits')
    .select('gender, rootedness')
    .eq('profile_id', d.profileId)
    .maybeSingle()

  return NextResponse.json({
    estado: 'corregida',
    quien,
    antes: antes?.value ?? null,
    ahora: d.valor,
    enElReparto: rasgo ?? null,
  })
}

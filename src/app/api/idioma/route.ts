import { NextResponse } from 'next/server'
import { z } from 'zod'

import { nombreDeIdioma } from '@/lib/idioma'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «¿Hablas inglés?» → sí, y a su perfil.
 *
 * Michael, 20-10: «que se la mostremos a todo el mundo, y al reservar, si no
 * tenemos el inglés de esa persona, le preguntamos ¿hablas inglés? Sí,
 * actualizar mi perfil / No. Si nos dice que sí, lo guardamos y lo dejamos
 * pasar».
 *
 * Esto es ese sí. No es un campo nuevo: AÑADE el idioma a la respuesta
 * `idiomas` del cuestionario, que es donde ya vive el dato y de donde lo lee
 * el candado de las tres puertas. Un segundo sitio con la misma información
 * acabaría diciendo cosas distintas.
 *
 * Se añade, no se sustituye: quien ya tenía español y portugués sigue
 * teniéndolos. Y si ya lo tenía, no se escribe nada y se contesta que sí
 * igual — la pantalla solo necesita saber que puede seguir.
 *
 * Una cosa a la vez y nunca en paralelo con otro guardado del cuestionario:
 * escribir en `answers` dispara la reconstrucción entera de `profile_traits`,
 * y dos escrituras a la vez se pisan. Esta ruta escribe una fila y vuelve.
 */

const cuerpo = z.object({
  // Los mismos que puede pedir una fecha. No es una lista abierta: lo que se
  // guarda aquí decide quién se sienta en esa mesa.
  idioma: z.enum(['en', 'pt', 'fr', 'it']),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Entra para seguir.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const { idioma } = parsed.data
  const admin = createAdminClient()

  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (!version) {
    return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
  }

  const { data: fila } = await admin
    .from('answers')
    .select('value')
    .eq('profile_id', user.id)
    .eq('version_id', version.id)
    .eq('question_key', 'idiomas')
    .maybeSingle()

  const antes = Array.isArray(fila?.value) ? (fila?.value as unknown[]).map((x) => String(x)) : []

  if (antes.includes(idioma)) {
    return NextResponse.json({ estado: 'ya lo tenías', idiomas: antes })
  }

  /**
   * El español va de serie si la respuesta estaba vacía.
   *
   * Quien nunca contestó esta pregunta y ahora dice que habla inglés no está
   * diciendo que NO hable español: está contestando a otra cosa. Guardar solo
   * `['en']` lo dejaría fuera de todas las mesas que algún día pidan español.
   */
  const despues = [...new Set([...(antes.length ? antes : ['es']), idioma])]

  const { error } = await admin.from('answers').upsert(
    {
      profile_id: user.id,
      version_id: version.id,
      question_key: 'idiomas',
      value: despues as never,
    } as never,
    { onConflict: 'profile_id,version_id,question_key' },
  )

  if (error) {
    console.error('[idioma] no se pudo guardar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo. Inténtalo otra vez.' }, { status: 500 })
  }

  return NextResponse.json({
    estado: 'guardado',
    idiomas: despues,
    nombre: nombreDeIdioma(idioma),
  })
}

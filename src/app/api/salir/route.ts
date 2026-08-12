import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Cerrar sesión.
 *
 * No existía. «Cerrar sesión» era **un enlace a la landing**: no borraba la
 * cookie, no llamaba a nadie. Así que la sesión seguía viva y la landing,
 * al preguntar quién eres, respondía con tu cuenta: se veía «Entrar» un
 * instante —lo que tarda el fetch— y volvía a «Mi cuenta».
 *
 * Peor que quedarse dentro es creer que saliste. En un ordenador prestado,
 * ese botón era una promesa falsa.
 */
export async function POST() {
  const supabase = await createClient()

  // `local` y no `global`: cierra ESTA sesión. Tirar todas las del usuario
  // desde un botón de la interfaz cerraría también la del móvil de al lado,
  // que no es lo que nadie espera al pulsar «cerrar sesión» aquí.
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    console.error('[salir] no se pudo cerrar', error)
    return NextResponse.json({ error: 'No pudimos cerrar tu sesión.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'fuera' })
}

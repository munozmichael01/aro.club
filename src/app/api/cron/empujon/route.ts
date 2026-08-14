import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El correo de quien se quedó a medias.
 *
 * Antes salía a los cinco segundos de dejar el correo, mientras la persona
 * estaba en la pantalla siguiente haciendo justo lo que el correo le pedía.
 * Y su contenido no es una bienvenida: es una lista de lo que falta con un
 * botón. Un empujón para volver, enviado a alguien que no se ha ido.
 *
 * Ahora el disparador no es en qué fase estás, sino **si te paraste**. Quien
 * lo hace todo de una sentada no recibe nada, y no le falta: lo siguiente que
 * ocurre de verdad es la revisión de su identidad, que tiene su propio
 * correo.
 *
 * Dos silencios, el mismo correo con la lista en distinto estado:
 *
 *   - dejó su dirección y no terminó el perfil
 *   - terminó el perfil y no ha subido nada para verificarse. Este es el peor
 *     de los dos: se queda a un paso de poder reservar y hoy no recibe nada
 *     nunca, porque no hay verificación que aprobar ni cuestionario que
 *     recordarle.
 *
 * Uno por persona. Insistir es lo que convierte un recordatorio en spam.
 */

export const dynamic = 'force-dynamic'

/** Margen antes de dar por hecho que se fue. */
const HORAS_DE_SILENCIO = 1

/**
 * Y no a cualquier hora.
 *
 * El cron corre cada hora para que «una hora» signifique una hora; con una
 * pasada diaria, quien se paraba a las tres de la tarde recibia el empujon
 * al dia siguiente. Pero correr cada hora significa tambien que alguien que
 * abandona a las dos de la madrugada recibe un correo a las tres, y eso no
 * es diligencia: es despertar a alguien para pedirle que rellene un
 * formulario.
 *
 * De ocho de la mañana a nueve de la noche, hora de Caracas. Quien se para
 * de noche lo recibe al despertar, que es cuando podia hacer algo con el.
 */
const DESDE_CARACAS = 8
const HASTA_CARACAS = 21

/** Caracas va cuatro horas por detras de UTC, y no cambia con la estacion. */
function horaEnCaracas(d: Date): number {
  return (d.getUTCHours() + 24 - 4) % 24
}

async function empujar() {
  const hora = horaEnCaracas(new Date())
  if (hora < DESDE_CARACAS || hora >= HASTA_CARACAS) {
    return NextResponse.json({ fuera_de_hora: hora, perfil: 0, verificacion: 0 })
  }

  const admin = createAdminClient()
  const corte = new Date(Date.now() - HORAS_DE_SILENCIO * 3600_000).toISOString()

  // A quién se le mandó ya. Se pregunta una vez, no una por persona.
  const { data: yaEnviados } = await admin
    .from('scheduled_emails')
    .select('email, profile_id')
    .eq('kind', 'bienvenida')

  const correosHechos = new Set((yaEnviados ?? []).map((r) => r.email).filter(Boolean))
  const perfilesHechos = new Set((yaEnviados ?? []).map((r) => r.profile_id).filter(Boolean))

  // --- 1. dejó su correo y no terminó el perfil -------------------------
  const { data: aMedias } = await admin
    .from('waitlist')
    .select('email, city_slug, created_at')
    .is('converted_profile_id', null)
    .lt('created_at', corte)

  let perfil = 0
  for (const l of aMedias ?? []) {
    if (!l.email || correosHechos.has(l.email)) continue
    await encolar({ correo: l.email }, 'bienvenida', {
      falta: 'perfil',
      ciudad: l.city_slug ?? 'caracas',
    })
    perfil++
  }

  // --- 2. terminó el perfil y no se ha verificado -----------------------
  //
  // `pending_verification` lo pone `convertir_lead` cuando el perfil llegó
  // completo, así que ese estado ES la condición: no hace falta recontar
  // respuestas aquí y arriesgarse a contarlas distinto que Mi cuenta.
  const { data: sinVerificar } = await admin
    .from('profiles')
    .select('id, created_at')
    .eq('status', 'pending_verification')
    .is('deleted_at', null)
    .lt('created_at', corte)

  let verificacion = 0
  for (const p of sinVerificar ?? []) {
    if (perfilesHechos.has(p.id)) continue

    // Si ya subió algo, está esperando revisión y no hay nada que empujar.
    const { count } = await admin
      .from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', p.id)
      .in('status', ['pending', 'approved'])

    if ((count ?? 0) > 0) continue

    await encolar({ perfil: p.id }, 'bienvenida', { falta: 'verificacion' })
    verificacion++
  }

  return NextResponse.json({ perfil, verificacion })
}

/** Mismo candado que los otros dos crones. */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  return empujar()
}

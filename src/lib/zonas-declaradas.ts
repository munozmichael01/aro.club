import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Apuntarse a una fecha es declarar interés en su zona.
 *
 * Si alguien reserva en una fecha que no abre ninguna de las zonas que dijo,
 * no se le impide y no se le manda a espera por eso: apuntarse a la cena del
 * martes en El Rosal ES decir «voy a El Rosal». La zona se le añade.
 *
 * ## Solo cuando la intersección está vacía
 *
 * Si la fecha abre El Rosal y Las Mercedes y la persona ya tiene Las
 * Mercedes, no se toca nada: no declaró El Rosal, y suponerlo sería meterle
 * en el perfil una zona que no eligió. Solo se añade cuando no hay ninguna
 * en común, porque entonces la reserva no se explica de otra forma.
 *
 * Cuando la fecha abre varias y no coincide ninguna, se añaden TODAS las
 * abiertas: al reservar esa fecha esa persona acepta que la sienten en
 * cualquiera de ellas, que es lo que la fecha ofrece.
 *
 * ## Dónde se escribe, que es lo que decide si esto funciona
 *
 * En la respuesta `zonas`, NO en `profile_traits.zones`.
 *
 * `profile_traits` es derivada: la calcula `refrescar_rasgos` desde
 * `answers` y el upsert hace `zones = excluded.zones`. Escribir ahí es
 * escribir en agua — la próxima vez que esa persona edite cualquier
 * respuesta, el trigger recalcula desde `answers` y la zona desaparece sin
 * que falle nada y sin que nadie se entere. Se escribe en `answers` y el
 * trigger `trg_rasgos` hace el resto, que es para lo que está.
 *
 * Y en `booking_zones` va la copia de lo que valía para ESA reserva, que es
 * justo para lo que existe esa tabla: el pool la prefiere sobre
 * `profile_traits.zones`, así que una fecha vieja conserva lo que se aceptó
 * entonces aunque el perfil cambie después.
 */

/** Lo que pasó, para poder anotarlo y contarlo. */
export type Declaracion = {
  anadidas: string[]
  zonasDeLaReserva: string[]
}

export async function declararZonasAlReservar(
  perfilId: string,
  eventoId: string,
  bookingId: string,
): Promise<Declaracion> {
  const admin = createAdminClient()

  const [{ data: sedes }, { data: version }] = await Promise.all([
    admin.from('event_venues').select('zone_slug').eq('event_id', eventoId),
    admin.from('questionnaire_versions').select('id').eq('is_active', true).maybeSingle(),
  ])

  const abiertas = [...new Set((sedes ?? []).map((v) => v.zone_slug).filter(Boolean))] as string[]
  // Una fecha sin zonas abiertas todavía no ofrece nada que declarar.
  if (!abiertas.length || !version) return { anadidas: [], zonasDeLaReserva: [] }

  const { data: fila } = await admin
    .from('answers')
    .select('value')
    .eq('profile_id', perfilId)
    .eq('version_id', version.id)
    .eq('question_key', 'zonas')
    .maybeSingle()

  const suyas = Array.isArray(fila?.value) ? (fila.value as string[]) : []
  const coincide = suyas.some((z) => abiertas.includes(z))

  const anadidas = coincide ? [] : abiertas.filter((z) => !suyas.includes(z))
  const zonasDeLaReserva = [...new Set([...suyas, ...anadidas])]

  if (anadidas.length) {
    const { error } = await admin
      .from('answers')
      .upsert(
        {
          profile_id: perfilId,
          version_id: version.id,
          question_key: 'zonas',
          value: zonasDeLaReserva as never,
        } as never,
        { onConflict: 'profile_id,version_id,question_key' },
      )

    if (error) {
      console.error('[zonas] no se pudo declarar la zona de la fecha', error)
      return { anadidas: [], zonasDeLaReserva: suyas }
    }
  }

  // La copia de la reserva se escribe SIEMPRE, aunque no se añada nada: es
  // la foto de lo que valía ese día, y sin ella el pool cae en
  // `profile_traits.zones`, que sí cambia cuando la persona edita su perfil.
  if (zonasDeLaReserva.length) {
    await admin.from('booking_zones').delete().eq('booking_id', bookingId)
    const { error } = await admin
      .from('booking_zones')
      .insert(zonasDeLaReserva.map((z) => ({ booking_id: bookingId, zone_slug: z })))
    if (error) console.error('[zonas] no se guardaron las zonas de la reserva', error)
  }

  return { anadidas, zonasDeLaReserva }
}

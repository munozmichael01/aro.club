import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Apuntarse a una fecha es declarar interés en su zona.
 *
 * Si alguien reserva en una fecha que no abre ninguna de las zonas que dijo,
 * no se le impide y no se le manda a espera por eso: apuntarse a la cena del
 * martes en El Rosal ES decir «voy a El Rosal». La zona se le añade.
 *
 * ## Todas las de la fecha que no tenía, y DICHO ANTES
 *
 * Hasta el 31-10 solo se añadía cuando no había ninguna en común: si la
 * fecha abría El Rosal y Las Mercedes y la persona ya tenía Las Mercedes, no
 * se tocaba nada, porque meterle El Rosal sin decírselo era ponerle en el
 * perfil una zona que no había elegido.
 *
 * Michael, 31-10, lo cambió y lo cambió bien: la pantalla de reservar ahora
 * AVISA —«al reservar, Los Palos Grandes pasa a ser una de tus zonas»— y con
 * el aviso delante ya no es una suposición: la fecha dice «Chacao o Los
 * Palos Grandes», quien la reserva acepta que la sienten en cualquiera de
 * las dos, y eso es elegirlas. Lo que se quería evitar era hacerlo a
 * escondidas, no hacerlo.
 *
 * El aviso y esto salen de la MISMA función, `zonasQueSeAnaden`: si la
 * pantalla dijera una cosa y la reserva hiciera otra, el aviso mentiría.
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

/**
 * Qué zonas de una fecha se le añaden a alguien al reservarla.
 *
 * Pura y exportada a propósito: la usan la reserva —que las escribe— y Mi
 * cuenta —que avisa de ellas antes del botón—. Una sola cuenta para las dos,
 * o el aviso acaba diciendo algo distinto de lo que pasa.
 */
export function zonasQueSeAnaden(suyas: string[], abiertas: string[]): string[] {
  return abiertas.filter((z) => !suyas.includes(z))
}

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
  const anadidas = zonasQueSeAnaden(suyas, abiertas)
  const zonasDeLaReserva = [...new Set([...suyas, ...anadidas])]

  if (anadidas.length && !(await escribirZonas(perfilId, version.id, zonasDeLaReserva))) {
    return { anadidas: [], zonasDeLaReserva: suyas }
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

/**
 * Su respuesta de zonas, reescrita entera. En `answers` y no en
 * `profile_traits`: ahí se recalcula desde `answers` y lo escrito se
 * perdería en la siguiente edición (ver arriba).
 */
async function escribirZonas(perfilId: string, versionId: number, zonas: string[]): Promise<boolean> {
  const { error } = await createAdminClient()
    .from('answers')
    .upsert(
      {
        profile_id: perfilId,
        version_id: versionId,
        question_key: 'zonas',
        value: zonas as never,
      } as never,
      { onConflict: 'profile_id,version_id,question_key' },
    )

  if (error) console.error('[zonas] no se pudo declarar la zona de la fecha', error)
  return !error
}

/**
 * Sumar a sus zonas las de una reserva, sin tocar la reserva.
 *
 * Para `/api/reservar`, que es por donde se reserva con CRÉDITO: esa ruta ya
 * escribe sus propias `booking_zones` —las de la fecha, o las que eligió—
 * y no pasa por `declararZonasAlReservar`. Así que quien reservaba con
 * crédito leía en la pantalla «al reservar, Los Palos Grandes pasa a ser una
 * de tus zonas» y no pasaba: el aviso mentía justo para quien ya es del
 * club. Encontrado el 31-10 al montar ese aviso.
 *
 * Nunca revienta la reserva: perder la zona en el perfil se arregla; no
 * apartar un puesto, no.
 */
export async function sumarZonasAlPerfil(perfilId: string, zonas: string[]): Promise<string[]> {
  if (!zonas.length) return []
  const admin = createAdminClient()

  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (!version) return []

  const { data: fila } = await admin
    .from('answers')
    .select('value')
    .eq('profile_id', perfilId)
    .eq('version_id', version.id)
    .eq('question_key', 'zonas')
    .maybeSingle()

  const suyas = Array.isArray(fila?.value) ? (fila.value as string[]) : []
  const anadidas = zonasQueSeAnaden(suyas, zonas)
  if (!anadidas.length) return []

  return (await escribirZonas(perfilId, version.id, [...suyas, ...anadidas])) ? anadidas : []
}

import { NextResponse } from 'next/server'

import { CIUDAD_POR_DEFECTO } from '@/lib/ciudades'
import { etiquetaDeIdioma } from '@/lib/idioma-mesa'
import { NOMBRES_DE_FORMATO } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { zonasDeCiudades } from '@/lib/zona-ciudad'

/**
 * La agenda pública: qué fechas hay abiertas, para quien todavía no es nadie.
 *
 * Es la misma lista que Mi cuenta enseña dentro, con dos diferencias que son
 * de producto y no de código:
 *
 *   · Solo las ABIERTAS. Dentro se ven también las cerradas, porque a quien
 *     ya está dentro le cuentan que el club está vivo. Aquí cada tarjeta
 *     termina en un botón de reservar, y una que no se puede reservar sería
 *     una puerta pintada en la pared.
 *   · TODAS, también las que piden una edad o un idioma. Dentro se esconden
 *     las que esta persona no puede reservar; aquí no sabemos quién mira, y
 *     esconder la cena de mayores de 40 es esconderla justo a quien la
 *     estábamos buscando. Van con su etiqueta, que dice para quién son.
 *
 * Y nada de restaurantes: la zona sí, el sitio no. Esa es la línea de
 * `v_fechas_publicas` y aquí se respeta igual aunque la consulta vaya con la
 * llave de servicio.
 */
export const dynamic = 'force-dynamic'

/** Lo que dura un plan: dos horas, como la mesa (`AroReglas.GUION`). */
export const DURACION_MIN = 120

export type FechaDeAgenda = {
  id: string
  formato: string
  nombreFormato: string
  empiezaEn: string
  /** Cuándo se sabe el sitio y con quién. De la columna, que puede moverse a mano. */
  revelaEn: string | null
  cierraEn: string
  creadaEn: string
  zonaHoraria: string
  zonas: string[]
  precioUsd: number | null
  porMesa: number
  apuntados: number
  edadMinima: number | null
  edadMaxima: number | null
  idioma: string | null
  etiquetaIdioma: string | null
}

/** Las fechas abiertas de la ciudad, ya listas para pintar. */
export async function fechasAbiertas(): Promise<FechaDeAgenda[]> {
  const admin = createAdminClient()
  const ahora = new Date().toISOString()

  const { data: fechas } = await admin
    .from('events')
    .select(
      'id, format, starts_at, booking_closes_at, reveal_at, created_at, city_slug, price_usd, seats_per_table, age_band_min, age_band_max, idioma',
    )
    .eq('status', 'open')
    // Nunca una de prueba, aunque alguien la deje en `open` por error.
    .eq('es_prueba', false)
    .eq('city_slug', CIUDAD_POR_DEFECTO)
    .gt('booking_closes_at', ahora)
    .gte('starts_at', ahora)
    .order('starts_at', { ascending: true })
    // Y por creación para deshacer los empates: dos fechas de la misma noche
    // en zonas distintas llevan la MISMA hora, y sin segundo criterio
    // Postgres las devuelve en el orden que le convenga. La agenda se
    // barajaba entre una recarga y la siguiente.
    .order('created_at', { ascending: true })
    .limit(12)

  const ids = (fechas ?? []).map((f) => f.id)
  const vacio = ['00000000-0000-0000-0000-000000000000']

  const [{ data: apuntados }, { data: sedes }, zonasHorarias] = await Promise.all([
    admin.from('bookings').select('event_id').in('event_id', ids.length ? ids : vacio).eq('status', 'confirmed'),
    admin.from('event_venues').select('event_id, zone_slug, zones(name)').in('event_id', ids.length ? ids : vacio),
    zonasDeCiudades((fechas ?? []).map((f) => f.city_slug)),
  ])

  const cuenta = new Map<string, number>()
  for (const b of apuntados ?? []) cuenta.set(b.event_id, (cuenta.get(b.event_id) ?? 0) + 1)

  const zonasPorFecha = new Map<string, string[]>()
  for (const v of sedes ?? []) {
    const nombre = (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug
    const ya = zonasPorFecha.get(v.event_id) ?? []
    if (!ya.includes(nombre)) zonasPorFecha.set(v.event_id, [...ya, nombre])
  }

  return (fechas ?? []).map((f) => ({
    id: f.id,
    formato: f.format,
    nombreFormato: NOMBRES_DE_FORMATO[f.format] ?? NOMBRES_DE_FORMATO.dinner,
    empiezaEn: f.starts_at,
    revelaEn: f.reveal_at ?? null,
    cierraEn: f.booking_closes_at,
    creadaEn: f.created_at,
    zonaHoraria: zonasHorarias.get(f.city_slug ?? CIUDAD_POR_DEFECTO) ?? 'America/Caracas',
    zonas: zonasPorFecha.get(f.id) ?? [],
    precioUsd: f.price_usd != null ? Number(f.price_usd) : null,
    /**
     * Cuántos son en cada grupo. No siempre seis.
     *
     * Unos drinks son ocho (Michael, 31-10): en una barra nadie está clavado
     * en su silla. La agenda decía «Seis personas verificadas» en la cabecera
     * para todo, así que la primera fecha de ocho la desmentía.
     */
    porMesa: f.seats_per_table ?? 6,
    apuntados: cuenta.get(f.id) ?? 0,
    edadMinima: f.age_band_min ?? null,
    edadMaxima: f.age_band_max ?? null,
    idioma: f.idioma ?? null,
    etiquetaIdioma: etiquetaDeIdioma(f.idioma),
  }))
}

/**
 * Las zonas con fecha abierta, sin repetir y en el orden en que aparecen.
 *
 * Sale de las fechas y no de una lista escrita a mano: la respuesta de «¿dónde
 * son los planes?» prometía cinco zonas, y prometer El Hatillo el mes que no
 * hay nada en El Hatillo es la clase de mentira que nadie corrige porque
 * nadie la ve.
 */
export function zonasConFecha(fechas: FechaDeAgenda[]): string[] {
  const vistas: string[] = []
  for (const f of fechas) {
    for (const z of f.zonas) if (!vistas.includes(z)) vistas.push(z)
  }
  return vistas
}

export async function GET() {
  const fechas = await fechasAbiertas()
  return NextResponse.json({ fechas, zonas: zonasConFecha(fechas) })
}

import 'server-only'

/**
 * Google Places, para saber dónde está un local de verdad.
 *
 * Se busca por NOMBRE —«Cardenal, Las Mercedes, Caracas»— y no por dirección,
 * y esa es toda la diferencia. Geocodificar la dirección no funciona aquí: lo
 * probé contra Nominatim y no encuentra «Cardenal, Calle Madrid CON avenida
 * Principal, Las Mercedes», que es la dirección real de un local que existe,
 * porque el «con avenida X» es cómo se escriben las direcciones en Caracas.
 * Buscando por nombre, ese «con» deja de importar.
 *
 * Devuelve el sitio con su `place_id`, sus coordenadas y su ficha oficial de
 * Maps, que es justo el `maps_url` que necesita «Cómo llegar»: un enlace a la
 * ficha lleva al sitio exacto y abre la navegación, y una búsqueda por texto
 * acierta o no acierta.
 *
 * ## La clave
 *
 * `GOOGLE_MAPS_API_KEY`, solo servidor. NUNCA `NEXT_PUBLIC_`: una clave de
 * Places en el navegador la puede usar cualquiera y la factura es nuestra.
 * Está marcada como sensible en Vercel, así que no se puede leer ni con
 * `vercel env pull` — esto solo corre desplegado o con la clave puesta a mano
 * en local.
 *
 * ## Si no responde
 *
 * Se devuelve lista vacía y quien llame decide. No se inventa un sitio ni se
 * cae hacia una búsqueda por texto: dar de alta un local con un enlace que no
 * hemos comprobado es exactamente lo que veníamos a arreglar.
 */

const FUENTE = 'https://places.googleapis.com/v1/places:searchText'

/**
 * Lo que se pide. Cada campo que se añada aquí sube el tramo de facturación
 * de Places, así que van solo los que se guardan.
 */
const CAMPOS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
].join(',')

export type Sitio = {
  placeId: string
  nombre: string
  direccion: string
  lat: number
  lng: number
  mapa: string
}

export type Busqueda =
  | { ok: true; sitios: Sitio[] }
  | { ok: false; motivo: 'sin-clave' | 'fuente-caida' | 'rechazada' }

export async function buscarSitio(consulta: string, cuantos = 5): Promise<Busqueda> {
  const clave = process.env.GOOGLE_MAPS_API_KEY
  if (!clave) {
    console.error('[places] falta GOOGLE_MAPS_API_KEY')
    return { ok: false, motivo: 'sin-clave' }
  }

  const texto = consulta.trim()
  if (!texto) return { ok: true, sitios: [] }

  let datos: { places?: unknown[]; error?: { message?: string } }
  try {
    const r = await fetch(FUENTE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': clave,
        'X-Goog-FieldMask': CAMPOS,
      },
      // `regionCode` y `languageCode` sesgan la búsqueda a Venezuela y al
      // español: sin ellos, «Alto» devuelve sitios de medio mundo.
      body: JSON.stringify({
        textQuery: texto,
        languageCode: 'es',
        regionCode: 'VE',
        maxResultCount: Math.min(10, Math.max(1, cuantos)),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    datos = await r.json()

    if (!r.ok) {
      console.error('[places] la fuente rechazó la búsqueda', r.status, datos?.error?.message)
      return { ok: false, motivo: 'rechazada' }
    }
  } catch (e) {
    console.error('[places] la fuente no respondió', e)
    return { ok: false, motivo: 'fuente-caida' }
  }

  type Cruda = {
    id?: string
    displayName?: { text?: string }
    formattedAddress?: string
    location?: { latitude?: number; longitude?: number }
    googleMapsUri?: string
  }

  const sitios = ((datos.places ?? []) as Cruda[])
    .map((p) => ({
      placeId: p.id ?? '',
      nombre: p.displayName?.text ?? '',
      direccion: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? NaN,
      lng: p.location?.longitude ?? NaN,
      mapa: p.googleMapsUri ?? '',
    }))
    // Sin id o sin coordenadas no sirve para lo que se guarda.
    .filter((s) => s.placeId && s.mapa && Number.isFinite(s.lat) && Number.isFinite(s.lng))

  return { ok: true, sitios }
}

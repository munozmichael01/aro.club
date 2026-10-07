import { NextResponse } from 'next/server'

import { ciudades } from '@/lib/ciudades'

/**
 * Las ciudades que conocemos, para quien tenga que pintar una lista.
 *
 * Existe porque la lista estaba escrita a mano en la landing y la app
 * necesitaba la misma. Copiarla habría dado dos listas; meterla en
 * `reglas.js` —que es donde vive lo que comparten web, servidor y app— habría
 * dado una tercera copia de algo que YA tiene dueño: la tabla `cities`, con
 * su orden y su `is_open`. Un catálogo que vive en la base no se duplica en
 * una constante, se sirve.
 *
 * Se cachea diez minutos, como `/api/zonas`: las ciudades no cambian en una
 * tarde y esto lo pide la landing en cada visita.
 *
 * VIENEN TODAS, Caracas incluida. Quién se enseña es cosa de cada pantalla
 * —la landing lo pregunta después de que alguien diga que NO vive en
 * Caracas, así que allí sobra— y el día que abra una segunda ciudad esa
 * decisión se toma mirando `abierta`, no recortando la lista aquí.
 */
export const revalidate = 600

export async function GET() {
  return NextResponse.json({ ciudades: await ciudades() })
}

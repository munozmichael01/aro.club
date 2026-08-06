import { NextResponse } from 'next/server'

import { leerCatalogo } from '@/lib/questionnaire/catalogo'

/**
 * El cuestionario completo, con el código de cada opción.
 *
 * Devuelve las 17 preguntas, no un subconjunto: el cuestionario decide por
 * su cuenta cuáles esconder según lo ya respondido en la landing. Filtrar
 * aquí obligaría a mantener en dos sitios la lista de qué se hereda.
 *
 * Cada opción viaja con su `valor` explícito. Nunca su posición: la landing
 * muestra 10 zonas y el cuestionario 13, en distinto orden, y el índice de
 * una no significa nada en la otra.
 */
export async function GET() {
  const catalogo = await leerCatalogo()

  if (!catalogo) {
    return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
  }

  return NextResponse.json(
    { version: catalogo.version, preguntas: catalogo.preguntas },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  )
}

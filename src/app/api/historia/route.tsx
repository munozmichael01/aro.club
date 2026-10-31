import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { invitacionDe, reservaDentro } from '@/lib/estas-dentro'
import { medidor } from '@/lib/historia/medir'
import { Tarjeta, type Medidas } from '@/lib/historia/tarjeta'
import { DENTRO, type Historia } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * La tarjeta para historias de SU reserva, en PNG.
 *
 *   /api/historia?evento=<id>&v=1..8[&ancho=400][&descargar=1]
 *
 * La misma imagen es la vista previa de la hoja (`ancho` pequeño), la que se
 * descarga y la que se comparte: una sola forma de pintarla.
 *
 * Los datos salen de la sesión, no de la URL. La tarjeta lleva el día, la
 * zona y el código de quien la pide, y armarla con lo que venga en la query
 * sería dejar que cualquiera fabrique una con el código de otra persona.
 */
export const dynamic = 'force-dynamic'

const ALTO = 1920
const ANCHO = 1080

// Las fuentes se leen una vez por proceso: son cuatro ficheros que no cambian.
let fuentes: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: 'normal' }[]> | null = null
function cargarFuentes() {
  if (!fuentes) {
    const dir = path.join(process.cwd(), 'src', 'lib', 'historia', 'fuentes')
    const leer = (f: string) => readFile(path.join(dir, f))
    fuentes = Promise.all([
      leer('YoungSerif-Regular.ttf').then((data) => ({ name: 'Young Serif', data, weight: 400 as const, style: 'normal' as const })),
      leer('InterTight-Medium.ttf').then((data) => ({ name: 'Inter Tight', data, weight: 500 as const, style: 'normal' as const })),
      leer('InterTight-SemiBold.ttf').then((data) => ({ name: 'Inter Tight', data, weight: 600 as const, style: 'normal' as const })),
      leer('InterTight-Bold.ttf').then((data) => ({ name: 'Inter Tight', data, weight: 700 as const, style: 'normal' as const })),
    ]).catch((e) => {
      fuentes = null
      throw e
    })
  }
  return fuentes
}

/**
 * Los datos de ejemplo de la entrega (Andrea, viernes 30), SOLO en local:
 * para comparar con los PNG de Design sin tener una reserva.
 */
const EJEMPLO = (brunch: boolean): Historia =>
  DENTRO.historia(
    brunch
      ? { empiezaEn: '2026-11-01T15:00:00Z', revelaEn: '2026-11-01T12:00:00Z', zonaHoraria: 'America/Caracas', formato: 'brunch', zonas: ['Chacao'] }
      : { empiezaEn: '2026-10-30T23:00:00Z', revelaEn: '2026-10-30T16:00:00Z', zonaHoraria: 'America/Caracas', formato: 'dinner', zonas: ['Chacao'] },
    'ANDREA7KQ',
  )!

let medidas: Medidas | null = null
async function cargarMedidas(): Promise<Medidas> {
  if (!medidas) {
    const f = await cargarFuentes()
    medidas = { serif: medidor(f[0].data), sans: medidor(f[1].data) }
  }
  return medidas
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams
  const v = Number(q.get('v') ?? 1)
  if (!Number.isInteger(v) || v < 1 || v > 8) return NextResponse.json({ error: 'Esa tarjeta no existe.' }, { status: 400 })
  const ancho = Math.round(Math.min(ANCHO, Math.max(200, Number(q.get('ancho') ?? ANCHO) || ANCHO)))

  let h: Historia | null = null
  if (q.get('ejemplo') && process.env.NODE_ENV !== 'production') {
    h = EJEMPLO(q.get('ejemplo') === 'brunch')
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })
    const admin = createAdminClient()
    const d = await reservaDentro(admin, user.id, q.get('evento'))
    if (!d) return NextResponse.json({ error: 'No tienes esa reserva.' }, { status: 404 })
    const inv = await invitacionDe(admin, user.id)
    h = DENTRO.historia(d.plan, inv?.codigo ?? null)
    if (!h) return NextResponse.json({ error: 'Este plan no tiene tarjetas.' }, { status: 404 })
    // La 4 es entera el código: sin código no se ofrece, y tampoco se pinta.
    if (!DENTRO.variantes(!!h.codigo).includes(v)) return NextResponse.json({ error: 'Esa tarjeta no existe.' }, { status: 404 })
  }

  // Se pinta SIEMPRE a 1080 y se reduce después. Satori escala desde el
  // centro y no hace caso a `transformOrigin`: la vista previa salía recortada.
  const imagen = new ImageResponse(<Tarjeta v={v} h={h} m={await cargarMedidas()} />, { width: ANCHO, height: ALTO, fonts: await cargarFuentes() })
  let png: Buffer = Buffer.from(await imagen.arrayBuffer())
  if (ancho < ANCHO) png = await sharp(png).resize({ width: ancho }).png().toBuffer()

  const cabeceras = new Headers({ 'Content-Type': 'image/png' })
  // Es de una persona: que ningún intermediario la guarde para otra.
  cabeceras.set('Cache-Control', 'private, max-age=300')
  if (q.get('descargar')) cabeceras.set('Content-Disposition', `attachment; filename="aro-club-${v}.png"`)
  return new Response(new Uint8Array(png), { status: 200, headers: cabeceras })
}

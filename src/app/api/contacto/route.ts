import { NextResponse } from 'next/server'
import { z } from 'zod'

import { contactoDeMesa, decidir } from '@/lib/contacto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «Seguir en contacto» de una cena: el panel A a E de la entrega.
 *
 *   GET  /api/contacto?mesa=<id>
 *   POST /api/contacto { mesa, accion, ... }
 *
 * accion:
 *   compartir  { con: [ids], sin?: [ids], telefono, instagram?, tiktok? }
 *              Guarda los datos (una vez para la cena) y confirma con `con`.
 *              `sin` es desmarcar en el panel de varias: su E, sin avisar.
 *   no         { con?: [ids] }   «Prefiero no». Sin `con`, con todas.
 *   reabrir    { con: [ids] }    Volver de E a A mientras dure el plazo.
 *   visto      {}                Quita el punto de «hay algo nuevo».
 *
 * Responde siempre el estado nuevo entero, el mismo del GET: la pantalla
 * pinta lo que dice el servidor, no lo que cree que pasó.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const mesa = new URL(request.url).searchParams.get('mesa')
  if (!mesa || !z.string().uuid().safeParse(mesa).success) return NextResponse.json({ error: 'Falta la cena.' }, { status: 400 })

  const d = await contactoDeMesa(createAdminClient(), user.id, mesa)
  if (!d) return NextResponse.json({ error: 'No estuviste en esa cena.' }, { status: 404 })
  return NextResponse.json(d)
}

const ids = z.array(z.string().uuid()).max(30)
const cuerpo = z.discriminatedUnion('accion', [
  z.object({
    mesa: z.string().uuid(),
    accion: z.literal('compartir'),
    con: ids,
    sin: ids.optional(),
    telefono: z.string().max(40),
    instagram: z.string().max(120).optional(),
    tiktok: z.string().max(120).optional(),
  }),
  z.object({ mesa: z.string().uuid(), accion: z.literal('no'), con: ids.optional() }),
  z.object({ mesa: z.string().uuid(), accion: z.literal('reabrir'), con: ids }),
  z.object({ mesa: z.string().uuid(), accion: z.literal('visto') }),
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const p = cuerpo.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })

  const admin = createAdminClient()
  // Solo quien estuvo en esa mesa decide sobre ella.
  const antes = await contactoDeMesa(admin, user.id, p.data.mesa)
  if (!antes) return NextResponse.json({ error: 'No estuviste en esa cena.' }, { status: 404 })

  const { mesa, ...decision } = p.data
  const fallo = await decidir(admin, user.id, mesa, decision)
  if (fallo) return NextResponse.json(fallo, { status: 400 })

  return NextResponse.json(await contactoDeMesa(admin, user.id, mesa))
}

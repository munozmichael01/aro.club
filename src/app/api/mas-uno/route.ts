import { NextResponse } from 'next/server'
import { z } from 'zod'

import { aceptarInvitacion, cambiarAcompanante, leerInvitacion, masUnoDe } from '@/lib/mas-uno'
import { situacionDePerfil } from '@/lib/embudo'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «+1 acompañante»: el enlace, visto por quien lo abre, y lo que se hace con él.
 *
 *   GET  ?token=…                      qué es este enlace (sin sesión también)
 *   POST { accion: 'aceptar', token }  unirse: queda pendiente en su perfil
 *   POST { accion: 'cambiar', reservaId } quien reserva cambia de acompañante
 *
 * Lo comparten la web y la app. El token es lo único que viaja: quien
 * reserva no nos da ningún dato de su acompañante (Michael, 01-11).
 */

const TOKEN = z.string().min(10).max(64).regex(/^[A-Za-z0-9_-]+$/)

const cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('aceptar'), token: TOKEN }),
  z.object({ accion: z.literal('cambiar'), reservaId: z.string().uuid() }),
])

async function quienMira(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(request: Request) {
  const token = TOKEN.safeParse(new URL(request.url).searchParams.get('token'))
  if (!token.success) return NextResponse.json({ error: 'Ese enlace no existe.' }, { status: 404 })

  const admin = createAdminClient()
  const yo = await quienMira()
  const inv = await leerInvitacion(admin, token.data, yo)
  if (!inv) return NextResponse.json({ error: 'Ese enlace no existe.' }, { status: 404 })

  // Quién mira, para 5B: «Entraste como Laura» y si ya está lista para que
  // el puesto quede al aceptar. Sin sesión, null.
  let quien: { nombre: string | null; lista: boolean; donde: string } | null = null
  if (yo) {
    const [{ data: perfil }, situacion] = await Promise.all([
      admin.from('profiles').select('display_name, full_name').eq('id', yo).maybeSingle(),
      situacionDePerfil(yo),
    ])
    quien = {
      nombre: (perfil?.display_name || perfil?.full_name?.split(' ')[0] || '').trim() || null,
      lista: situacion.puedeReservar,
      donde: situacion.donde,
    }
  }
  return NextResponse.json({ ...inv, yo: quien })
}

export async function POST(request: Request) {
  const yo = await quienMira()
  if (!yo) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })

  const admin = createAdminClient()

  if (parsed.data.accion === 'aceptar') {
    const r = await aceptarInvitacion(admin, parsed.data.token, yo)
    const ok = r.estado === 'aceptada' || r.estado === 'confirmada'
    return NextResponse.json(r, { status: ok ? 200 : r.estado === 'no-existe' ? 404 : 409 })
  }

  const r = await cambiarAcompanante(admin, parsed.data.reservaId, yo)
  if (r === 'no-es-tuya') return NextResponse.json({ error: 'Esa reserva no existe.' }, { status: 404 })
  if (r === 'cerrada') return NextResponse.json({ error: 'Esta fecha ya cerró.', motivo: 'fecha-cerrada' }, { status: 409 })
  return NextResponse.json({ estado: 'cambiado', masUno: await masUnoDe(admin, parsed.data.reservaId) })
}

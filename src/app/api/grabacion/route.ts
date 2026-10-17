import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «¿Te podemos grabar?», contestado.
 *
 * Michael, 17-10: el correo de la revelación avisa de que estamos grabando
 * por la zona, pero un correo no guarda la respuesta: quien contesta lo hace
 * respondiendo o en la puerta, y quien está grabando no tiene forma de saber
 * a quién no puede enfocar. Esto lo guarda contra SU reserva de esa cena.
 *
 * Tres estados y no dos. `null` es que no ha contestado, y no es un no: el
 * silencio no es permiso y tampoco es negativa. Quien graba ve los tres en
 * el panel y decide; lo que no puede pasar es que el producto invente una
 * respuesta que nadie dio.
 *
 * Y se puede cambiar las veces que haga falta, también a mitad de la noche:
 * un permiso que no se puede retirar no es un permiso.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  // `null` para volver a «no he contestado», que es lo que deja la pantalla
  // si alguien cierra la pregunta sin elegir.
  permite: z.union([z.literal(true), z.literal(false), z.null()]),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Su reserva viva de esa fecha, y solo la suya: el permiso es de quien lo
  // da. Se busca por (persona, fecha) y no por un id que mande la pantalla,
  // que es lo que permitiría contestar por otro.
  const { data: reserva } = await admin
    .from('bookings')
    .select('id')
    .eq('profile_id', user.id)
    .eq('event_id', parsed.data.eventoId)
    .in('status', ['confirmed', 'attended'])
    .maybeSingle()

  if (!reserva) {
    return NextResponse.json({ error: 'No tienes reserva en esa fecha.' }, { status: 404 })
  }

  const { error } = await admin
    .from('bookings')
    .update({ permiso_grabacion: parsed.data.permite } as never)
    .eq('id', reserva.id)

  if (error) {
    console.error('[grabacion] no se pudo guardar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'guardado', permite: parsed.data.permite })
}

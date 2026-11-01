import { NextResponse } from 'next/server'

import {
  COOKIE_INVITA,
  DIAS_INVITA,
  referidoDeCodigo,
  valorDeInvitacion,
} from '@/lib/referidos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * `aro.club/i/ANDREA7KQ`: el enlace que se comparte.
 *
 * Es una ruta y no una pantalla porque lo único que hace es dejar el código
 * puesto y mandar a la portada. La portada ya existe y es la buena: lo que
 * convence a alguien de venir es lo que cuenta de las cenas, no una página
 * aparte que diga «te invitó Andrea» y nada más.
 *
 * ## Un código que no vale NO es un callejón sin salida
 *
 * Quien llega aquí viene de una historia de Instagram o de un WhatsApp de
 * alguien que conoce. Si el código está apagado, caducado o mal escrito, lo
 * que no se puede hacer es enseñarle un 404: esa persona no hizo nada mal y
 * lo que venía a ver sigue existiendo. Se va a la portada sin franja y sin
 * cookie, como quien llega por su cuenta.
 *
 * Y por lo mismo esto no comprueba si el descuento le TOCA —si es su primera
 * fecha, si ya usó otro código—: eso se sabe cuando hay alguien con cuenta a
 * quien mirarle las reservas, y aquí todavía no hay nadie. Lo decide
 * `cuponParaPagar` al pagar, que es el único sitio donde cobra.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params
  const portada = new URL('/', request.url)

  const referido = await referidoDeCodigo(createAdminClient(), codigo)
  if (!referido) return NextResponse.redirect(portada, 302)

  const r = NextResponse.redirect(portada, 302)
  r.cookies.set({
    name: COOKIE_INVITA,
    value: valorDeInvitacion(referido.codigo, referido.nombre ?? '', referido.pct),
    path: '/',
    maxAge: DIAS_INVITA * 24 * 3600,
    sameSite: 'lax',
    httpOnly: false,
    secure: new URL(request.url).protocol === 'https:',
  })
  return r
}

import { NextResponse } from 'next/server'

import {
  COOKIE_INVITA,
  DIAS_INVITA,
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
  const { codigo: crudo } = await params
  const portada = new URL('/', request.url)

  const codigo = decodeURIComponent(crudo ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 40)

  if (!codigo) return NextResponse.redirect(portada, 302)

  const admin = createAdminClient()
  const { data: cupon } = await admin
    .from('coupons')
    .select('code, activo, caduca_at, max_usos, usados, creado_por, descuento_pct')
    .eq('code', codigo)
    .maybeSingle()

  const dueno = (cupon as { creado_por?: string | null } | null)?.creado_por ?? null

  // Sin dueño no es una invitación: es un cupón de operación, y esos no se
  // reparten por enlace ni premian a nadie.
  const vale = !!cupon
    && cupon.activo
    && !!dueno
    && (!cupon.caduca_at || new Date(cupon.caduca_at).getTime() > Date.now())
    && (cupon.max_usos == null || cupon.usados < cupon.max_usos)

  if (!vale) return NextResponse.redirect(portada, 302)

  // El nombre de pila de quien invita, para la franja. Solo el de pila: el
  // apellido de quien te invitó no hace falta para decidir si vienes.
  const { data: quien } = await admin
    .from('profiles')
    .select('display_name, full_name')
    .eq('id', dueno!)
    .maybeSingle()

  const nombre = (quien?.display_name || quien?.full_name?.split(' ')[0] || '').trim()

  const r = NextResponse.redirect(portada, 302)
  r.cookies.set({
    name: COOKIE_INVITA,
    value: valorDeInvitacion(cupon!.code, nombre, cupon!.descuento_pct),
    path: '/',
    maxAge: DIAS_INVITA * 24 * 3600,
    sameSite: 'lax',
    // La pinta la portada, que es un fichero estático: tiene que poder
    // leerla desde el navegador. No autoriza nada; el código se comprueba
    // entero otra vez al pagar.
    httpOnly: false,
    secure: new URL(request.url).protocol === 'https:',
  })
  return r
}

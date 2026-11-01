import { NextResponse } from 'next/server'

import { COOKIE_MAS_UNO } from '@/lib/mas-uno'

/**
 * El enlace de «+1 acompañante»: aro.club/m/<token>.
 *
 * Guarda el token para quien todavía no tiene sesión —lo recoge
 * `trasEntrar` al entrar o al darse de alta— y lleva a la pantalla de la
 * invitación, que pregunta a `/api/mas-uno` qué es este enlace. Nada se
 * decide aquí: si el enlace ya no vale, lo dice esa pantalla.
 *
 * Una semana: es lo más que dura una fecha abierta.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: crudo } = await params
  const token = String(crudo ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  const destino = new URL(token ? `/acompanante?t=${token}` : '/', request.url)
  const r = NextResponse.redirect(destino, 302)
  if (token) {
    r.cookies.set({
      name: COOKIE_MAS_UNO,
      value: token,
      path: '/',
      maxAge: 7 * 24 * 3600,
      sameSite: 'lax',
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
    })
  }
  return r
}

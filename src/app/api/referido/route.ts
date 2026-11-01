import { NextResponse } from 'next/server'

import { referidoDeCodigo } from '@/lib/referidos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * `GET /api/referido?codigo=ANDREA7KQ` → { codigo, nombre, pct }, sin sesión.
 *
 * Para que la app enseñe «Te invitó Andrea · 20 % en tu primera fecha» antes
 * del alta, como la franja de la web. La comprobación es la de `/i/<código>`
 * (`referidoDeCodigo`): un código que no vale da 404 y la app no enseña nada,
 * igual que la web manda a la portada sin franja.
 *
 * Solo el nombre de pila de quien invita, que es lo que ya dice el enlace
 * que esa persona compartió.
 */
export async function GET(request: Request) {
  const referido = await referidoDeCodigo(createAdminClient(), new URL(request.url).searchParams.get('codigo'))
  if (!referido) return NextResponse.json({ error: 'Ese código no vale.' }, { status: 404 })
  return NextResponse.json(referido)
}

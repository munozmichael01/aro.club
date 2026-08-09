import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Datos base: nombre, cómo le llaman en la mesa, nacimiento, género y
 * teléfono.
 *
 * La pantalla existía desde la entrega 3 pero no la enlazaba nadie y no
 * tenía un solo `fetch`. Nadie podía llegar, y quien llegara no guardaba.
 *
 * No es cosmético: `age` y `gender` son las dos restricciones más duras del
 * reparto —diez años de horquilla y equilibrio de género— y sin este paso
 * llegan nulas. Las dos reglas que más importan estaban desactivadas para
 * todo usuario real.
 */

const NACIMIENTO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no se entiende.')

const cuerpo = z.object({
  nombre: z.string().trim().min(2).max(120),
  // El trato es lo ÚNICO que ven los otros cinco. Si no lo escribe, se usa
  // su primer nombre, que es lo que la pantalla ya le enseña de sugerencia.
  trato: z.string().trim().max(60).optional(),
  nacimiento: NACIMIENTO,
  genero: z.enum(['mujer', 'hombre', 'no-binario', 'sin-decir']),
  telefono: z
    .string()
    .regex(/^\+58(412|414|416|422|424|426)\d{7}$/, 'Ese número no parece venezolano.'),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const { data } = await createAdminClient()
    .from('profiles')
    .select('full_name, display_name, birthdate, gender, phone_e164')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    nombre: data?.full_name ?? '',
    trato: data?.display_name ?? '',
    nacimiento: data?.birthdate ?? '',
    // 'sin-decir' es el valor por defecto de la columna, no una respuesta:
    // si nadie eligió, la pantalla debe abrir sin nada marcado.
    genero: data?.birthdate ? (data?.gender ?? null) : null,
    telefono: data?.phone_e164 ?? '',
    completado: Boolean(data?.birthdate && data?.full_name),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' },
      { status: 400 },
    )
  }

  const { nombre, trato, nacimiento, genero, telefono } = parsed.data

  // Dieciocho años. La comprobación ya está en la base como CHECK, pero un
  // 400 con motivo es mejor que un 500 sin él.
  const cumple = new Date(nacimiento)
  const mayoria = new Date()
  mayoria.setFullYear(mayoria.getFullYear() - 18)
  if (Number.isNaN(cumple.getTime()) || cumple > mayoria) {
    return NextResponse.json({ error: 'Hay que tener 18 años.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: nombre,
      display_name: trato?.trim() || nombre.split(' ')[0],
      birthdate: nacimiento,
      gender: genero,
      phone_e164: telefono,
    })
    .eq('id', user.id)

  if (error) {
    console.error('[datos-base] no se guardó', error)
    return NextResponse.json({ error: 'No pudimos guardar tus datos.' }, { status: 500 })
  }

  // El trigger de `profiles` recalcula los rasgos al cambiar nacimiento o
  // género, así que la edad entra en el reparto sin nada más.
  return NextResponse.json({ estado: 'guardado' })
}

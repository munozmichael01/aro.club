import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El equipo: quién puede operar, y quién deja de poder.
 *
 * No existía ninguna forma de dar acceso. El rol es una columna de `profiles`
 * y ninguna ruta la tocaba, así que dar de alta a alguien que va a operar
 * significaba pedirle que se registrara como miembro —correo, cuatro datos,
 * catorce preguntas, contraseña— y luego editarle la fila a mano en la base.
 * Contratar a una persona empezaba por pedirle que fingiera ser un cliente.
 *
 * Aquí no hay embudo: la cuenta nace con el rol puesto y sin cuestionario ni
 * verificación, porque una cuenta de trabajo no se sienta a ninguna mesa.
 *
 * **Solo admin.** Un ops que pudiera nombrar a otro ops puede darse admin
 * por el camino largo, y entonces el rol no separa nada.
 *
 * Quitar el acceso importa tanto como darlo. Alguien se va, y su cuenta tiene
 * que dejar de aprobar identidades el mismo día: por eso `DELETE` baja a
 * `member` en vez de borrar, que conserva lo que esa persona hizo en el
 * registro de operación. Un auditoría con actores borrados no es auditoría.
 */

async function exigirAdmin(): Promise<string | null> {
  const actor = await exigirOps()
  if (!actor) return null

  const { data } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', actor)
    .maybeSingle()

  return data?.role === 'admin' ? actor : null
}

/** Qué ve el panel: quién tiene acceso hoy. */
export async function GET() {
  if (!(await exigirAdmin())) return new NextResponse(null, { status: 404 })

  const { data } = await createAdminClient()
    .from('profiles')
    .select('id, email, full_name, display_name, role, status, created_at')
    .in('role', ['ops', 'admin'])
    .is('deleted_at', null)
    .order('created_at')

  return NextResponse.json({
    equipo: (data ?? []).map((p) => ({
      id: p.id,
      correo: p.email,
      nombre: p.full_name || p.display_name || null,
      rol: p.role,
      desde: p.created_at,
    })),
  })
}

const alta = z.object({
  correo: z.string().trim().toLowerCase().email('Ese correo no se ve bien.'),
  nombre: z.string().trim().min(2, 'Escribe su nombre.').max(120),
  rol: z.enum(['ops', 'admin'], { error: 'Elige ops o admin.' }),
})

export async function POST(request: Request) {
  const actor = await exigirAdmin()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = alta.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' },
      { status: 400 },
    )
  }

  const { correo, nombre, rol } = parsed.data
  const admin = createAdminClient()

  // ¿Ya es alguien? Entonces esto no es un alta: es un ascenso, y no hay que
  // crearle otra cuenta con el mismo correo.
  const { data: yaEsta } = await admin
    .from('profiles')
    .select('id, role')
    .eq('email', correo)
    .is('deleted_at', null)
    .maybeSingle()

  if (yaEsta) {
    if (yaEsta.role === rol) {
      return NextResponse.json({ error: 'Esa persona ya tiene ese acceso.' }, { status: 409 })
    }

    const { error } = await admin.from('profiles').update({ role: rol } as never).eq('id', yaEsta.id)
    if (error) {
      console.error('[equipo] no se pudo cambiar el rol', error)
      return NextResponse.json({ error: 'No pudimos darle acceso.' }, { status: 500 })
    }

    await anotar(actor, 'acceso_concedido', 'equipo', yaEsta.id, { correo, rol, antes: yaEsta.role })
    return NextResponse.json({ estado: 'ascendido', id: yaEsta.id, rol })
  }

  // Cuenta nueva, SIN contraseña. La elige quien entra: una clave que viaja
  // por WhatsApp es una clave que se queda en WhatsApp, y quien la manda la
  // sabe para siempre.
  //
  // No se usa `inviteUserByEmail` porque manda el correo por el servicio de
  // Supabase —limitado a unos pocos por hora, y que vamos a sustituir—. Se
  // crea la cuenta y se genera el enlace, que se devuelve para que quien da
  // el alta lo entregue como pueda mientras no haya remitente.
  const { data: creada, error: errorCuenta } = await admin.auth.admin.createUser({
    email: correo,
    email_confirm: true,
  })

  if (errorCuenta || !creada?.user) {
    console.error('[equipo] no se pudo crear la cuenta', errorCuenta)
    return NextResponse.json(
      { error: 'No pudimos crear la cuenta: ' + (errorCuenta?.message ?? 'error desconocido') },
      { status: 500 },
    )
  }

  const invitado = creada

  // `active` y no `lead`: no tiene que verificarse ni contestar nada. Y el
  // trato es el nombre, que es lo que ve el resto del equipo en el registro.
  const { error: errorPerfil } = await admin.from('profiles').insert({
    id: invitado.user.id,
    email: correo,
    full_name: nombre,
    display_name: nombre.split(' ')[0],
    role: rol,
    status: 'active',
    city_slug: 'caracas',
    gender: 'sin-decir',
    locale: 'es-VE',
  } as never)

  if (errorPerfil) {
    // Sin perfil no hay rol, así que la cuenta de acceso sobra: se deshace en
    // vez de dejar una cuenta suelta que no puede entrar a ningún sitio.
    console.error('[equipo] no se pudo crear el perfil', errorPerfil)
    await admin.auth.admin.deleteUser(invitado.user.id)
    return NextResponse.json({ error: 'No pudimos crear la cuenta.' }, { status: 500 })
  }

  // El enlace para que ponga su clave. Se genera aparte del correo, así que
  // funciona hoy: quien da el alta lo entrega a mano.
  const { data: enlace } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: correo,
    // Igual que en la recuperación: sin esto, el enlace que se le entrega a
    // un compañero nuevo lo manda a localhost.
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aro.club'}/clave` },
  })

  await anotar(actor, 'acceso_concedido', 'equipo', invitado.user.id, { correo, rol, nuevo: true })

  return NextResponse.json({
    estado: 'creada',
    id: invitado.user.id,
    rol,
    // Se devuelve para entregarlo a mano. NO se guarda en ningún sitio: da
    // acceso a una cuenta que aprueba identidades, y un enlace así en un
    // registro es un enlace que sigue ahí dentro de seis meses.
    enlaceParaEntrar: enlace?.properties?.action_link ?? null,
    aviso:
      'Todavía no hay remitente de correo: entrégale este enlace tú. Caduca, ' +
      'y con él elige su propia contraseña.',
  })
}

const baja = z.object({ id: z.string().uuid() })

export async function DELETE(request: Request) {
  const actor = await exigirAdmin()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = baja.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  // Nadie se quita el acceso a sí mismo. Es la forma más fácil de quedarse
  // sin ningún admin y sin manera de recuperarlo desde el producto.
  if (parsed.data.id === actor) {
    return NextResponse.json(
      { error: 'No puedes quitarte el acceso a ti mismo. Que lo haga otro admin.' },
      { status: 409 },
    )
  }

  const admin = createAdminClient()

  const { data: quien } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', parsed.data.id)
    .maybeSingle()

  if (!quien || quien.role === 'member') {
    return NextResponse.json({ error: 'Esa persona no tiene acceso.' }, { status: 404 })
  }

  // Y no se puede quitar al último admin: dejaría el producto sin nadie que
  // pueda volver a dar acceso a nadie.
  if (quien.role === 'admin') {
    const { count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .is('deleted_at', null)

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Es el único admin. Nombra a otro antes de quitarle el acceso.' },
        { status: 409 },
      )
    }
  }

  const { error } = await admin.from('profiles').update({ role: 'member' } as never).eq('id', quien.id)

  if (error) {
    console.error('[equipo] no se pudo quitar el acceso', error)
    return NextResponse.json({ error: 'No pudimos quitarle el acceso.' }, { status: 500 })
  }

  await anotar(actor, 'acceso_retirado', 'equipo', quien.id, { correo: quien.email, era: quien.role })

  return NextResponse.json({ estado: 'retirado' })
}

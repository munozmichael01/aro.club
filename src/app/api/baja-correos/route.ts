import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verificarBaja } from '@/lib/baja-token'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Darse de baja de los correos sin tener cuenta.
 *
 * El pie de los trece correos apuntaba a `/cuenta`, que exige sesión. Pero
 * **quien recibe la bienvenida no tiene cuenta**: dejó su correo y se quedó a
 * medias. Para esa persona el enlace de baja no llevaba a ningún sitio, y un
 * enlace de baja que no funciona no es solo feo — en varias jurisdicciones no
 * es legal.
 *
 * Sin sesión, así que el permiso lo da un token firmado que viaja en el propio
 * enlace (ver `lib/baja-token`). No se acepta un correo a secas: si no, poner
 * la dirección de cualquiera en la URL bastaría para darle de baja.
 *
 * `GET` dice si el enlace vale y de qué dirección se trata —sin eso la
 * pantalla no puede decirle a nadie qué está a punto de apagar—.
 * `POST` la da de baja o lo deshace.
 */

/** Lo mínimo para no confirmar direcciones ajenas en la respuesta. */
function normalizar(v: string | null): string {
  return String(v ?? '').trim().toLowerCase()
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const correo = normalizar(url.searchParams.get('correo'))
  const token = url.searchParams.get('token')

  const firma = verificarBaja(correo, token)
  if (!firma.vale) {
    // No se devuelve la dirección cuando la firma no vale: con un token
    // inventado, responder «¿te damos de baja a ana@gmail.com?» confirmaría
    // que esa dirección es nuestra.
    return NextResponse.json({ estado: firma.motivo })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('bajas_correo')
    .select('deshecha_at')
    .eq('correo', correo)
    .maybeSingle()

  return NextResponse.json({
    estado: 'vale',
    correo,
    // Si ya estaba de baja se abre directamente en «hecho», con su deshacer:
    // volver a pulsar el enlace del correo viejo no debería parecer que no
    // funcionó la primera vez.
    yaDeBaja: Boolean(data && !data.deshecha_at),
  })
}

const cuerpo = z.object({
  correo: z.string().email(),
  token: z.string().min(10),
  // `false` es deshacer. Va explícito y no como dos rutas distintas porque es
  // la misma decisión en dos sentidos.
  baja: z.boolean(),
})

export async function POST(request: Request) {
  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const correo = normalizar(parsed.data.correo)
  const firma = verificarBaja(correo, parsed.data.token)

  if (!firma.vale) {
    return NextResponse.json(
      {
        error: firma.motivo === 'caducado'
          ? 'Ese enlace ya caducó. Puedes darte de baja desde el pie de cualquier correo nuestro.'
          : 'Ese enlace no vale.',
        estado: firma.motivo,
      },
      { status: 401 },
    )
  }

  const admin = createAdminClient()
  const ahora = new Date().toISOString()

  // Upsert y no insert: quien se da de baja, vuelve, y se da de baja otra vez
  // es el caso normal, no un error. La fila es una por dirección.
  const { error } = await admin
    .from('bajas_correo')
    .upsert(
      {
        correo,
        baja_at: ahora,
        // Deshacer no borra la fila: se marca. Que alguien se diera de baja y
        // volviera es información que interesa conservar.
        deshecha_at: parsed.data.baja ? null : ahora,
        origen: 'pie-de-correo',
      } as never,
      { onConflict: 'correo' },
    )

  if (error) {
    console.error('[baja-correos] no se pudo guardar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo. Vuelve a intentarlo.' }, { status: 500 })
  }

  return NextResponse.json({ estado: parsed.data.baja ? 'de-baja' : 'activos' })
}

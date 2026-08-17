import { NextResponse } from 'next/server'
import { z } from 'zod'

import { estaGastado, firmarVisita, gastarBaja, soltarBaja, verificarBaja } from '@/lib/baja-token'
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
 *
 * **El enlace del correo se gasta al usarse.** Se gasta al dar de baja, que
 * es la acción; abrir la pantalla no gasta nada, porque un antivirus o el
 * previsualizador del correo abren enlaces solos y eso mataría el enlace
 * antes de que nadie lo haya visto.
 *
 * El «deshacer» de después no va con el token del correo —si ese siguiera
 * valiendo, un reenvío podría volver a suscribir a quien se dio de baja— sino
 * con el token de visita que devuelve el POST.
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

  // Un enlace ya usado se cuenta como caducado y no como un estado nuevo: la
  // pantalla de CADUCADA dice exactamente lo que ha pasado —«los enlaces de
  // baja caducan por seguridad, para que nadie pueda darte de baja desde un
  // correo reenviado; abre el enlace del último correo que te llegó»— y para
  // quien lo lee es la misma situación y la misma salida.
  if (!firma.visita && token && (await estaGastado(token))) {
    return NextResponse.json({ estado: 'caducado' })
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

  // El enlace del correo se gasta AQUÍ, al hacer algo con él, y no al abrir la
  // pantalla: los antivirus y los previsualizadores de correo abren enlaces
  // solos, y gastarlo en el GET lo mataría antes de que nadie lo viera.
  //
  // Se gasta ANTES de escribir y se devuelve si la escritura falla. Al revés
  // —escribir y luego gastar— dos pulsaciones simultáneas pasarían las dos; y
  // gastándolo sin devolverlo, un fallo de base dejaría el enlace muerto sin
  // haber dado de baja a nadie, que es la peor de las tres.
  const delCorreo = !firma.visita
  if (delCorreo && !(await gastarBaja(correo, parsed.data.token))) {
    return NextResponse.json(
      {
        error: 'Ese enlace ya se usó. Puedes darte de baja desde el pie de cualquier correo nuestro.',
        estado: 'caducado',
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
    if (delCorreo) await soltarBaja(parsed.data.token)
    return NextResponse.json({ error: 'No pudimos guardarlo. Vuelve a intentarlo.' }, { status: 500 })
  }

  return NextResponse.json({
    estado: parsed.data.baja ? 'de-baja' : 'activos',
    // Con esto se puede cambiar de idea mientras la pantalla sigue delante.
    // No ha viajado por ningún correo, así que un reenvío no lo tiene.
    visita: firmarVisita(correo),
  })
}

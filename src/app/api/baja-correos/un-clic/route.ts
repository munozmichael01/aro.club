import { NextResponse } from 'next/server'

import { gastarBaja, verificarBaja } from '@/lib/baja-token'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La baja de un clic, la que pulsa el propio Gmail.
 *
 * Es el destino de la cabecera `List-Unsubscribe` con
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Cuando el correo la
 * lleva, Gmail y Apple Mail enseñan su propio «Cancelar suscripción» arriba
 * del mensaje, y al pulsarlo mandan un POST aquí. La persona no abre ninguna
 * pantalla nuestra: o esto responde 200 y la damos de baja, o su cliente le
 * dice que no se pudo.
 *
 * Por qué una ruta aparte y no el POST de al lado: el de al lado habla JSON y
 * recibe `{correo, token, baja}` en el cuerpo. El de un clic manda
 * `List-Unsubscribe=One-Click` como formulario y la identidad viaja en la
 * URL —así lo define el RFC 8058—, así que son dos contratos distintos. Y
 * este no puede ofrecer «deshacer»: no hay nadie mirando una pantalla.
 *
 * **Siempre da de baja, nunca vuelve a suscribir.** Un POST que pudiera
 * resuscribir sería un enlace en un correo que vuelve a apuntar a quien se
 * fue.
 */

export const dynamic = 'force-dynamic'

/** ¿Ya está dada de baja esta dirección? */
async function yaEstaDeBaja(correo: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('bajas_correo')
    .select('correo')
    .eq('correo', correo)
    .is('deshecha_at', null)
    .maybeSingle()

  return !!data
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const correo = String(url.searchParams.get('correo') ?? '').trim().toLowerCase()
  const token = url.searchParams.get('token')

  const firma = verificarBaja(correo, token)
  if (!firma.vale || !token) {
    // Sin devolver la dirección: con un token inventado, nombrarla
    // confirmaría que es nuestra.
    return NextResponse.json({ error: 'Ese enlace no vale.' }, { status: 401 })
  }

  // El enlace se gasta, igual que el del pie: si no, un correo reenviado
  // serviría para dar de baja a quien lo mandó.
  //
  // Pero gastado no significa fallo. El cliente de correo puede reintentar, y
  // sobre todo la persona puede pulsar dos veces; si eso devolviera 401, Gmail
  // le diría «no se pudo cancelar la suscripción» a alguien que YA está dado
  // de baja. Así que cuando el enlace está gastado se mira el resultado, no el
  // enlace: si ya está de baja, esto ya hizo su trabajo y responde 200.
  if (!(await gastarBaja(correo, token))) {
    if (await yaEstaDeBaja(correo)) return NextResponse.json({ ok: true, yaEstaba: true })
    return NextResponse.json({ error: 'Ese enlace ya se usó.' }, { status: 401 })
  }

  const ahora = new Date().toISOString()
  const { error } = await createAdminClient()
    .from('bajas_correo')
    .upsert(
      {
        correo,
        baja_at: ahora,
        deshecha_at: null,
        // De dónde salió. El pie de correo y el botón del propio Gmail son
        // dos gestos distintos y conviene poder distinguirlos: si un día casi
        // todas las bajas llegan por aquí, el problema no es el pie, es que
        // estamos escribiendo de más.
        origen: 'un-clic',
      } as never,
      { onConflict: 'correo' },
    )

  if (error) {
    console.error('[baja-un-clic] no se pudo guardar', error)
    // Sin soltar el token: un 500 lo reintenta el cliente, y soltarlo abriría
    // la puerta a gastarlo dos veces.
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

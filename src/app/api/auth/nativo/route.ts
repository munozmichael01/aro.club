import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { esRelayDeApple, trasEntrar } from '@/lib/tras-entrar'

import { ciudadValida } from '@/lib/ciudades'

/**
 * La vuelta de Apple y Google, para la app.
 *
 * Es `/auth/callback` sin el navegador. Allí se canjea un `code`, se leen
 * cookies de ida y se responde con un 302; aquí la sesión ya está abierta —la
 * abre el SDK de Supabase en el teléfono— y lo que hace falta de vuelta es
 * decir en qué paso está la persona, para que la app sepa qué pantalla pintar.
 *
 * Lo demás es la MISMA función: `trasEntrar()`. Si esto se hubiera escrito
 * aparte, el día que cambie una regla del cruce del lead cambiaría en una de
 * las dos puertas.
 *
 * **NO recibe tokens de Google ni de Apple.** La sesión viaja en la misma
 * cookie que la del resto del producto, y quién es lo dice Supabase, no el
 * cuerpo de la petición. Una ruta que aceptara un id_token tendría que
 * verificarlo contra las llaves del proveedor, y eso ya lo hace Supabase.
 *
 * **Es idempotente.** La app la reintenta al arrancar si murió entre el login
 * y esta llamada, así que llamarla con la cuenta ya completa NO es un error:
 * responde el paso que corresponda. Por eso no hay un «ya estaba hecho».
 */

const cuerpo = z.object({
  /**
   * El correo del lead que traía, si lo tenía guardado.
   *
   * Sirve para el caso de «entré con otro correo»: se apuntó con uno y entra
   * con el de su Apple o su Google. Es opcional porque la mayoría no lo trae.
   */
  leadPrevio: z.string().trim().email().max(200).nullish(),
  /**
   * Su ciudad, para el alta con Apple o Google desde la app.
   *
   * Ni Apple ni Google la dan, así que o la manda la app —que la preguntó
   * antes de mandar a nadie al proveedor— o el perfil nace en Caracas sin que
   * nadie lo haya dicho. Como en `/api/cuenta`, solo cuenta cuando NO hay
   * lead: con lead manda lo que se eligió en la landing.
   */
  ciudad: z.string().regex(/^[a-z-]+$/).max(40).nullish(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  // El cuerpo es opcional entero: la llamada normal no lleva nada.
  const parsed = cuerpo.safeParse(await request.json().catch(() => ({})))
  const leadPrevio = parsed.success ? (parsed.data.leadPrevio ?? null) : null
  // Como el cuerpo entero es opcional aquí —la app la reintenta al arrancar y
  // puede llegar sin nada—, una ciudad ausente vale: es la de siempre.
  const ciudadFinal = await ciudadValida(parsed.success ? parsed.data.ciudad : null)
  if (!ciudadFinal) {
    return NextResponse.json({ error: 'Esa ciudad no está en la lista.' }, { status: 400 })
  }

  const correo = (user.email ?? '').trim().toLowerCase()

  // El correo tiene que venir verificado por el proveedor.
  //
  // Es la misma condición que en la web y por el mismo motivo: sin ella,
  // enlazar por correo es regalarle la cuenta a quien controle esa dirección.
  // Aquí se mira además `email_confirmed_at`, que es lo que pone Supabase
  // cuando la identidad llega verificada de fuera.
  const verificado =
    !!user.email_confirmed_at ||
    user.user_metadata?.email_verified === true ||
    (user.identities ?? []).some((i) => i.identity_data?.email_verified === true)

  if (!correo || !verificado) {
    return NextResponse.json(
      { error: 'Ese correo no viene verificado por el proveedor.' },
      { status: 403 },
    )
  }

  // De qué proveedor. Es lo que se guarda como atribución cuando la cuenta se
  // crea sin lead, para no perder de dónde salió — que es lo que pasaba hasta
  // ahora con cada alta directa de Google.
  const proveedor = (user.app_metadata?.provider as string | undefined) ?? 'nativo'

  const r = await trasEntrar({
    usuarioId: user.id,
    correo,
    nombre:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    leadPrevio,
    origen: `app-${proveedor}`,
    ciudad: ciudadFinal,
  })

  if (!r.ok) {
    return NextResponse.json({ error: 'No pudimos crear tu cuenta.' }, { status: 409 })
  }

  return NextResponse.json({
    // Dónde está en el embudo. La app pinta la pantalla que le toque a este
    // paso y no lleva su propia lista de lo que falta.
    paso: r.paso,
    // Lo que falta, desglosado, por si quiere decirlo en la pantalla sin
    // volver a preguntar.
    falta: r.situacion.falta,
    // Se apuntó con un correo y entró con otro: hay que preguntarle a cuál le
    // escribimos. `null` cuando no hay dos, que es casi siempre.
    otroCorreo: r.otroCorreo,
    // Apple le dio una dirección de reenvío en vez de la suya. Hay que
    // decírselo: nuestros correos van ahí, y si revoca el permiso desde su
    // iPhone dejan de llegarle sin que nosotros nos enteremos.
    relay: esRelayDeApple(correo),
    // Si el perfil se creó en ESTA llamada. En un reintento es `false`, y
    // sirve para no volver a enseñar una bienvenida que ya vio.
    creado: r.creado,
  })
}

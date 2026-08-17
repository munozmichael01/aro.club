import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Poner una contraseña nueva.
 *
 * Faltaba entero, y no era un detalle: sin Google ni Apple conectados, la
 * contraseña es la ÚNICA puerta. Quien la olvidara perdía la cuenta para
 * siempre —con su verificación, sus créditos y su historial dentro—.
 *
 * El correo de recuperación existía desde el principio y el enlace se
 * generaba bien. Lo que no existía era el otro lado: ninguna pantalla leía
 * ese enlace y ninguna ruta aceptaba una clave nueva. Se descubre intentando
 * usarlo, no leyéndolo.
 *
 * Cómo llega aquí: Supabase redirige el enlace a `/clave` con el token en el
 * fragmento de la URL —`#access_token=…`—, que solo ve el navegador. La
 * pantalla lo lee y lo manda aquí con la contraseña. Se hace así, y no con el
 * cliente de Supabase en el navegador, porque las pantallas son estáticas y
 * meterles un cliente de autenticación solo para esto sería cargar una
 * librería entera en todas para una que la usa.
 *
 * Cambiar la contraseña CIERRA todas las sesiones abiertas, que es lo que la
 * pantalla promete y lo que necesita quien pide el cambio porque le entraron.
 * De paso mata el propio enlace: el token del correo es una sesión más, así
 * que al cerrarlas deja de valer y el enlace se vuelve de un solo uso, que es
 * lo que dice la pantalla de caducado.
 */

const cuerpo = z.object({
  // El token del enlace. No se valida su forma: lo valida Supabase al usarlo,
  // y adivinar aquí qué formato tiene solo añade una regla que se rompe el
  // día que cambien el suyo.
  token: z.string().min(20, 'El enlace no vale.'),
  // Ocho es el mínimo de Supabase. No se piden mayúsculas ni símbolos: eso
  // produce contraseñas peores y apuntadas en un papel.
  clave: z.string().min(8, 'La contraseña necesita al menos ocho caracteres.').max(72),
})

/**
 * De qué cuenta es este enlace.
 *
 * Design lo pidió y tiene razón: sin el correo en pantalla no se sabe si el
 * enlace es tuyo. Alguien con dos direcciones —o quien recibe el correo
 * reenviado— está a punto de cambiar una contraseña sin saber de cuál.
 *
 * Sirve además para saber si el enlace vale ANTES de pedirle a nadie que
 * escriba una contraseña: es la diferencia entre abrir en «caducado» y
 * dejar que teclee para luego decírselo.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token || token.length < 20) return NextResponse.json({ estado: 'invalido' })

  const { data, error } = await createAdminClient().auth.getUser(token)
  if (error || !data?.user?.email) return NextResponse.json({ estado: 'caducado' })

  return NextResponse.json({ estado: 'vale', correo: data.user.email })
}

export async function POST(request: Request) {
  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' },
      { status: 400 },
    )
  }

  const { token, clave } = parsed.data

  // Quién es, según el token. Si no vale, aquí se acaba.
  const admin = createAdminClient()
  const { data: quien, error: errorToken } = await admin.auth.getUser(token)

  if (errorToken || !quien?.user) {
    return NextResponse.json(
      { error: 'Ese enlace ya no vale. Pide otro desde la pantalla de entrar.' },
      { status: 401 },
    )
  }

  // --- 1 · fuera todo el mundo ------------------------------------------
  //
  // La pantalla promete dos veces —antes y después— que al guardar se cierra
  // la sesión en los demás dispositivos, y hasta aquí no se cerraba ninguna:
  // solo se cambiaba la contraseña. Quien pide el cambio PORQUE le entraron
  // cuenta exactamente con esto, y cambiar la clave sin echar las sesiones
  // abiertas no le quita el acceso a nadie: el que estaba dentro sigue dentro
  // con su token, sin volver a escribir la contraseña vieja nunca más.
  // Prometerlo sin hacerlo es peor que no decirlo.
  //
  // Va ANTES de guardar la contraseña, y el orden es la decisión. Si algo
  // falla entre los dos pasos, hay que elegir con qué mitad quedarse:
  //
  //   · contraseña nueva y sesiones vivas → el intruso sigue dentro y ella
  //     cree que lo ha echado. Es el fallo que estamos arreglando.
  //   · sesiones cerradas y contraseña vieja → el intruso está fuera y ella
  //     pide otro enlace. Molesta y no hace daño.
  //
  // Quien está en esta pantalla ya no puede entrar, así que cerrarle sesiones
  // no le quita nada.
  // `signOut` quiere el JWT de una sesión viva, no el id de la persona. Con
  // el id no falla al compilar —los dos son `string`— y falla en cada
  // llamada, en silencio si nadie mira el error. Aquí el JWT es el token del
  // propio enlace: el correo de recuperación abre una sesión, y esa sesión
  // sirve para cerrar todas las demás. `global` incluye a esta.
  const { error: errorSesiones } = await admin.auth.admin.signOut(token, 'global')

  if (errorSesiones) {
    console.error('[clave] no se pudieron cerrar las sesiones', errorSesiones)
    return NextResponse.json(
      {
        error: 'No pudimos cerrar las sesiones abiertas, así que no cambiamos la contraseña.'
          + ' Vuelve a intentarlo o escríbenos a hola@aro.club.',
      },
      { status: 500 },
    )
  }

  // --- 2 · la contraseña nueva ------------------------------------------
  const { error } = await admin.auth.admin.updateUserById(quien.user.id, { password: clave })

  if (error) {
    console.error('[clave] no se pudo cambiar', error)
    return NextResponse.json(
      { error: 'No pudimos guardarla. Vuelve a intentarlo.' },
      { status: 500 },
    )
  }

  // El enlace de recuperación que quedó en la cola da acceso a esta cuenta.
  // Ya se usó, así que se vacía: un enlace vivo guardado en una tabla es un
  // enlace que sigue ahí dentro de seis meses.
  await admin
    .from('scheduled_emails')
    .update({ payload: {} as never })
    .eq('profile_id', quien.user.id)
    .eq('kind', 'restablecer_clave')

  return NextResponse.json({ estado: 'cambiada' })
}

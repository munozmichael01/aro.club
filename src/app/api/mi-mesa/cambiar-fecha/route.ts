import { NextResponse } from 'next/server'
import { z } from 'zod'

import { encolar } from '@/lib/correos'
import { moverReserva, type MotivoDeNo } from '@/lib/mover-reserva'
import { HORAS_DE_MARGEN } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Cambiarse de fecha uno mismo, desde Mi cena.
 *
 * Michael, 29-10, viendo lo que hace Timeleft: «hagámoslo ahora». Hasta hoy
 * la única forma era cancelar y volver a reservar —con el riesgo de perder
 * el crédito si quedaban menos de 24 horas— o escribirnos para que lo
 * hiciera operación a mano.
 *
 * Mueve la MISMA fila, así que el pago viaja con ella: no se cobra nada, no
 * se devuelve nada y el crédito ni se toca. Lo que decide y lo que
 * comprueba vive en `src/lib/mover-reserva.ts`, compartido con el panel.
 *
 * Las reglas de aquí son más duras que las de operación, y a propósito:
 *
 *  · La fecha de destino tiene que estar abierta AL PÚBLICO. Operación
 *    puede meter gente en una cerrada; una persona no, porque entonces el
 *    cierre no significaría nada.
 *  · Más de 24 horas hasta la fecha que deja, la misma frontera que
 *    cancelar con crédito. Lo que protege es al restaurante de esa noche,
 *    que tiene la mesa apartada.
 *  · Antes de la revelación. Después hay cinco personas que ya saben que
 *    van a cenar contigo.
 *  · Sin `forzar`: la banda de edad y el idioma son la promesa de esa
 *    fecha, y saltársela no es una decisión que pueda tomar quien se
 *    beneficia.
 */

const cuerpo = z.object({
  reservaId: z.string().uuid(),
  aEventoId: z.string().uuid(),
})

/** 404 solo para lo que no existe; lo demás es el estado del mundo. */
const CODIGO: Partial<Record<MotivoDeNo, number>> = {
  'no-existe': 404,
  'sin-reserva': 404,
  fallo: 500,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }
  const d = parsed.data
  const admin = createAdminClient()

  /**
   * La reserva, SUYA y viva. Se busca por id y por dueño a la vez.
   *
   * Buscándola solo por id, mandar el id de la reserva de otra persona la
   * movería: el cuerpo lo escribe quien llama.
   */
  const { data: reserva } = await admin
    .from('bookings')
    .select('id, event_id')
    .eq('id', d.reservaId)
    .eq('profile_id', user.id)
    .in('status', ['pending_payment', 'confirmed'])
    .maybeSingle()

  if (!reserva) {
    return NextResponse.json(
      { error: 'No encontramos esa reserva.', motivo: 'sin-reserva' },
      { status: 404 },
    )
  }

  const r = await moverReserva(admin, {
    perfilId: user.id,
    desdeEventoId: reserva.event_id,
    aEventoId: d.aEventoId,
    // Su propio id: quien la movió fue ella. `movida_por` igual a
    // `profile_id` es lo que distingue un cambio suyo de uno de operación.
    movidaPor: user.id,
    reglas: {
      destinoAdmite: ['open'],
      exigirDestinoAbiertoAlPublico: true,
      permitirOtroDia: true,
      horasMinimasHastaElOrigen: HORAS_DE_MARGEN,
      prohibirSiYaSeRevelo: true,
      forzarEncaje: false,
      exigirMismoPrecio: true,
    },
  })

  if (!r.ok) {
    return NextResponse.json(
      { error: r.error, motivo: r.motivo },
      { status: CODIGO[r.motivo] ?? 409 },
    )
  }

  /**
   * El acuse, que aquí SIEMPRE sale aunque sea la misma noche.
   *
   * Es la diferencia con el panel. Cuando mueve operación, dentro de la
   * misma noche la persona no se entera de nada y no hay nada que contarle.
   * Cuando lo hace ella, acaba de pulsar un botón que cambia su reserva: un
   * acuse que no llega se lee como que no funcionó, y lo siguiente es
   * volver a pulsarlo o escribirnos.
   */
  const { data: quien } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const encolado = await encolar(
    { perfil: user.id },
    'fecha_cambiada',
    { desdeEventoId: reserva.event_id, loHizo: 'la-persona', trato: quien?.display_name ?? '' },
    { eventoId: d.aEventoId },
  )

  if (encolado !== 'encolado') {
    console.error('[cambiar-fecha] movida pero sin acuse', user.id, encolado)
  }

  return NextResponse.json({
    estado: 'cambiada',
    reserva: r.reservaId,
    aEventoId: d.aEventoId,
    cambioDeDia: r.cambioDeDia,
  })
}

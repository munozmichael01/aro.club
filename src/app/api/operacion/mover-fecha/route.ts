import { NextResponse } from 'next/server'
import { z } from 'zod'

import { encolar } from '@/lib/correos'
import { moverReserva, type MotivoDeNo } from '@/lib/mover-reserva'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cambiar a alguien de fecha, desde el panel.
 *
 * Michael, 20-10: «mantenlo separado y en lugar de mezclar las mesas en la
 * fecha, me permites mover a alguien de fecha desde el panel».
 *
 * El reparto mueve gente entre MESAS de una fecha. Entre fechas no puede, y
 * no es un descuido: la reserva, el pago y los correos de esa persona son de
 * una fecha concreta, así que moverla es cambiar la reserva de sitio, no
 * arrastrar una ficha. Por eso vive aquí y no en `/api/operacion/propuesta`.
 *
 * YA NO SOLO DENTRO DE LA MISMA NOCHE. Michael, 28-10.
 *
 * El límite estaba porque cambiarle el DÍA a alguien hay que avisárselo y el
 * panel no sabía hacerlo. Ahora sí: si el cambio le cambia el día, sale
 * `fecha_cambiada`. Dentro de la misma noche sigue sin salir nada, que es lo
 * correcto: la persona no se entera de nada, porque su mesa y su sitio se
 * cuentan en la revelación como a todo el mundo.
 *
 * Lo que decide y lo que comprueba vive en `src/lib/mover-reserva.ts`, que
 * comparte con Mi cena: es la misma máquina con dos conductores.
 */

const cuerpo = z.object({
  perfilId: z.string().uuid(),
  desdeEventoId: z.string().uuid(),
  aEventoId: z.string().uuid(),
  /** Mover igualmente a quien no encaja por edad o por idioma. */
  forzar: z.boolean().optional(),
})

/**
 * El código con el que contesta cada negativa.
 *
 * 404 solo para lo que no existe. Todo lo demás es 409: la petición está
 * bien escrita y el estado del mundo es el que no deja.
 */
const CODIGO: Partial<Record<MotivoDeNo, number>> = {
  'no-existe': 404,
  'sin-reserva': 404,
  fallo: 500,
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }
  const d = parsed.data
  const admin = createAdminClient()

  const r = await moverReserva(admin, {
    perfilId: d.perfilId,
    desdeEventoId: d.desdeEventoId,
    aEventoId: d.aEventoId,
    movidaPor: actor,
    reglas: {
      // Operación puede meter gente en una fecha ya cerrada al público: es
      // justo para lo que sirve mover a mano.
      destinoAdmite: ['open', 'locked'],
      exigirDestinoAbiertoAlPublico: false,
      permitirOtroDia: true,
      horasMinimasHastaElOrigen: null,
      prohibirSiYaSeRevelo: false,
      /**
       * Edad e idioma son pregunta, no candado.
       *
       * Quien decide es operación, y mover gente es justamente para los
       * casos que el automático no resuelve. Pero no puede pasar sin
       * querer: el panel pregunta con el motivo delante y reintenta con
       * `forzar`.
       */
      forzarEncaje: d.forzar === true,
      // El precio sí es candado, también aquí: lo pagado viaja con la fila
      // y nadie recalcula nada, así que moverla a otro precio deja a esa
      // persona dentro habiendo pagado de menos o de más.
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
   * Y si le cambió el DÍA, se le dice.
   *
   * Va con `eventoId` de la fecha NUEVA, que es de la que habla, y con la
   * vieja en el payload para poder enseñar las dos. El correo lee las dos
   * de la base al mandar: un día escrito aquí es el que sigue diciendo «el
   * sábado 31» cuando esa fecha se movió de hora.
   */
  let avisado = false
  if (r.cambioDeDia) {
    const { data: quien } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', d.perfilId)
      .maybeSingle()

    const encolado = await encolar(
      { perfil: d.perfilId },
      'fecha_cambiada',
      { desdeEventoId: d.desdeEventoId, loHizo: 'operacion', trato: quien?.display_name ?? '' },
      { eventoId: d.aEventoId },
    )
    avisado = encolado === 'encolado'
    if (!avisado) {
      // No se traga: mover a alguien de día sin que se entere es dejarlo
      // yendo la noche que no es, y el panel tiene que poder decirlo.
      console.error('[mover-fecha] movida pero sin avisar', d.perfilId, encolado)
    }
  }

  /**
   * Lo que NO se toca, a propósito:
   *
   *  · el pago, que va atado a la reserva y la reserva es la misma fila;
   *  · el crédito, porque no se ha devuelto nada ni se ha cobrado de nuevo.
   *
   * Y las propuestas guardadas de las dos fechas se quedan viejas: la de
   * origen la sigue enseñando y el panel ya la marca como «ya no está», y la
   * de destino no la tiene todavía. Las dos se arreglan volviendo a repartir,
   * que es lo que hay que hacer después de mover a alguien.
   */
  return NextResponse.json({
    estado: 'movida',
    reserva: r.reservaId,
    reservoEn: r.reservoEn,
    cambioDeDia: r.cambioDeDia,
    // Para que el panel pueda decir «movida, y avisada» o avisar de que el
    // correo no salió.
    avisada: r.cambioDeDia ? avisado : null,
    hayQueRepartir: true,
  })
}

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * ¿Vale este código, para esta persona y esta fecha? Un solo sitio.
 *
 * Lo preguntan dos rutas y por motivos distintos: `/api/cupon`, para canjear
 * uno del 100% que aparta el puesto sin cobrar, y `/api/pago`, para cobrar
 * menos cuando el descuento es parcial. Escrito dos veces serían dos ideas de
 * qué código vale, y el día que una aprenda un candado y la otra no se rompe
 * por el lado que nadie mira. Ya pasó con la verificación: una puerta con
 * candado y la de al lado sin él.
 *
 * ## El parcial no se canjea aquí, se cobra en Pago
 *
 * Hasta el 30-10 `/api/cupon` se negaba en seco a los parciales: «todavía no
 * podemos aplicarlo». Tenía razón mientras no existiera el camino de cobrar
 * el resto, porque un cupón del 100% confirma la reserva en el acto y uno del
 * 20% no confirma nada: hay que transferir los otros 8 ref, con su tasa, su
 * referencia y su conciliación.
 *
 * Así que el parcial no es un método de pago, es un precio: se comprueba al
 * teclearlo —para poder enseñar el importe nuevo ANTES de que la persona
 * salga al banco— y se vuelve a comprobar al reportar el pago, que es cuando
 * se apunta el canje. Lo que decide cuánto se cobra es siempre el servidor:
 * si valiera el importe que manda la pantalla, el descuento lo elegiría quien
 * paga.
 *
 * ## Las reglas del código de referido
 *
 * Michael, 29-10: 20% para quien llega, y solo en su primera fecha. Eso son
 * tres candados que los cupones de operación no necesitan y este sí:
 *
 *  - **nadie usa el suyo**, que si no el descuento es un precio nuevo;
 *  - **ni dos códigos de referido**, uno por cada cena;
 *  - **solo la primera vez.** «Tu primera fecha con 20%» es lo que dice el
 *    enlace que se comparte, y es lo que tiene que cumplir.
 *
 * El único de `coupon_redemptions` ya impide repetir EL MISMO código. Lo que
 * no sabe es que dos códigos distintos de dos personas distintas son el mismo
 * descuento, y esa es la diferencia entre un referido y un cupón.
 */

/** Lo que se puede usar, con lo que hace falta para enseñarlo y cobrarlo. */
export type Vale = {
  code: string
  pct: number
  usados: number
  /** De quién es el código, cuando es de referido. `null` en los de operación. */
  deQuien: string | null
  /** Con qué nombre se enseña: «Código de Andrea · −20%». */
  nombre: string | null
}

/**
 * Por qué no vale, con el código con el que contesta la ruta.
 *
 * `motivo` es estable y la pantalla pinta por él: quien llama no tiene que
 * leer el texto del error para saber qué pasó.
 */
export type NoVale = { error: string; motivo: string; status: 404 | 409 }

/** Mayúsculas y sin espacios: nadie teclea un código como está guardado. */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * El precio con el descuento puesto, redondeado a céntimo.
 *
 * Redondea con `toFixed(2)` y no a entero: 10 ref al 20% son 8 justos, pero
 * 6,90 al 20% son 5,52, y cobrar 5,50 o 6 es cobrar otra cosa. El importe en
 * bolívares se calcula después sobre ESTE número, nunca sobre el pleno.
 */
export function precioConDescuento(usd: number, pct: number): number {
  return Number((usd * (100 - pct) / 100).toFixed(2))
}

/** Los pagos que están en pie: reportados y sin rechazar. */
const PAGOS_VIVOS = ['awaiting_proof', 'under_review', 'confirmed'] as const

/** Las reservas que significan «ya tuvo su puesto». */
const YA_SE_SENTO: readonly string[] = ['confirmed', 'attended', 'no_show']

export async function cuponParaPagar(
  admin: SupabaseClient<Database>,
  datos: {
    codigo: string
    perfilId: string
    /** La fecha que se está pagando. */
    evento: { id: string }
  },
): Promise<{ vale: Vale } | { no: NoVale }> {
  const code = normalizarCodigo(datos.codigo)
  const { perfilId, evento } = datos

  const { data: cupon } = await admin
    .from('coupons')
    .select('code, descuento_pct, max_usos, usados, caduca_at, event_id, activo, creado_por')
    .eq('code', code)
    .maybeSingle()

  // Un código que no existe y uno apagado dicen lo MISMO a quien lo teclea.
  // Distinguirlos le contaría a un desconocido qué códigos existen.
  if (!cupon || !cupon.activo) {
    return { no: { error: 'Ese código no vale.', motivo: 'no-vale', status: 404 } }
  }

  if (cupon.caduca_at && new Date(cupon.caduca_at).getTime() < Date.now()) {
    return { no: { error: 'Ese código ya caducó.', motivo: 'caducado', status: 409 } }
  }

  if (cupon.max_usos != null && cupon.usados >= cupon.max_usos) {
    return { no: { error: 'Ese código ya se agotó.', motivo: 'agotado', status: 409 } }
  }

  if (cupon.event_id && cupon.event_id !== evento.id) {
    return { no: { error: 'Ese código no vale para esta fecha.', motivo: 'otra-fecha', status: 409 } }
  }

  // Se pregunta antes aunque el índice único lo impida igual: el mensaje que
  // sale de una violación de índice no se le puede enseñar a nadie.
  const { data: yaCanjeo } = await admin
    .from('coupon_redemptions')
    .select('code')
    .eq('profile_id', perfilId)

  const suyos = yaCanjeo ?? []
  if (suyos.some((r) => r.code === code)) {
    return { no: { error: 'Ya usaste ese código.', motivo: 'ya-usado', status: 409 } }
  }

  const deReferido = (cupon as { creado_por?: string | null }).creado_por ?? null

  if (deReferido) {
    if (deReferido === perfilId) {
      return {
        no: {
          error: 'Ese código es tuyo. Compártelo con alguien que todavía no haya venido.',
          motivo: 'tu-propio-codigo',
          status: 409,
        },
      }
    }

    /**
     * Ni dos códigos de referido, aunque sean de dos personas distintas.
     *
     * Se mira contra los códigos que ya canjeó: si alguno tenía dueño, el
     * descuento de bienvenida ya se lo llevó. El único de la tabla no puede
     * verlo, porque para él son dos códigos que no se parecen en nada.
     */
    if (suyos.length) {
      const { data: conDueno } = await admin
        .from('coupons')
        .select('code')
        .in('code', suyos.map((r) => r.code))
        .not('creado_por', 'is', null)
        .limit(1)

      if ((conDueno ?? []).length) {
        return {
          no: {
            error: 'Ya usaste un código de invitación. Solo entra uno por persona.',
            motivo: 'otro-referido',
            status: 409,
          },
        }
      }
    }

    /**
     * Y solo en su PRIMERA fecha.
     *
     * «Tu primera fecha con un 20% de descuento» es lo que dice el enlace que
     * se comparte, así que se cumple: quien ya se sentó una vez no está
     * llegando. Se mira por dos lados porque son dos cosas distintas y
     * ninguna cubre a la otra: haber tenido puesto en una fecha anterior, y
     * tener un pago vivo de otra reserva ahora mismo, que es alguien a mitad
     * de su primera cena y no de camino a ella.
     */
    const { data: reservas } = await admin
      .from('bookings')
      .select('id, status, event_id')
      .eq('profile_id', perfilId)

    const otras = (reservas ?? []).filter((r) => r.event_id !== evento.id)
    const yaSeSento = otras.some((r) => YA_SE_SENTO.includes(r.status))

    let yaPagoOtra = false
    if (!yaSeSento && otras.length) {
      const { data: pagos } = await admin
        .from('payments')
        .select('id')
        .in('booking_id', otras.map((r) => r.id))
        .in('status', [...PAGOS_VIVOS])
        .limit(1)
      yaPagoOtra = !!(pagos ?? []).length
    }

    if (yaSeSento || yaPagoOtra) {
      return {
        no: {
          error: 'El código de invitación es para la primera fecha, y esta no es la tuya.',
          motivo: 'no-es-la-primera',
          status: 409,
        },
      }
    }
  }

  /**
   * Y el nombre de quien lo reparte, para que la pantalla diga «Código de
   * Andrea» y no «código ANDREA7KQ».
   *
   * Solo el nombre de pila, que es lo que ya se enseña en una mesa. El
   * apellido de quien te invitó no es un dato que haga falta para pagar.
   */
  let nombre: string | null = null
  if (deReferido) {
    const { data: quien } = await admin
      .from('profiles')
      .select('display_name, full_name')
      .eq('id', deReferido)
      .maybeSingle()
    nombre = quien?.display_name || quien?.full_name?.split(' ')[0] || null
  }

  return {
    vale: {
      code: cupon.code,
      pct: cupon.descuento_pct,
      usados: cupon.usados,
      deQuien: deReferido,
      nombre,
    },
  }
}

/**
 * Apuntar el canje: quién usó qué, atado al pago que lo aplicó.
 *
 * Va DESPUÉS de que el puesto y el pago existan, y por eso no revienta si
 * falla: a esa altura la persona ya tiene su sitio y su descuento, y tumbarlo
 * por no poder anotar el canje sería cobrarle el error. Un choque del único
 * —dos pestañas a la vez— no es un fallo: es la segunda, que llega tarde.
 */
export async function anotarCanje(
  admin: SupabaseClient<Database>,
  datos: {
    code: string
    perfilId: string
    bookingId: string
    paymentId: string | null
    usados: number
  },
): Promise<void> {
  const { error } = await admin.from('coupon_redemptions').insert({
    code: datos.code,
    profile_id: datos.perfilId,
    booking_id: datos.bookingId,
    payment_id: datos.paymentId,
  })

  if (error) {
    if (error.code !== '23505') console.error('[cupones] no se anotó el canje', datos.code, error)
    return
  }

  await admin
    .from('coupons')
    .update({ usados: datos.usados + 1 })
    .eq('code', datos.code)
}

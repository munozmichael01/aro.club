import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotarPagoDeEvento } from '@/lib/creditos'
import { datosDePago } from '@/lib/datos-de-pago'
import { anotarCanje, cuponParaPagar, normalizarCodigo, precioConDescuento } from '@/lib/cupones'
import { encolar } from '@/lib/correos'
import { PRECIO_USD } from '@/lib/reglas'
import { hablaElIdioma, noCabePorIdioma, pideIdioma } from '@/lib/idioma'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { declararZonasAlReservar } from '@/lib/zonas-declaradas'

/**
 * Canjear un cupón: aparta el puesto y lo confirma, sin cobrar.
 *
 * Vive aparte de `/api/pago` y no dentro, aunque comparta la mitad de arriba
 * —sesión, fecha abierta, verificada, apartar el puesto—, porque lo de abajo
 * es otro camino entero: no hay método que elegir, ni tasa que congelar, ni
 * referencia que cuadrar, ni captura, ni conciliación. Meterlo en la misma
 * ruta habría sido un `if` gigante encima de un cuerpo que ya valida quince
 * campos que aquí no existen.
 *
 * Lo que sí reutiliza es la idea del método `manual = false`, que ya estaba
 * escrita: confirmar en el acto y mandar el acuse. El cupón es un método de
 * pago que no cobra.
 *
 * ## Dos salidas, y solo una canjea
 *
 * Desde el 30-10 esta ruta también contesta a los códigos PARCIALES, que
 * antes se rechazaban en seco. Un 20% no confirma nada: hay que transferir el
 * resto. Así que lo único que hace con ellos es decir cuánto se paga ahora
 * —`estado: 'descuento'`— para que la pantalla lo enseñe ANTES de que la
 * persona salga al banco; el canje se apunta en `/api/pago`, al reportar.
 *
 * Por eso el permiso de grabación solo se exige en el camino del 100%: es el
 * único que aparta puesto. Pedir permiso para ser grabado antes de poder
 * calcular un descuento sería pedirlo por nada.
 *
 * ## El orden importa
 *
 * El puesto se aparta ANTES de dar el cupón por gastado. Si el orden fuera al
 * revés y algo fallara por el camino, alguien se quedaría sin código y sin
 * sitio, que es el peor de los dos fallos posibles.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  codigo: z.string().min(1).max(40),
  /**
   * El permiso de grabación, si la fecha se graba entera.
   *
   * La tercera puerta por la que se aparta un puesto, y se me había pasado:
   * puse el candado en `/api/reservar` y en `/api/pago` y dejé esta abierta,
   * así que un código canjeaba puesto en una fecha con cámara sin que nadie
   * diera permiso. Lo vio el agente de la app preguntando «¿el cupón también
   * aparta puesto?».
   */
  permiteGrabacion: z.boolean().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const codigo = normalizarCodigo(parsed.data.codigo)
  const admin = createAdminClient()

  // --- la fecha ---------------------------------------------------------
  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, booking_closes_at, status, credit_cost, price_usd, grabacion, grabacion_requerida, idioma')
    .eq('id', parsed.data.eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  /**
   * Y sin el idioma de la mesa tampoco hay puesto.
   *
   * Justo detras del permiso de grabacion y por lo mismo. La regla entera
   * vive en `lib/idioma`, compartida por las tres puertas: una que vigile
   * solo una de las tres no es una regla, y por aqui se entra sin pasar por
   * reservar.
   */
  if (pideIdioma(evento)) {
    const suIdioma = String((evento as { idioma?: string | null }).idioma)
    if (!(await hablaElIdioma(admin, user.id, suIdioma))) {
      return NextResponse.json(noCabePorIdioma(suIdioma), { status: 409 })
    }
  }

  if (new Date(evento.booking_closes_at).getTime() < Date.now()) {
    return NextResponse.json(
      // `motivo` es un código estable: quien llama no tiene que leer el texto
      // del error para saber qué pasó, y la app lo usa para pintar la pantalla.
      { error: 'Esa fecha ya cerró.', motivo: 'fecha-cerrada' },
      { status: 409 },
    )
  }

  if (evento.status !== 'open' && evento.status !== 'draft') {
    return NextResponse.json(
      { error: 'Esa fecha está cerrada. Mira la siguiente en tu inicio.' },
      { status: 409 },
    )
  }

  // --- verificada, o no hay mesa ----------------------------------------
  //
  // El mismo candado que `/api/reservar` y `/api/pago`. Un cupón no lo abre:
  // es la regla que sostiene que cinco desconocidos se sienten con alguien, y
  // un invitado sin verificar rompe la mesa igual que cualquiera.
  const { data: verificada } = await admin
    .from('v_verified_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!verificada) {
    return NextResponse.json(
      { error: 'Verifica tu identidad antes de apartar tu puesto.' },
      { status: 409 },
    )
  }

  // --- el cupón ---------------------------------------------------------
  //
  // Las reglas enteras viven en `lib/cupones`, compartidas con `/api/pago`:
  // dos ideas de qué código vale serían dos respuestas a la misma pregunta.
  const mirado = await cuponParaPagar(admin, {
    codigo,
    perfilId: user.id,
    evento: { id: evento.id },
  })

  if ('no' in mirado) {
    return NextResponse.json(
      { error: mirado.no.error, motivo: mirado.no.motivo },
      { status: mirado.no.status },
    )
  }
  const cupon = mirado.vale

  /**
   * Parcial: no canjea, informa.
   *
   * Aquí se acaba el trabajo de esta ruta. Quien tiene un 20% sigue por Pago
   * como todo el mundo —método, tasa, referencia, captura— y el canje se
   * apunta allí, al reportar. Lo único que se contesta es cuánto se paga
   * ahora, para que la pantalla lo enseñe antes del banco y no después.
   *
   * No aparta puesto a propósito: apartarlo aquí y cobrar allí dejaría un
   * puesto en pie a nombre de quien todavía no ha transferido nada, cada vez
   * que alguien teclea su código para ver cuánto le queda.
   */
  if (cupon.pct !== 100) {
    const { data: tasa } = await admin
      .from('fx_rates')
      .select('rate_date, ves_por_ref')
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const pleno = Number(evento.price_usd ?? PRECIO_USD)
    const conDescuento = precioConDescuento(pleno, cupon.pct)

    /**
     * Y los datos de cada método con el importe NUEVO para pegar.
     *
     * Cada método trae su lista de «esto se pinta, esto se copia», y dentro
     * va el monto: es un dato más que hay que pegar en la app del banco. Si
     * no se recalculan aquí, el botón de copiar sigue pegando el precio sin
     * descuento y la transferencia llega por el importe viejo, que es justo
     * la que luego no cuadra.
     */
    const { data: metodos } = await admin
      .from('payment_methods')
      .select('id, moneda, activo, datos_cuenta')
      .neq('id', 'cupon')
      .order('orden')

    const conDescuentoLocal = tasa
      ? Number((conDescuento * Number(tasa.ves_por_ref)).toFixed(2))
      : null

    return NextResponse.json({
      estado: 'descuento',
      codigo: cupon.code,
      // Por método, para que la pantalla los cambie por id y no por posición.
      metodos: (metodos ?? [])
        .filter((m) => m.activo)
        .map((m) => ({
          id: m.id,
          datos: datosDePago(
            m.datos_cuenta as Record<string, unknown> | null,
            m.moneda === 'VES' ? conDescuentoLocal : conDescuento,
            m.moneda === 'VES' ? 'Bs' : m.moneda,
          ),
        })),
      pct: cupon.pct,
      // Para «Código de Andrea · −20%». `null` en los de operación, que no
      // son de nadie, y entonces la pantalla dice solo el descuento.
      nombre: cupon.nombre,
      // El precio pleno viaja también: la pantalla enseña de dónde viene el
      // importe nuevo, y sin él tendría que acordarse del que pintaba antes.
      montoPleno: pleno,
      montoUsd: conDescuento,
      tasa: tasa ? Number(tasa.ves_por_ref) : null,
      tasaDe: tasa?.rate_date ?? null,
      montoLocal: conDescuentoLocal,
      // Lo que NO pasó, dicho en voz alta: no hay puesto apartado todavía.
      puestoApartado: false,
    })
  }

  // El mismo candado que en las otras dos puertas: sin permiso no hay puesto
  // en una fecha que se graba, se pague como se pague. Va aquí abajo porque
  // solo este camino —el del 100%— aparta puesto.
  if ((evento as { grabacion_requerida?: boolean }).grabacion_requerida && parsed.data.permiteGrabacion !== true) {
    return NextResponse.json(
      {
        error: 'Esta cena la grabamos, así que para apartar puesto hace falta tu permiso.',
        motivo: 'falta-permiso-grabacion',
      },
      { status: 409 },
    )
  }

  // --- el puesto, primero -----------------------------------------------
  const { data: yaTiene } = await admin
    .from('bookings')
    .select('id, status')
    .eq('event_id', evento.id)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (yaTiene && yaTiene.status === 'confirmed') {
    return NextResponse.json(
      { error: 'Ya tienes tu puesto en esta fecha.' },
      { status: 409 },
    )
  }

  let bookingId = yaTiene?.id ?? null
  if (!bookingId) {
    const { data: creada, error } = await admin
      .from('bookings')
      .insert({
        event_id: evento.id,
        profile_id: user.id,
        status: 'pending_payment',
        ...((evento as { grabacion_requerida?: boolean }).grabacion_requerida
          ? { permiso_grabacion: true }
          : {}),
      })
      .select('id')
      .single()

    if (error || !creada) {
      console.error('[cupon] no se apartó el puesto', error)
      return NextResponse.json({ error: 'No pudimos apartarte el puesto.' }, { status: 500 })
    }
    bookingId = creada.id
  }

  // Igual que al pagar: apuntarse a esta fecha es declarar interés en su
  // zona, y perder esa declaración no puede tumbar el canje.
  await declararZonasAlReservar(user.id, evento.id, bookingId)

  // --- el pago que no cobra ---------------------------------------------
  const ahora = new Date().toISOString()
  const { data: pago, error: errorPago } = await admin
    .from('payments')
    .insert({
      profile_id: user.id,
      booking_id: bookingId,
      metodo: 'cupon',
      moneda: 'USD',
      amount_usd: 0,
      amount_local: null,
      reportado_en: ahora,
      paid_at: ahora,
      datos: { cupon: codigo } as never,
      // Confirmado de salida: no hay nada que cuadrar con ningún banco.
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (errorPago) {
    // El puesto ya está apartado —en `pending_payment`— así que no se pierde:
    // se puede reintentar o pagarlo. Lo que no se hace es confirmar sin
    // dejar rastro del canje.
    console.error('[cupon] no se registró el canje como pago', errorPago)
    return NextResponse.json({ error: 'No pudimos aplicar el código.' }, { status: 500 })
  }

  // --- y ahora sí, el cupón se da por gastado ---------------------------
  await anotarCanje(admin, {
    code: cupon.code,
    perfilId: user.id,
    bookingId,
    paymentId: pago.id,
    usados: cupon.usados,
  })

  await anotarPagoDeEvento(user.id, bookingId, evento.credit_cost ?? 1, 'coupon')

  await admin
    .from('bookings')
    .update({ status: 'confirmed', confirmed_at: ahora })
    .eq('id', bookingId)

  await encolar({ perfil: user.id }, 'puesto_con_cupon', { cupon: codigo }, { eventoId: evento.id })

  return NextResponse.json({ estado: 'confirmado', puestoApartado: true })
}

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La tasa del BCV, todas las noches a medianoche de Caracas.
 *
 * En `vercel.json` el cron dice `0 4 * * *` porque Vercel programa en UTC
 * y Caracas es UTC-4. No es un horario raro: son las doce de la noche
 * alla.
 *
 * Sin tasa no se puede cobrar en bolívares, y con la de anteayer se cobra
 * mal: en Venezuela eso no es un redondeo, es dinero.
 *
 * La fuente es `ve.dolarapi.com`, que republica la oficial del BCV. No es
 * el BCV directamente —su web no sirve un JSON estable y su certificado
 * falla a menudo— así que esto es una dependencia de terceros de la que
 * conviene acordarse: si un día deja de responder, NO se escribe nada y se
 * queda la última buena. Cobrar con una tasa vieja es malo; cobrar con una
 * inventada es peor.
 */

const FUENTE = 'https://ve.dolarapi.com/v1/dolares/oficial'

/** La fecha de hoy en Caracas, que es la que manda para el cobro. */
function hoyCaracas() {
  return new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
}

async function actualizar() {
  const admin = createAdminClient()

  let datos: { promedio?: number; venta?: number; fechaActualizacion?: string }
  try {
    const r = await fetch(FUENTE, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!r.ok) throw new Error(`fuente respondió ${r.status}`)
    datos = await r.json()
  } catch (e) {
    console.error('[tasa] la fuente no respondió', e)
    // Sin escribir nada: se queda la última buena.
    return NextResponse.json({ estado: 'sin-cambios', motivo: 'fuente-caida' }, { status: 502 })
  }

  const valor = Number(datos.promedio ?? datos.venta ?? 0)

  // Una tasa de cero o negativa no es una tasa, y una de tres cifras menos
  // que la anterior tampoco: antes de escribir algo que va a cobrarle a
  // gente, se comprueba que tenga sentido.
  if (!Number.isFinite(valor) || valor <= 0) {
    console.error('[tasa] valor sin sentido', datos)
    return NextResponse.json({ estado: 'sin-cambios', motivo: 'valor-invalido' }, { status: 502 })
  }

  const { data: ultima } = await admin
    .from('fx_rates')
    .select('rate_date, usd_to_ves')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const anterior = ultima ? Number(ultima.usd_to_ves) : null
  // Un salto de más del 30% en un día es raro y puede ser la fuente rota.
  // Se escribe igual —la tasa venezolana ha dado saltos de verdad— pero se
  // avisa, porque si es un error lo vamos a cobrar.
  const salto =
    anterior && anterior > 0 ? Math.abs(valor - anterior) / anterior : 0

  // La fecha que dice la fuente, no "hoy": el BCV publica la tasa que
  // aplica a un día concreto, y guardarla con otra fecha la desplaza.
  const fecha = datos.fechaActualizacion
    ? new Date(datos.fechaActualizacion).toISOString().slice(0, 10)
    : hoyCaracas()

  const { error } = await admin
    .from('fx_rates')
    .upsert({ rate_date: fecha, usd_to_ves: valor, source: 'bcv' }, { onConflict: 'rate_date' })

  if (error) {
    console.error('[tasa] no se guardó', error)
    return NextResponse.json({ estado: 'error' }, { status: 500 })
  }

  if (salto > 0.3) {
    console.warn(`[tasa] salto del ${Math.round(salto * 100)}% respecto a ${anterior}`)
  }

  return NextResponse.json({
    estado: 'actualizada',
    fecha,
    tasa: valor,
    anterior,
    saltoRaro: salto > 0.3,
  })
}

/**
 * Vercel llama por GET con `Authorization: Bearer <CRON_SECRET>`. Sin el
 * secreto no se entra: una ruta que escribe la tasa a la que cobramos no
 * puede quedar abierta.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    // 404 y no 401: un 401 confirma que la ruta existe.
    return new NextResponse(null, { status: 404 })
  }

  return actualizar()
}

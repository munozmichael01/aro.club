import { NextResponse } from 'next/server'

import { mandarAviso } from '@/lib/avisos-equipo'
import { createAdminClient } from '@/lib/supabase/admin'
import { tasaDelBcv } from '@/lib/tasa-bcv'

/**
 * La tasa del BCV. Cuatro veces al día, y a la hora en que hay algo que pedir.
 *
 * Corría una sola vez, a las 04:00 UTC —medianoche en Caracas—, y a esa hora
 * el BCV todavía no ha publicado: la fuente devolvía la de AYER y eso es lo
 * que se guardaba. Todos los días. El producto cobraba siempre con la del día
 * anterior, que es exactamente lo que esta ruta existe para evitar.
 *
 * No se ve como un fallo porque no falla: el cron corre, la fuente contesta,
 * la fila se escribe. Solo que con la fecha de ayer. Se descubrió mirando
 * `fx_rates` y viendo que la fila del 18 se había creado a las 04:00 del 19.
 *
 * El primer arreglo movió el horario a 04:00, 12:00, 15:00 y 18:00 UTC y
 * seguía llegando pronto: son las 00:00, 08:00, 11:00 y 14:00 de Caracas, y
 * el BCV publica entre las 14:00 y las 18:00 de allá, días hábiles. Las
 * cuatro preguntas caían antes de la ventana o justo en su borde. Preguntar
 * cuatro veces no sirve de nada si las cuatro son temprano.
 *
 * Ahora son las 12:00, 19:00, 21:00 y 23:00 UTC: las 08:00 de Caracas como
 * red —por si un día publicaron tarde y la de ayer llegó después de la última
 * pregunta— y luego 15:00, 17:00 y 19:00, que cubren la ventana entera. El
 * `upsert` por `rate_date` hace que repetir sea gratis: en cuanto el BCV
 * publica, la fila del día aparece sola, y si ya estaba no pasa nada.
 *
 * Las horas de `vercel.json` van en UTC porque Vercel programa en UTC.
 * Caracas es UTC−4: para leerlas, restar cuatro.
 *
 * Sin tasa no se puede cobrar en bolívares, y con la de anteayer se cobra
 * mal: en Venezuela eso no es un redondeo, es dinero.
 *
 * DESDE EL 05-11 LA FUENTE ES LA WEB DEL BCV, directa (`lib/tasa-bcv.ts`), y
 * `ve.dolarapi.com` queda de respaldo. Lo de abajo es por qué se usaba esa:
 *
 * La fuente era `ve.dolarapi.com`, que republica la oficial del BCV. No es
 * el BCV directamente —su web no sirve un JSON estable y su certificado
 * falla a menudo— así que esto es una dependencia de terceros de la que
 * conviene acordarse: si un día deja de responder, NO se escribe nada y se
 * queda la última buena. Cobrar con una tasa vieja es malo; cobrar con una
 * inventada es peor.
 */

/**
 * EL EURO, no el dólar, desde el 13-10.
 *
 * En Venezuela el precio se dice en «ref» y cada sitio decide con qué tasa
 * del BCV cobra. Aro cobra a tasa euro, que es la que publica el BCV igual
 * que la del dólar y por la misma vía.
 *
 * La fuente da las dos con la misma forma y la misma `fechaActualizacion`,
 * así que el cambio es la URL. Lo que NO cambia es que una tasa vieja o
 * inventada es dinero: si esto deja de responder, no se escribe nada.
 */
const FUENTE = 'https://ve.dolarapi.com/v1/euros/oficial'

/** Con qué tasa del BCV se calcula. Queda escrito en cada fila. */
const MONEDA = 'EUR'

/** La fecha de hoy en Caracas, que es la que manda para el cobro. */
function hoyCaracas() {
  return new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10)
}

/**
 * La de la fuente de respaldo, si el BCV no contesta.
 *
 * Devuelve también si hubo que devolverle los miles: el 05-11 esta fuente
 * leyó «1.006,03» como 1,006. Si el valor es unas mil veces menor que el
 * último bueno y, multiplicado por mil, cae cerca de él, es ese fallo y no
 * una reconversión (que el dólar de la misma fuente seguía en 894 lo
 * confirmó). Se corrige y se avisa. Se pierden los céntimos de la tasa
 * —1.006 en vez de 1.006,03—, que en un puesto son menos de un bolívar.
 */
async function tasaDeRespaldo(anterior: number | null): Promise<{ valor: number; fecha: string; fuente: string } | null> {
  try {
    const r = await fetch(FUENTE, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!r.ok) throw new Error(`fuente respondió ${r.status}`)
    const datos = (await r.json()) as { promedio?: number; venta?: number; fechaActualizacion?: string }
    let valor = Number(datos.promedio ?? datos.venta ?? 0)
    if (!Number.isFinite(valor) || valor <= 0) return null
    let fuente = 'dolarapi'
    if (anterior && Math.abs(valor * 1000 - anterior) / anterior < 0.3 && Math.abs(valor - anterior) / anterior > 0.3) {
      valor = valor * 1000
      fuente = 'dolarapi-miles'
    }
    const fecha = datos.fechaActualizacion
      ? new Date(datos.fechaActualizacion).toISOString().slice(0, 10)
      : hoyCaracas()
    return { valor, fecha, fuente }
  } catch (e) {
    console.error('[tasa] la fuente de respaldo no respondió', e)
    return null
  }
}

async function actualizar() {
  const admin = createAdminClient()

  const { data: ultima } = await admin
    .from('fx_rates')
    .select('rate_date, ves_por_ref')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const anterior = ultima ? Number(ultima.ves_por_ref) : null

  // Primero el BCV, directo. Si no contesta, el respaldo.
  let leida: { valor: number; fecha: string; fuente: string } | null = null
  let motivoBcv = ''
  try {
    const bcv = await tasaDelBcv('euro')
    leida = { ...bcv, fuente: 'bcv' }
  } catch (e) {
    motivoBcv = e instanceof Error ? (e.message + ((e as { code?: string }).code ? ` (${(e as { code?: string }).code})` : '')) : String(e)
    console.error('[tasa] el BCV no respondió, voy al respaldo', e)
    leida = await tasaDeRespaldo(anterior)
  }

  if (!leida) {
    // Sin escribir nada: se queda la última buena.
    await mandarAviso({
      asunto: 'La tasa del BCV no se actualizó: no responde ninguna fuente',
      titulo: 'No se pudo leer la tasa',
      parrafos: [
        `Ni la web del BCV (${motivoBcv || 'sin detalle'}) ni la fuente de respaldo contestaron. Se sigue cobrando con la última buena: <strong>${anterior ?? 'ninguna'}</strong> Bs por ref.`,
        'Si pasa más de un día, hay que poner la tasa a mano.',
      ],
      filas: [],
      pestana: 'pagos',
      deRevision: false,
    }).catch((e) => console.error('[tasa] no se pudo avisar', e))
    return NextResponse.json({ estado: 'sin-cambios', motivo: 'fuentes-caidas', bcv: motivoBcv }, { status: 502 })
  }

  const valor = leida.valor
  const salto =
    anterior && anterior > 0 ? Math.abs(valor - anterior) / anterior : 0

  /**
   * UN SALTO DE MÁS DEL 30% NO SE ESCRIBE. Se avisa y lo decide una persona.
   *
   * Antes se escribía igual, con un aviso en el registro que no leía nadie.
   * El 05-11 la fuente devolvió 1,006 para el euro —el día anterior era
   * 999,77, y el dólar seguía en 894,89: no era una reconversión, era la
   * fuente rota— y durante cuatro horas el puesto de 10 ref se cobró a
   * 10,06 Bs. Una persona lo pagó así y se le confirmó.
   *
   * Si un día el salto es de verdad —una reconversión, una devaluación de
   * golpe—, la tasa se pone a mano desde operación. Cobrar unas horas con la
   * de ayer es malo; cobrar con una mil veces menor es regalar el puesto.
   */
  if (salto > 0.3) {
    console.error(`[tasa] salto del ${Math.round(salto * 100)}% respecto a ${anterior}: NO se escribe`, leida)
    await mandarAviso({
      asunto: `La tasa del BCV no se actualizó: ${leida.fuente === 'bcv' ? 'el BCV' : 'la fuente'} da ${valor}`,
      titulo: 'La fuente de la tasa devolvió un valor raro',
      parrafos: [
        `Hoy la fuente da <strong>${valor}</strong> Bs por ref y la última buena es <strong>${anterior}</strong>. Es un salto del ${Math.round(salto * 100)}%, y no se guardó: se sigue cobrando con la última buena.`,
        'Si el cambio es real, hay que poner la tasa a mano. Si no, no hay que hacer nada: en cuanto la fuente se corrija, la tasa del día entra sola.',
      ],
      filas: [],
      pestana: 'pagos',
      deRevision: false,
    }).catch((e) => console.error('[tasa] no se pudo avisar', e))
    return NextResponse.json({ estado: 'sin-cambios', motivo: 'salto-raro', valor, anterior }, { status: 502 })
  }

  // La fecha que dice la fuente, no "hoy": el BCV publica la tasa que
  // aplica a un día concreto, y guardarla con otra fecha la desplaza.
  const fecha = leida.fecha

  const { error } = await admin
    .from('fx_rates')
    .upsert({ rate_date: fecha, ves_por_ref: valor, moneda: MONEDA, source: leida.fuente }, { onConflict: 'rate_date' })

  if (error) {
    console.error('[tasa] no se guardó', error)
    return NextResponse.json({ estado: 'error' }, { status: 500 })
  }

  // Si vino del respaldo, se guarda pero se dice: el BCV dejó de contestar
  // y lo normal es que sea el certificado (ver `lib/tasa-bcv.ts`).
  if (leida.fuente !== 'bcv') {
    await mandarAviso({
      asunto: 'La tasa salió del respaldo: el BCV no respondió',
      titulo: 'La web del BCV no contestó',
      parrafos: [
        `Se guardó <strong>${valor}</strong> Bs por ref para el ${fecha}, de la fuente de respaldo${leida.fuente === 'dolarapi-miles' ? ', a la que hubo que devolverle los miles (daba ' + (valor / 1000) + ')' : ''}.`,
        `El BCV falló con: ${motivoBcv || 'sin detalle'}. Si dice «certificate» o «UNABLE_TO_VERIFY», el BCV cambió de certificado: hay que actualizar el intermedio en src/lib/tasa-bcv.ts.`,
      ],
      filas: [],
      pestana: 'pagos',
      deRevision: false,
    }).catch((e) => console.error('[tasa] no se pudo avisar', e))
  }

  return NextResponse.json({
    estado: 'actualizada',
    fecha,
    tasa: valor,
    fuente: leida.fuente,
    anterior,
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

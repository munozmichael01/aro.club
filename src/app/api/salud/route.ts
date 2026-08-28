import { NextResponse } from 'next/server'

/**
 * Diagnóstico de despliegue. Dice qué falta sin revelar ningún valor.
 *
 * Existe porque un 500 en producción sin acceso a los registros es un
 * callejón sin salida: esto convierte "no funciona" en "falta esta variable"
 * o "la base no responde".
 *
 * Y desde la entrega 18 mira también el correo. Antes comprobaba tres
 * variables y devolvía `ok` con `RESEND_API_KEY` sin poner: el remitente
 * contestaba `sin-remitente`, la cola se quedaba quieta, nadie recibía nada
 * y esta pantalla decía que todo iba bien. Un diagnóstico que no ve la parte
 * que falla es peor que no tenerlo, porque descarta.
 *
 * Nunca sale una dirección ni el contenido de un correo: solo cuentas.
 */

/** Cuánto puede llevar una fila esperando antes de que sea un problema. */
const MINUTOS_DE_COLA = 60

export async function GET() {
  const variables = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    // Sin esto no sale ni un correo: ni la bienvenida, ni la mesa, ni el
    // restablecer clave. Es tan imprescindible como la base.
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
  }

  const faltan = Object.entries(variables)
    .filter(([, presente]) => !presente)
    .map(([nombre]) => nombre)

  // `CORREO_DE` tiene valor por defecto, así que su ausencia no es un fallo.
  // Se dice igual, porque un remitente por defecto en producción es algo que
  // conviene ver antes de que lo vea quien recibe el correo.
  const avisos: string[] = []
  if (!process.env.CORREO_DE) avisos.push('CORREO_DE sin poner: se usa el valor por defecto')

  let base = 'sin comprobar'
  let detalle: string | null = null
  let cola: Record<string, unknown> = { estado: 'sin comprobar' }
  let colaBien = true

  if (!faltan.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { error } = await admin.from('questionnaire_versions').select('version').limit(1)
      base = error ? 'error' : 'ok'
      detalle = error?.message ?? null

      if (!error) {
        const ahora = Date.now()
        const { data: pendientes } = await admin
          .from('scheduled_emails')
          .select('kind, send_at, estado, motivo')
          .is('sent_at', null)
          .lte('send_at', new Date(ahora).toISOString())
          .order('send_at')
          .limit(200)

        const filas = pendientes ?? []
        const masVieja = filas[0]
          ? Math.round((ahora - new Date(filas[0].send_at as string).getTime()) / 60000)
          : 0

        // Una fila con `estado` puesta y todavía pendiente es una que se
        // intentó y no salió. Esas no se arreglan esperando.
        const atascadas = filas.filter((f) => f.estado)
        const porQue: Record<string, number> = {}
        for (const f of atascadas) {
          const k = String(f.estado)
          porQue[k] = (porQue[k] ?? 0) + 1
        }

        colaBien = atascadas.length === 0 && masVieja <= MINUTOS_DE_COLA
        cola = {
          estado: colaBien ? 'ok' : 'atascada',
          vencidas: filas.length,
          minutos_de_la_mas_vieja: masVieja,
          atascadas: atascadas.length,
          por_que: porQue,
          // El primer motivo, que casi siempre explica los demás. Es texto
          // nuestro —el error de armado o el de la API—, nunca de la persona.
          ejemplo: atascadas[0]?.motivo ?? null,
        }
      }
    } catch (e) {
      base = 'excepción'
      detalle = e instanceof Error ? e.message : String(e)
    }
  }

  const bien = faltan.length === 0 && base === 'ok' && colaBien
  return NextResponse.json(
    { ok: bien, variables, faltan, avisos, base, detalle, cola },
    { status: bien ? 200 : 500 },
  )
}

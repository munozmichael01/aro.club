import { NextResponse } from 'next/server'

/**
 * Diagnóstico de despliegue. Dice qué falta sin revelar ningún valor.
 *
 * Existe porque un 500 en producción sin acceso a los registros es un
 * callejón sin salida: esto convierte "no funciona" en "falta esta variable"
 * o "la base no responde".
 */
export async function GET() {
  const variables = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  const faltan = Object.entries(variables)
    .filter(([, presente]) => !presente)
    .map(([nombre]) => nombre)

  let base = 'sin comprobar'
  let detalle: string | null = null

  if (!faltan.length) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const { error } = await createAdminClient()
        .from('questionnaire_versions')
        .select('version')
        .limit(1)
      base = error ? 'error' : 'ok'
      detalle = error?.message ?? null
    } catch (e) {
      base = 'excepción'
      detalle = e instanceof Error ? e.message : String(e)
    }
  }

  const bien = faltan.length === 0 && base === 'ok'
  return NextResponse.json({ ok: bien, variables, faltan, base, detalle }, { status: bien ? 200 : 500 })
}

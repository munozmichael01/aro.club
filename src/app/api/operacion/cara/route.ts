import { NextResponse } from 'next/server'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La cara de un miembro, para la vista de repartir.
 *
 * NACIÓ DE UN FALLO CONCRETO. Las fotos se mandaban al panel como URLs ya
 * firmadas, con cinco minutos de vida, igual que en la cola de verificación.
 * Ahí funciona porque se decide en el momento; en repartir el panel se queda
 * abierto mientras se piensa dónde sentar a seis personas, y a los cinco
 * minutos las seis fotos se rompían:
 *
 *   {"statusCode":"400","error":"InvalidJWT",
 *    "message":"\"exp\" claim timestamp check failed"}
 *
 * Alargar la firma habría sido lo fácil y lo peor: una URL de horas en el
 * historial del navegador de quien reparte es exactamente lo que el bucket
 * privado evita.
 *
 * Así que la firma deja de viajar. El panel pide esta ruta, esta ruta
 * comprueba que quien pregunta es de operación —cada vez, no una vez al
 * cargar— y redirige a una firma de sesenta segundos que nace y muere en esa
 * petición. En el HTML no queda ninguna.
 *
 * SOLO LA SELFIE APROBADA, y nunca el documento. Para saber con quién se
 * sienta alguien basta su cara; la cédula tiene su propia pantalla, con su
 * propio motivo para abrirse y su propio registro de quién la miró.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 404 y no 403: a quien no es de operación esta ruta no le existe.
  if (!(await exigirOps())) return new NextResponse(null, { status: 404 })

  const perfil = new URL(request.url).searchParams.get('perfil')
  if (!perfil) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('verifications')
    .select('storage_path')
    .eq('profile_id', perfil)
    .eq('kind', 'selfie')
    .eq('status', 'approved')
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.storage_path) return new NextResponse(null, { status: 404 })

  const { data: firmada } = await admin.storage
    .from('verificaciones')
    .createSignedUrl(data.storage_path, 60)

  if (!firmada?.signedUrl) return new NextResponse(null, { status: 404 })

  // 302 y no 301: la firma de mañana no es la de hoy, y un permanente se
  // quedaría cacheado apuntando a una URL caducada.
  return NextResponse.redirect(firmada.signedUrl, 302)
}

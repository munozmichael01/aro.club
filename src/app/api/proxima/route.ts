import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La próxima fecha abierta. Pública: la portada la necesita sin sesión.
 *
 * La portada contaba atrás hacia «el próximo martes a las siete», calculado
 * con aritmética de calendario y sin mirar ninguna fecha real. Decía «la
 * próxima se cierra en 5 días» hubiera o no hubiera fecha, y al terminar el
 * alta la misma pantalla decía «te escribimos en cuanto abramos mesa»: dos
 * frases contradictorias en el mismo recorrido, y la primera podía ser
 * mentira.
 *
 * Solo lo que ya es público —cuándo empieza y cuándo cierra—. Ni el
 * restaurante ni cuánta gente va: eso se sabe después de reservar, y esta
 * ruta la puede leer cualquiera.
 */
export async function GET() {
  const { data } = await createAdminClient()
    .from('events')
    .select('id, starts_at, booking_closes_at, format')
    .eq('status', 'open')
    .gt('booking_closes_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  // `null` y no un 404: «no hay fecha abierta» es una respuesta legítima, y
  // la portada tiene que poder decirlo con esas palabras.
  return NextResponse.json({
    hay: !!data,
    empiezaEn: data?.starts_at ?? null,
    cierraEn: data?.booking_closes_at ?? null,
    formato: data?.format ?? null,
  })
}

import 'server-only'

import { ZONA_POR_DEFECTO } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * En qué hora habla una ciudad.
 *
 * La zona era una constante del producto y eso es correcto mientras solo haya
 * una ciudad. Deja de serlo en la primera que se abra fuera de este huso, y el
 * fallo no se ve: una cena de las ocho se cuenta en otra hora y la fecha se va
 * un día. Ya pasó con el servidor contando en UTC —el panel y las fechas de
 * borrado decían un día de más—.
 *
 * Viaja JUNTO A CADA FECHA, no en la raíz de la respuesta: una persona puede
 * tener una cena en Caracas y otra en Madrid, y una sola zona para las dos
 * volvería a ser la constante de antes con más pasos.
 *
 * Se cachea en memoria del proceso. Son ocho filas que cambian el día que se
 * abre una ciudad, y esto se llama varias veces por respuesta —una por fecha
 * de la agenda—.
 *
 * CONSECUENCIA, dicha por delante: cambiar la zona de una ciudad no se ve
 * hasta que el proceso se reinicia. Es aceptable porque pasa una vez por
 * ciudad y en Vercel cada despliegue arranca procesos nuevos, pero hay que
 * saberlo: tocar la columna y recargar no basta.
 */
const enMemoria = new Map<string, string>()

export async function zonaDeCiudad(slug: string | null | undefined): Promise<string> {
  const clave = slug ?? 'caracas'
  const guardada = enMemoria.get(clave)
  if (guardada) return guardada

  const { data } = await createAdminClient()
    .from('cities')
    .select('timezone')
    .eq('slug', clave)
    .maybeSingle()

  // Sin ciudad o sin fila, la del producto. No es un fallo que haya que
  // gritar: significa que esa fecha es de donde estamos hoy.
  const zona = data?.timezone || ZONA_POR_DEFECTO
  enMemoria.set(clave, zona)
  return zona
}

/**
 * Las zonas de varias ciudades de una vez, para no pedir una por fecha.
 * Devuelve un mapa slug → zona, con la del producto para lo que falte.
 */
export async function zonasDeCiudades(slugs: (string | null | undefined)[]): Promise<Map<string, string>> {
  const pedidos = [...new Set(slugs.map((s) => s ?? 'caracas'))]
  const faltan = pedidos.filter((s) => !enMemoria.has(s))

  if (faltan.length) {
    const { data } = await createAdminClient()
      .from('cities')
      .select('slug, timezone')
      .in('slug', faltan)
    for (const c of data ?? []) enMemoria.set(c.slug, c.timezone || ZONA_POR_DEFECTO)
    for (const s of faltan) if (!enMemoria.has(s)) enMemoria.set(s, ZONA_POR_DEFECTO)
  }

  return new Map(pedidos.map((s) => [s, enMemoria.get(s) ?? ZONA_POR_DEFECTO]))
}

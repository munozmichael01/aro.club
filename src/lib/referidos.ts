import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Referidos: el código de cada quien, y la cuenta de lo que ha traído.
 *
 * Michael, 29-10: 20% de descuento para quien llega, y una reserva gratis
 * por cada TRES personas que vayan a su primera cena. Sin tope por ahora.
 *
 * Cuenta la ASISTENCIA, no el alta. Es lo que impide que alguien se invente
 * cuentas: darse de alta es gratis y sentarse en una mesa no.
 *
 * El código es un CUPÓN, no una tabla nueva. Los cupones ya traen el campo
 * de Pago, el descuento por porcentaje y —lo que importa— el único de
 * `coupon_redemptions`, que es lo que impide que la misma persona lo canjee
 * cada semana.
 */

/** Lo que se lleva quien llega con un código. */
export const DESCUENTO_PCT = 20

/** Cuántas asistencias hacen falta para una reserva gratis. */
export const POR_CADA = 3

/**
 * Las letras que pueden salir en un código.
 *
 * Sin I, O, 1 ni 0: un código se lee en voz alta y se escribe a mano desde
 * una historia de Instagram, y esos cuatro se confunden entre sí. Lo que se
 * gana en variedad se pierde en gente escribiendo mal su descuento.
 */
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * El nombre de pila, sin tildes ni espacios y en mayúsculas.
 *
 * «José Antonio» da `JOSE`. Si no queda nada utilizable —un nombre en otro
 * alfabeto, o vacío— se usa `ARO`, que sigue siendo un código válido.
 */
function trozoDelNombre(nombre: string | null | undefined): string {
  const limpio = String(nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 8)
  return limpio || 'ARO'
}

function tresLetras(): string {
  let s = ''
  for (let i = 0; i < 3; i++) s += LETRAS[Math.floor(Math.random() * LETRAS.length)]
  return s
}

/**
 * El código de una persona, creándolo si todavía no tiene.
 *
 * Solo para gente VERIFICADA: sin verificar no se reserva, así que tampoco
 * se invita. Quien no lo esté recibe `null` y la pantalla no enseña nada.
 *
 * Es idempotente: si ya tiene, devuelve el suyo. El único por `creado_por`
 * lo garantiza incluso si dos pestañas lo piden a la vez.
 */
export async function codigoDe(
  admin: SupabaseClient<Database>,
  perfilId: string,
): Promise<string | null> {
  const { data: ya } = await admin
    .from('coupons')
    .select('code')
    .eq('creado_por', perfilId)
    .maybeSingle()

  if (ya?.code) return ya.code

  const { data: quien } = await admin
    .from('profiles')
    .select('display_name, full_name, status')
    .eq('id', perfilId)
    .maybeSingle()

  if (!quien || quien.status !== 'active') return null

  const base = trozoDelNombre(quien.display_name || quien.full_name?.split(' ')[0])

  /**
   * Hasta cinco intentos, y después se rinde.
   *
   * Con 32 letras y tres huecos hay 32.768 combinaciones por nombre: chocar
   * cinco veces seguidas con el mismo nombre pide miles de «Andrea». Un
   * bucle sin tope aquí sería un bucle infinito el día que algo más falle,
   * y es mejor no dar código que colgar la pantalla del perfil.
   */
  for (let i = 0; i < 5; i++) {
    const code = base + tresLetras()
    const { error } = await admin.from('coupons').insert({
      code,
      descuento_pct: DESCUENTO_PCT,
      creado_por: perfilId,
      activo: true,
      // Sin tope de usos y sin caducar: es el código de una persona, no una
      // campaña. Lo que lo contiene es el único por persona que lo canjea.
      max_usos: null,
      caduca_at: null,
      nota: 'Referido',
    } as never)

    if (!error) return code
    // 23505 es el choque del código o el de «una por persona». Si es lo
    // segundo, es que otra llamada acaba de crearlo: se devuelve el suyo.
    if (error.code === '23505') {
      const { data: otra } = await admin
        .from('coupons')
        .select('code')
        .eq('creado_por', perfilId)
        .maybeSingle()
      if (otra?.code) return otra.code
      continue
    }
    console.error('[referidos] no se pudo crear el código', perfilId, error)
    return null
  }

  console.error('[referidos] cinco choques seguidos creando el código', perfilId)
  return null
}

export type CuentaDeReferidos = {
  /** Cuántas personas se dieron de alta con su código. */
  apuntados: number
  /** Cuántas de ellas ya fueron a su primera cena. */
  asistieron: number
  /** Cuántas reservas gratis le hemos dado ya. */
  premios: number
  /** Cuántas van hacia la siguiente, de 0 a POR_CADA - 1. */
  avance: number
}

/**
 * Lo que lleva traído, para enseñárselo en Perfil.
 *
 * Michael pidió que se vea siempre: cuántas se apuntaron, cuántas ya fueron,
 * y lo que falta para la próxima gratis. Lo que NO se enseña nunca es
 * quiénes: el nombre de quien te invitó es cosa suya y el de a quién
 * invitaste no le pertenece a nadie más.
 */
export async function cuentaDe(
  admin: SupabaseClient<Database>,
  perfilId: string,
): Promise<CuentaDeReferidos> {
  const { data: suyos } = await admin
    .from('profiles')
    .select('id')
    .eq('invitado_por', perfilId)

  const ids = (suyos ?? []).map((p) => p.id)

  let asistieron = 0
  if (ids.length) {
    /**
     * Asistió de verdad, no «reservó». `attended` lo escribe operación al
     * marcar quién vino, o dos personas de la mesa desde la encuesta.
     *
     * Se cuenta UNA por persona aunque haya ido a cuatro cenas: el premio es
     * por traer gente, no por lo mucho que cene quien trajiste.
     */
    const { data: fueron } = await admin
      .from('bookings')
      .select('profile_id')
      .in('profile_id', ids)
      .eq('status', 'attended')

    asistieron = new Set((fueron ?? []).map((b) => b.profile_id)).size
  }

  const { data: quien } = await admin
    .from('profiles')
    .select('premios_referido')
    .eq('id', perfilId)
    .maybeSingle()

  const premios = quien?.premios_referido ?? 0

  return {
    apuntados: ids.length,
    asistieron,
    premios,
    avance: asistieron % POR_CADA,
  }
}

/**
 * ¿Le toca una reserva gratis? Y si le toca, cuántas.
 *
 * Se compara con lo ya premiado y no con «tres o más»: la asistencia se
 * marca de a una, así que sin la cuenta el tercero daría un crédito y el
 * cuarto otro, porque «tres o más» sigue siendo cierto.
 *
 * Devuelve cuántos premios DEBE y no un booleano, porque pueden caerle dos a
 * la vez si varias asistencias se marcan de golpe.
 */
export function premiosQueFaltan(asistieron: number, yaPremiados: number): number {
  return Math.max(0, Math.floor(asistieron / POR_CADA) - yaPremiados)
}

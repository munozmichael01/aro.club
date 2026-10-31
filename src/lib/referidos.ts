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

/**
 * El rastro que deja `aro.club/i/<código>` en el navegador.
 *
 * Michael, 29-10: «el código queda guardado desde ese momento». Quien llega
 * con el enlace de alguien casi nunca se da de alta en ese mismo minuto: mira
 * la portada, lo piensa, y vuelve. Sin esto, al volver ya no hay enlace y el
 * descuento habría que escribirlo a mano, que es justo lo que el enlace venía
 * a ahorrar.
 *
 * NO es httpOnly a propósito: la franja de la portada la pinta la pantalla,
 * que es un fichero estático y no tiene servidor que le cuente nada. Y no
 * hace falta que lo sea: esto no autoriza nada. Lo único que hace es
 * proponer un código, y el código se vuelve a comprobar entero cuando se
 * paga.
 */
export const COOKIE_INVITA = 'aro_invita'

/** Un mes. Lo que tarda alguien en decidirse, con margen. */
export const DIAS_INVITA = 30

/**
 * `código|nombre|descuento`, escapados: un nombre puede traer un acento.
 *
 * El descuento viaja dentro en vez de estar escrito en la portada. No es por
 * ahorrarse una constante: lo que la franja promete tiene que ser lo que ESE
 * código descuenta, y eso solo lo sabe su fila. Con un 20 escrito en la
 * pantalla, el día que un código valga otra cosa la portada seguiría
 * prometiendo el veinte.
 */
export function valorDeInvitacion(codigo: string, nombre: string | null, pct: number): string {
  return [encodeURIComponent(codigo), encodeURIComponent(nombre ?? ''), String(pct)].join('|')
}

export function leerInvitacion(
  valor: string | undefined | null,
): { codigo: string; nombre: string; pct: number } | null {
  if (!valor) return null
  const [c, n, p] = String(valor).split('|')
  const codigo = normalizarCodigoDeReferido(decodeURIComponent(c ?? ''))
  if (!codigo) return null
  const pct = Number(p)
  return {
    codigo,
    nombre: decodeURIComponent(n ?? ''),
    pct: Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : DESCUENTO_PCT,
  }
}

/** Mayúsculas y sin nada que no sea letra o número. */
function normalizarCodigoDeReferido(codigo: string): string {
  return String(codigo).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40)
}

/**
 * Apuntar quién la invitó, una sola vez y nunca encima de lo que ya hay.
 *
 * Se llama al CREAR el perfil, que es el único momento en que esto es
 * verdad: quien ya tiene cuenta no llegó con el enlace de nadie, y dejar que
 * se sobreescriba convertiría el campo en «el último enlace que pulsó».
 *
 * Falla en silencio a propósito: si esto revienta, lo que se rompe es un
 * alta. Perder la atribución de un referido es recuperable —el código sigue
 * aplicándose a mano en Pago— y no dejar entrar a alguien, no.
 */
export async function apuntarQuienInvito(
  admin: SupabaseClient<Database>,
  perfilId: string,
  invitacion: { codigo: string } | null,
): Promise<string | null> {
  if (!invitacion?.codigo) return null
  try {
    const { data: cupon } = await admin
      .from('coupons')
      .select('code, creado_por, activo')
      .eq('code', invitacion.codigo)
      .maybeSingle()

    const dueno = (cupon as { creado_por?: string | null } | null)?.creado_por ?? null
    // Sin dueño no es un referido, es un cupón de operación: no hay a quién
    // atribuirle nada. Y el suyo propio tampoco, que es el mismo caso que
    // `cuponParaPagar` rechaza al pagar.
    if (!cupon?.activo || !dueno || dueno === perfilId) return null

    const { error } = await admin
      .from('profiles')
      .update({ invitado_por: dueno } as never)
      .eq('id', perfilId)
      .is('invitado_por', null)

    if (error) {
      console.error('[referidos] no se pudo apuntar quién invitó', perfilId, error)
      return null
    }
    return dueno
  } catch (e) {
    console.error('[referidos] no se pudo apuntar quién invitó', perfilId, e)
    return null
  }
}

/**
 * El premio: una reserva gratis por cada tres que fueron a su primera cena.
 *
 * Se llama cuando alguien pasa a `attended`, desde los DOS sitios que lo
 * escriben —el panel y el cierre automático de la mesa— y no desde uno:
 * premiar solo cuando lo marca una persona dejaría el premio colgando de que
 * esa semana alguien se acordara.
 *
 * Michael, 31-10: «no basta con que reserven». Por eso cuenta `attended` y
 * no las reservas, y por eso vive aquí al lado de `cuentaDe`, que es quien
 * sabe contar.
 *
 * Devuelve qué pasó para que quien llama escriba el correo que toca: el de
 * «llevas 2 de 3» o el de «ya es tuya». Nunca manda correos él: esta pieza
 * toca el saldo, y mezclar las dos cosas hace que un fallo escribiendo deje
 * un crédito sin contar o al revés.
 */
export type Premio = {
  /** A cuántas personas suyas se les ha marcado la primera cena. */
  asistieron: number
  /** Cuántas reservas gratis tiene ya, contando lo que se acaba de dar. */
  premios: number
  /** Cuántas se le han dado AHORA. Cero es lo normal. */
  nuevos: number
  /** Lo que le falta para la siguiente, de 0 a POR_CADA - 1. */
  avance: number
}

export async function premiarSiToca(
  admin: SupabaseClient<Database>,
  quienInvitaId: string,
): Promise<Premio> {
  const cuenta = await cuentaDe(admin, quienInvitaId)
  const faltan = premiosQueFaltan(cuenta.asistieron, cuenta.premios)

  if (faltan <= 0) {
    return { asistieron: cuenta.asistieron, premios: cuenta.premios, nuevos: 0, avance: cuenta.avance }
  }

  /**
   * El crédito, al libro mayor, y UNO POR PREMIO.
   *
   * `referral_bonus` existe en `credit_reason_t` desde el esquema inicial y
   * no lo escribía nadie. Se anota como cualquier otro movimiento: el saldo
   * de una persona tiene que poder explicarse fila a fila.
   */
  const { error } = await admin.from('credit_ledger').insert(
    Array.from({ length: faltan }, () => ({
      profile_id: quienInvitaId,
      delta: 1,
      reason: 'referral_bonus',
      note: 'Tres personas fueron a su primera cena con su código',
    })) as never,
  )

  if (error) {
    console.error('[referidos] no se pudo abonar el premio', quienInvitaId, error)
    return { asistieron: cuenta.asistieron, premios: cuenta.premios, nuevos: 0, avance: cuenta.avance }
  }

  /**
   * Y la cuenta de lo premiado, DESPUÉS del abono.
   *
   * Es lo que impide premiar dos veces: `premiosQueFaltan` compara contra
   * esta columna, no contra «tres o más». Si el abono entra y esto falla, la
   * siguiente pasada premiaría otra vez, así que se grita.
   */
  const premios = cuenta.premios + faltan
  const { error: errorCuenta } = await admin
    .from('profiles')
    .update({ premios_referido: premios } as never)
    .eq('id', quienInvitaId)

  if (errorCuenta) {
    console.error('[referidos] PREMIO ABONADO SIN APUNTAR', quienInvitaId, errorCuenta)
  }

  return {
    asistieron: cuenta.asistieron,
    premios,
    nuevos: faltan,
    avance: cuenta.asistieron % POR_CADA,
  }
}

/**
 * Lo que pasa cuando a alguien se le marca que fue a una cena.
 *
 * Si llegó con el código de otra persona, esa persona avanza. Y si con esta
 * llega a tres, se lleva su reserva gratis.
 *
 * Falla en silencio a propósito: marcar la asistencia es lo que importa, y
 * que el premio de un tercero no salga no puede impedirlo. Queda en el log.
 */
export async function trasMarcarAsistencia(
  admin: SupabaseClient<Database>,
  perfilId: string,
): Promise<{ quienInvita: string; premio: Premio } | null> {
  try {
    const { data: quien } = await admin
      .from('profiles')
      .select('invitado_por')
      .eq('id', perfilId)
      .maybeSingle()

    const quienInvita = (quien as { invitado_por?: string | null } | null)?.invitado_por ?? null
    if (!quienInvita) return null

    const premio = await premiarSiToca(admin, quienInvita)
    return { quienInvita, premio }
  } catch (e) {
    console.error('[referidos] no se pudo mirar el premio', perfilId, e)
    return null
  }
}

import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { serverEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La firma del enlace de baja que va en el pie de cada correo.
 *
 * Hace falta porque la pantalla de baja **no tiene sesión** —quien recibe la
 * bienvenida no tiene cuenta todavía— y sin firma bastaría con poner el correo
 * de cualquiera en la URL para darlo de baja. Con esto, solo puede darse de
 * baja quien tenga el enlace, y el enlace solo llega por correo a esa
 * dirección.
 *
 * ## Por qué no reutilizo el token del lead
 *
 * `lead-token` firma exactamente lo mismo —un correo— con el mismo secreto.
 * Si compartieran firma, el token que va en el enlace de baja de CADA correo
 * serviría también para abrir `/datos` con los datos de esa persona: nombre,
 * edad y teléfono. Un enlace pensado para renunciar a algo se convertiría en
 * un enlace de acceso.
 *
 * El prefijo `baja:` es lo que los separa. Es una línea y evita que dos usos
 * con permisos muy distintos compartan llave.
 *
 * ## Se gasta al usarse, y por qué no bastaba con que caducara
 *
 * Antes esto solo caducaba a los treinta días, y eso estaba mal planteado:
 * mientras el enlace siguiera vivo servía tantas veces como se pulsara, y el
 * enlace viaja DENTRO del correo. Reenviar la bienvenida a alguien era darle
 * un botón para darte de baja a ti, durante un mes. La caducidad no lo
 * arreglaba: le ponía fecha.
 *
 * Ahora el primer uso lo mata (`gastarBaja`). Quien quiera darse de baja
 * después lo hace desde el pie de cualquier correo nuestro, que trae uno
 * nuevo, o desde sus ajustes si tiene cuenta.
 *
 * La caducidad se queda igualmente, y más corta no: alguien se da de baja
 * cuando le molesta el correo, y eso puede ser semanas después. Es el tope de
 * un enlace que NO se ha usado.
 *
 * ## El token de visita
 *
 * La pantalla ofrece «deshacer» justo después de la baja, y ese deshacer no
 * puede ir con el token del correo: si el del correo siguiera valiendo, un
 * reenvío podría volver a suscribir a alguien que se dio de baja, que es el
 * mismo agujero por el otro lado.
 *
 * Así que la baja devuelve un token de VISITA: media hora, no ha viajado por
 * ningún correo y solo lo tiene el navegador que acaba de hacer la baja. Con
 * él se puede deshacer —y volver a dar de baja— mientras esa persona sigue
 * mirando la pantalla. Se acaba la visita, se acaba el token.
 */

const DIAS = 30
const VENTANA = DIAS * 24 * 3600 * 1000

/** La visita: lo que dura tener la pantalla delante y cambiar de idea. */
const MINUTOS_VISITA = 30
const VENTANA_VISITA = MINUTOS_VISITA * 60 * 1000

function secreto(): string {
  return process.env.LEAD_TOKEN_SECRET || serverEnv().SUPABASE_SERVICE_ROLE_KEY
}

/**
 * Todos los secretos que han valido, el de ahora primero.
 *
 * Mismo motivo que en `lead-token`: al añadir `LEAD_TOKEN_SECRET` en
 * producción cambió el secreto y murieron de golpe los enlaces ya enviados.
 * Aquí eso significa que el pie de esos correos llevaba a «ENLACE CADUCADO»
 * —un enlace de baja que no da de baja es el problema legal, no el feo—.
 * Se firma con el de ahora y se comprueba contra los que ha habido.
 */
/**
 * Hasta cuándo se acepta el secreto anterior.
 *
 * Aceptar dos secretos es una medida de TRANSICIÓN, no un diseño: sirve para
 * no dejar tirado a quien tenía un enlace emitido antes del 15 de agosto de
 * 2026, cuando se añadió `LEAD_TOKEN_SECRET` y murieron todos de golpe. Sin
 * fecha se queda para siempre, y dentro de seis meses nadie sabrá por qué
 * hay dos.
 *
 * Noventa días desde aquel cambio. Pasada esa fecha vuelve a haber un solo
 * secreto y quien traiga un enlace viejo ve que su sesión no vale, con la
 * salida para recuperarla — que es lo que faltaba y ahora existe.
 *
 * Cuando pase: borrar `secretos()` y volver a firmar y comprobar con
 * `secreto()` a secas.
 */
const HASTA_EL_ANTERIOR = Date.parse('2026-11-15T00:00:00Z')

function secretos(): string[] {
  const ahora = secreto()
  if (Date.now() > HASTA_EL_ANTERIOR) return [ahora]

  const antes = serverEnv().SUPABASE_SERVICE_ROLE_KEY
  return ahora === antes ? [ahora] : [ahora, antes]
}

function firmaCon(llave: string, prefijo: string, correo: string, caduca: number): string {
  return createHmac('sha256', llave)
    .update(`${prefijo}:${correo.trim().toLowerCase()}:${caduca}`)
    .digest('base64url')
}

function firma(prefijo: string, correo: string, caduca: number): string {
  return firmaCon(secreto(), prefijo, correo, caduca)
}

/** El token que va en la URL: cuándo caduca y su firma. */
export function firmarBaja(correo: string): string {
  const caduca = Date.now() + VENTANA
  return `${caduca}.${firma('baja', correo, caduca)}`
}

/** El de la visita. Nunca sale en un correo: solo en la respuesta del POST. */
export function firmarVisita(correo: string): string {
  const caduca = Date.now() + VENTANA_VISITA
  return `${caduca}.${firma('baja-visita', correo, caduca)}`
}

export type Baja =
  | { vale: true; visita: boolean }
  | { vale: false; motivo: 'caducado' | 'invalido' | 'gastado' }

function comprobarFirma(prefijo: string, correo: string, token: string): Baja | null {
  const corte = token.indexOf('.')
  if (corte < 1) return null

  const caduca = Number(token.slice(0, corte))
  const recibida = token.slice(corte + 1)
  if (!Number.isFinite(caduca)) return null

  const dada = Buffer.from(recibida)
  let cuadra = false
  for (const llave of secretos()) {
    const esperada = Buffer.from(firmaCon(llave, prefijo, correo, caduca))
    if (esperada.length === dada.length && timingSafeEqual(esperada, dada)) cuadra = true
  }
  if (!cuadra) return null

  if (Date.now() > caduca) return { vale: false, motivo: 'caducado' }
  return { vale: true, visita: prefijo === 'baja-visita' }
}

/**
 * Comprueba el token, sea el del correo o el de la visita.
 *
 * Distingue caducado de inválido porque la pantalla dice cosas distintas: uno
 * se arregla pidiendo otro correo y el otro no se arregla. No mira si está
 * gastado —eso necesita base y esto no la toca—: para saberlo está
 * `estaGastado`, y para gastarlo `gastarBaja`.
 */
export function verificarBaja(correo: string, token: string | undefined | null): Baja {
  if (!token) return { vale: false, motivo: 'invalido' }

  // La firma se comprueba ANTES de mirar la fecha. Al revés, cualquiera podría
  // saber si una fecha inventada está dentro de la ventana, y sobre todo:
  // decirle «caducado» a quien trae un token falso sugiere que el token era
  // bueno y solo le pilló tarde.
  //
  // Se prueban los dos prefijos porque la pantalla manda uno u otro sin
  // saberlo: el del correo la primera vez, el de la visita al cambiar de idea.
  const comoCorreo = comprobarFirma('baja', correo, token)
  if (comoCorreo) return comoCorreo

  const comoVisita = comprobarFirma('baja-visita', correo, token)
  if (comoVisita) return comoVisita

  return { vale: false, motivo: 'invalido' }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

/** Si este enlace de correo ya se usó. El de visita no se gasta: caduca. */
export async function estaGastado(token: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('bajas_correo_tokens')
    .select('token_hash')
    .eq('token_hash', hash(token))
    .maybeSingle()

  return Boolean(data)
}

/**
 * Lo gasta. Devuelve `false` si ya estaba gastado.
 *
 * Quien decide es la clave primaria, no una lectura previa: dos pulsaciones a
 * la vez leerían las dos «libre» y las dos seguirían. Insertar solo puede
 * ganarlo uno.
 */
export async function gastarBaja(correo: string, token: string): Promise<boolean> {
  const { error } = await createAdminClient()
    .from('bajas_correo_tokens')
    .insert({ token_hash: hash(token), correo: correo.trim().toLowerCase() } as never)

  if (!error) return true

  // 23505 es la clave duplicada: ya estaba gastado, que es una respuesta y no
  // un fallo. Cualquier otro error sí lo es, y no puede pasar por gastado.
  if (error.code === '23505') return false

  console.error('[baja-token] no se pudo gastar el enlace', error)
  throw new Error('no se pudo gastar el enlace')
}

/**
 * Lo devuelve sin usar.
 *
 * Solo para cuando se gastó y lo de después falló: un enlace muerto que no
 * dio de baja a nadie deja a esa persona sin salida y con el correo puesto.
 */
export async function soltarBaja(token: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('bajas_correo_tokens')
    .delete()
    .eq('token_hash', hash(token))

  if (error) console.error('[baja-token] enlace gastado que no se pudo devolver', error)
}

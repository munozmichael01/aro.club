import 'server-only'

import type { Correo } from '@/lib/correos'
import { firmarBaja } from '@/lib/baja-token'
import { firmar } from '@/lib/lead-token'
import { enlaceDeMapa } from '@/lib/mapa'
import { FIN_CENA } from '@/lib/ventana-mesa'
import { SITIO } from '@/lib/remitente'
import { urlDeFotoDeLocal } from '@/lib/foto-local'
import { DIAS_GUARDA_FOTOS, HORAS_DE_CIERRE, NOMBRES_DE_FORMATO, ZONA_POR_DEFECTO, horaDe, horaEnLetraDe, partesDe, precioTexto, vozDe } from '@/lib/reglas'
import { cabeEnLaFecha } from '@/lib/edad'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Valores } from '@/lib/plantillas'
import { claveDeMesa, mesasUnicas } from '@/lib/mesa-unica'


/**
 * De una fila de la cola a los datos que pinta la plantilla.
 *
 * El payload guarda lo que solo sabía quien encoló —el motivo de un rechazo,
 * si la cancelación lleva cortesía—, pero lo demás se vuelve a leer de la
 * base al mandar y no se copia al encolar. La razón es que entre encolar y
 * mandar pueden pasar días: el correo de la mesa se programa al publicar y
 * sale el sábado a mediodía, y si el sitio cambió por el camino, el correo
 * tiene que decir el sitio nuevo. Un payload con todo dentro es una foto
 * vieja que se manda como si fuera de hoy.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Caracas, cuatro horas por detrás. Todo lo que lee una persona va en su hora. */
function enCaracas(iso: string): Date {
  return new Date(new Date(iso).getTime() - 4 * 3600_000)
}

function diaTexto(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = enCaracas(iso)
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`
}

/** «Sábado 3», con mayúscula, para los bloques grandes. */
function diaCorto(iso: string | null | undefined): string {
  const t = diaTexto(iso)
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

function horaTexto(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = enCaracas(iso)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

/**
 * «siete y media de la noche», de la regla compartida.
 *
 * Tiraba los minutos: miraba solo la hora, así que la cena de las 7:30
 * llegaba al recordatorio de la mañana como «Hoy a las siete». Media hora de
 * diferencia en el único dato por el que alguien sale de su casa.
 *
 * La zona por defecto, como el resto de `base`: aquí todavía se asume
 * Caracas. Lo que se arregla es el minuto, no la zona, que es otra cosa y
 * está donde está.
 */
function horaEnLetra(iso: string | null | undefined, zona = ZONA_POR_DEFECTO): string {
  if (!iso) return ''
  return horaEnLetraDe(iso, zona)
}

/**
 * El dia de una fecha EN LA ZONA DE SU CIUDAD: «viernes 9», en minuscula.
 *
 * Los de arriba restan cuatro horas a mano. Funciona mientras todo sea
 * Caracas y deja de funcionar el dia que no lo sea, que es justo lo que
 * `cities.timezone` vino a resolver.
 */
function diaEnZona(iso: string | null | undefined, zona: string): string {
  const p = partesDe(iso, zona)
  return p ? `${p.dia} ${p.numero}` : ''
}

/** La misma, con mayuscula, para los bloques grandes. */
function diaEnZonaAlto(iso: string | null | undefined, zona: string): string {
  const t = diaEnZona(iso, zona)
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

/**
 * «hoy», «mañana», o «el viernes 9».
 *
 * EL CORREO DECIA EL DIA Y LLEGABA ESE DIA: «El Viernes 9 se cierra el jueves
 * 8», leido el jueves 8. Quien lo abre tiene que restar fechas para saber si
 * le queda tiempo, y eso es trabajo nuestro, no suyo.
 *
 * Se comparan DIAS DE CALENDARIO en la zona de la ciudad, no horas: a las
 * once de la noche del jueves, el cierre del viernes a las siete de la tarde
 * esta a veinte horas, pero es «mañana», no «hoy».
 */
function cuandoCierra(iso: string | null | undefined, zona: string, ahora = Date.now()): string {
  const cierre = partesDe(iso, zona)
  if (!cierre) return 'pronto'

  const hoy = partesDe(new Date(ahora).toISOString(), zona)
  if (!hoy) return `el ${diaEnZona(iso, zona)}`

  const clave = (p: NonNullable<ReturnType<typeof partesDe>>) =>
    Date.UTC(p.ano, p.mesNumero - 1, p.numero)
  const dias = Math.round((clave(cierre) - clave(hoy)) / 86_400_000)

  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return `el ${diaEnZona(iso, zona)}`
}

const bs = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`

const usd = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ref`

export type FilaDeCola = {
  id: string
  profile_id: string | null
  email: string | null
  kind: Correo
  event_id: string | null
  payload: Record<string, unknown> | null
}

export type Preparado = { a: string; datos: Valores } | { error: string }

/**
 * Los datos que NO pueden salir antes de la revelación.
 *
 * Son el sitio, su dirección, su mapa, el número de mesa, la frase por la que
 * preguntar al llegar y quién se sienta contigo: lo que devuelve `laMesaDe()`
 * y exactamente lo que el producto promete no contar hasta la hora. Están
 * aquí por NOMBRE DE CLAVE y no por plantilla a propósito — una plantilla
 * nueva hereda el candado sin que nadie se acuerde de ponérselo.
 *
 * `zona` NO está, y no es un olvido. La zona no es el secreto: `abrimos_zona`
 * anuncia «abrimos mesa en Las Mercedes» días antes, cuelga de su fecha y por
 * tanto pasa por aquí. Con `zona` en la lista, ese correo se paraba — y como
 * un correo que no se puede armar se marca como enviado para no reintentarlo
 * eternamente, se habría perdido en silencio. El secreto es el restaurante,
 * no el barrio.
 */
const ANTES_DE_LA_REVELACION_NO: readonly string[] = [
  'sitio', 'direccion', 'mapa', 'numero', 'mesaUnica', 'comoLlegar', 'gente',
]

/**
 * De una fila de la cola a los datos, con el candado puesto.
 *
 * El candado no está para el fallo que acabamos de arreglar —ese se arregla
 * cortando el dato en origen, y está cortado—, está para el siguiente: el día
 * que alguien añada `sitio` a un correo que sale antes de las doce, esto lo
 * para. Es la promesa central del producto y hasta hoy no la protegía nada,
 * solo que ninguna plantilla lo hiciera.
 *
 * Para si el dato ESTÁ y tiene algo dentro. Un `sitio: ''` no filtra nada.
 *
 * La hora de revelación se lee AQUÍ y no se la pide a `armar`: un candado que
 * confía en que lo vigilado le diga cuándo vigilarle no es un candado.
 */
export async function prepararCorreo(fila: FilaDeCola): Promise<Preparado> {
  const listo = await armar(fila)
  if ('error' in listo) return listo

  const revelaEn = fila.event_id
    ? (
        await createAdminClient()
          .from('events')
          .select('reveal_at')
          .eq('id', fila.event_id)
          .maybeSingle()
      ).data?.reveal_at ?? null
    : null

  if (revelaEn && Date.now() < new Date(revelaEn).getTime()) {
    const filtradas = ANTES_DE_LA_REVELACION_NO.filter(
      (k) => listo.datos[k] != null && String(listo.datos[k]).trim() !== '',
    )
    if (filtradas.length) {
      // No se manda vaciando los huecos: eso deja «Hoy a las siete, en .» y
      // un correo roto se lee peor que uno que no llega. Se para y se grita,
      // porque esto solo puede pasar por un fallo nuestro.
      return {
        error: `«${filtradas.join('», «')}» antes de la revelación: ${fila.kind} destriparía la mesa`,
      }
    }
  }

  return listo
}

async function armar(fila: FilaDeCola): Promise<Preparado> {
  const admin = createAdminClient()
  const p = (fila.payload ?? {}) as Record<string, unknown>

  // A quién. Un perfil borrado no recibe nada: `deleted_at` es una baja, y
  // escribir a quien se dio de baja es justo lo que pidió que no pasara.
  let a = fila.email ?? ''
  let trato = ''
  /** Su fecha de nacimiento, para no ofrecerle fechas que no puede reservar. */
  let nacimiento: string | null = null

  if (fila.profile_id) {
    const { data: perfil } = await admin
      .from('profiles')
      .select('email, contact_email, display_name, full_name, deleted_at, birthdate')
      .eq('id', fila.profile_id)
      .maybeSingle()

    if (!perfil) return { error: 'ese perfil ya no existe' }
    if (perfil.deleted_at) return { error: 'se dio de baja' }

    a = perfil.contact_email || perfil.email || a
    trato = perfil.display_name || perfil.full_name?.split(' ')[0] || ''
    nacimiento = perfil.birthdate ?? null
  }

  if (!a) return { error: 'sin dirección a la que escribir' }

  // La fecha, si el correo cuelga de una.
  let evento: {
    starts_at: string
    format: string
    booking_closes_at: string
    zone_slug: string | null
    reveal_at: string
    city_slug?: string | null
    age_band_min?: number | null
    price_usd?: number | string | null
  } | null = null

  if (fila.event_id) {
    const { data } = await admin
      .from('events')
      // `reveal_at` no lo usa ninguna plantilla: lo usa el candado de
      // `prepararCorreo` para saber si esta fecha ya se abrió.
      .select('starts_at, format, zone_slug, reveal_at, booking_closes_at, city_slug, age_band_min, price_usd')
      .eq('id', fila.event_id)
      .maybeSingle()
    evento = data ?? null
  }

  // Hay correos que NO se entienden sin su fecha: «El {{cuando}} no sale» sin
  // fecha sale como «El no sale». Antes de pintar una frase rota, no se
  // manda: un correo raro se lee peor que uno que no llega, y este se puede
  // reencolar cuando el dato esté.
  //
  // Los dos del pago —`pago_confirmado` y `pago_no_cuadra`— NO están aquí, y
  // es a propósito. Sus plantillas también nombran la fecha, y el panel los
  // encolaba sin evento: de ahí la frase coja «Tu reserva del pasa de
  // pendiente a confirmada». Eso se arregla pasando el evento al encolar, que
  // es donde estaba el fallo.
  //
  // Meterlos en esta lista habría sido peor: un correo que no se puede armar
  // se CIERRA ahí abajo y no se reintenta nunca. Para un acuse de dinero, no
  // llegar es peor que llegar con una frase fea — la persona se queda sin el
  // comprobante que le pedimos que guarde y nadie se entera.
  const NECESITAN_FECHA: Correo[] = [
    'mesa_asignada', 'recordatorio', 'cancelacion', 'fecha_cancelada', 'abrimos_zona',
    // `sin_mesa` nombra la fecha de la que se quedó fuera en su primera
    // frase, y `publicar` SIEMPRE lo encola con su evento: si algún día
    // llegara sin él, es mejor no mandarlo que mandar «del  salieron».
    'sin_mesa',
    // Nombra el día en el que cambió algo, y solo existe colgando de él.
    'mesa_cambiada',
  ]
  if (NECESITAN_FECHA.includes(fila.kind) && !evento) {
    return { error: 'ese correo necesita su fecha y no la tiene' }
  }

  const voz = vozDe(evento?.format ?? (p.formato as string) ?? null)

  // «Ajustes de correo» del pie, con dos destinos según quién abra.
  //
  // Los trece correos apuntaban a `/cuenta`, que exige sesión. Y quien recibe
  // la bienvenida NO tiene cuenta: dejó su dirección y se quedó a medias, así
  // que para esa persona el enlace no llevaba a ningún sitio. Un enlace de
  // baja que no funciona no es solo feo; en varias jurisdicciones no es legal.
  //
  // Con cuenta va a sus ajustes, donde hay un interruptor por tipo de aviso.
  // Sin cuenta va a la pantalla de baja, con el token firmado en la URL: sin
  // sesión, la firma es lo único que impide dar de baja a cualquiera poniendo
  // su dirección a mano.
  const enlaceAjustes = fila.profile_id
    ? `${SITIO}/cuenta`
    : `${SITIO}/baja?correo=${encodeURIComponent(a)}&token=${encodeURIComponent(firmarBaja(a))}`

  const base: Valores = {
    // El precio, de la regla compartida y no escrito en la plantilla. Estaba a
    // mano en «abrimos tu zona» y en cuatro sitios de la landing: bajarlo
    // obligaba a acertar en los siete, y el que se escape deja un correo
    // diciendo un precio y el cobro haciendo otro.
    /**
     * El precio DE ESTA FECHA, no el del club.
     *
     * Era `precioTexto()` a secas, o sea la constante. Mientras valía lo
     * mismo para todo no se notaba; el día que subió a diez, el correo de
     * «abrimos mesa en tu zona» de una fecha abierta a siete habría dicho
     * diez y el cobro habría hecho siete.
     *
     * Es el mismo fallo que ya se pagó al revés, y lo arregla la misma
     * regla: si el correo cuelga de un evento, el número sale del evento.
     */
    precio: evento?.price_usd != null ? `${Number(evento.price_usd)} ref` : precioTexto(),
    // Las horas con que se cierra una fecha. Misma razón que el precio: estaba
    // escrita a mano en la plantilla de fecha cancelada, y bajarla de 48 a 24
    // obligaba a acertar en todos los sitios donde se promete.
    horasCierre: HORAS_DE_CIERRE,
    // Los días que guardamos la cédula y la selfie. Misma razón que el
    // precio y que las horas de cierre: estaba escrito a mano en la
    // plantilla, y es una promesa.
    diasGuarda: DIAS_GUARDA_FOTOS,
    trato,
    correo: a,
    enlaceAjustes,
    ciudad: 'Caracas',
    cuando: diaTexto(evento?.starts_at),
    hora: horaTexto(evento?.starts_at),
    horaEnLetra: horaEnLetra(evento?.starts_at),
    unidad: voz.unidad,
    Unidad: voz.Unidad,
    art: voz.art,
    TU: voz.TU,
    // De la voz, no de «¿hay mesa?»: un café y un brunch tienen mesa y no
    // son una cena, y esto les decía «CON QUIÉN CENAS» a las once.
    conQuien: voz.conQuien,
    alGrupo: voz.unidad === 'mesa' ? ' la mesa' : 'l grupo',
  }

  switch (fila.kind) {
    // --- el embudo ------------------------------------------------------
    case 'bienvenida':
    // Mismo cuerpo, palabras distintas: la plantilla pinta `titular`,
    // `entradilla`, los dos pasos y el botón, y los decide `payload.falta`.
    //
    // ESTO FALTABA, y es la explicación del empujón que no funcionaba. El
    // comentario de aquí decía que la plantilla elegía entre «te falta el
    // perfil» y «te falta verificarte» con `payload.falta`, y la plantilla
    // no miraba `falta` en ningún sitio: no existía la rama. Así que a las
    // 29 personas que solo les faltaba la cédula les llegó, con el asunto
    // «Tienes puesto», un correo que empezaba «ya te guardamos el puesto»,
    // seguía «termina tu perfil · diez preguntas más» y terminaba en un
    // botón que decía «Completar mi perfil» y llevaba a /verificacion.
    //
    // Es decir: una segunda bienvenida que le pedía a alguien algo que ya
    // había hecho. 26 de 29 no subieron nunca la cédula, y de ahí se
    // concluyó que el problema era CUÁNDO se mandaba. No se midió el
    // momento: se midió un correo equivocado.
    case 'empujon': {
      // Las zonas que dijo que acepta, para no prometerle mesa en un sitio
      // al que no puede ir.
      const zonas = await nombresDeZonas(admin, (p.zonas as string[]) ?? [], fila.profile_id)
      const coma = trato ? `, ${trato}` : ''
      const falta = (p.falta as string) ?? 'perfil'

      /**
       * El botón. NO puede ser `/cuestionario` a secas.
       *
       * Quien NO tiene cuenta —dejó su correo y se fue— necesita el token
       * firmado: es el mecanismo que ya existe para seguir el alta desde
       * otro dispositivo, y este es su caso exacto. Los DOS parámetros, y
       * no solo el token: la pantalla exige correo y token juntos, porque
       * la firma se verifica contra la dirección.
       *
       * Y quien SÍ tiene cuenta va a su paso siguiente de verdad, CON su
       * correo en la URL. Sin él, el enlace es un callejón: la pantalla ve
       * que no hay sesión, manda a /entrar y allí le pregunta quién es a
       * alguien que viene de nuestro propio correo. Es literalmente lo que
       * nos escribió una persona el 12-10 — «solo faltaba la foto y se
       * salió, y no sé cómo entrar de nuevo»—: la mitad de quien abre
       * verificación desde el navegador de Instagram no tiene sesión que
       * volver a encontrar, porque ese navegador no la guarda.
       */
      const destino = falta === 'preguntas' ? '/cuestionario' : '/verificacion'
      const enlaceSeguir = fila.profile_id
        ? `${SITIO}${destino}?correo=${encodeURIComponent(a)}`
        : `${SITIO}/cuestionario?t=${encodeURIComponent(firmar(a))}&correo=${encodeURIComponent(a)}`

      // Cada estado, sus palabras. `bienvenida` es la de Design, intacta.
      const voces: Record<string, Record<string, string>> = {
        bienvenida: {
          asuntoCorreo: 'Tienes puesto',
          cinta: 'TIENES PUESTO',
          anticipo: 'Guardamos tu puesto. Te escribimos en cuanto abramos mesa en tu zona.',
          titularA: 'Ya te guardamos',
          titularB: 'el',
          titularC: 'puesto',
          entradilla: `Gracias por contarnos quién eres${coma}. Con esas cuatro respuestas ya podemos empezar a pensar en tu mesa.`,
          paso1Titulo: 'Termina tu perfil',
          paso1: 'Diez preguntas más: de qué hablas, qué comes, qué prefieres esquivar. Es lo que hace que tu mesa no sea al azar.',
          paso2Titulo: 'Verifica tu identidad',
          paso2: 'Cédula y una selfie. Es la razón por la que los otros cinco se atreven a sentarse contigo.',
          boton: 'Completar mi perfil',
        },
        // Dejó su correo y no llegó a tener cuenta.
        perfil: {
          asuntoCorreo: 'Tu puesto sigue ahí',
          cinta: 'TU PUESTO SIGUE AHÍ',
          anticipo: 'No lo hemos dado a nadie. Cuando quieras, sigues donde lo dejaste.',
          titularA: 'Tu puesto',
          titularB: 'sigue',
          titularC: 'ahí',
          entradilla: `Te quedaste a medias${coma}, y no hemos dado tu puesto a nadie. Cuando quieras, sigues justo donde lo dejaste.`,
          paso1Titulo: 'Termina tu perfil',
          paso1: 'Diez preguntas más: de qué hablas, qué comes, qué prefieres esquivar. Es lo que hace que tu mesa no sea al azar.',
          paso2Titulo: 'Verifica tu identidad',
          paso2: 'Cédula y una selfie. Es la razón por la que los otros cinco se atreven a sentarse contigo.',
          boton: 'Seguir donde lo dejé',
        },
        // Tiene cuenta y dejó el cuestionario a medias. Hasta hoy no
        // recibía NADA: el empujón cubría el escalón de antes y el de
        // después, y no este.
        preguntas: {
          asuntoCorreo: 'Te faltan unas preguntas',
          cinta: 'TE FALTAN PREGUNTAS',
          anticipo: 'Tu cuenta ya está hecha. Solo quedan las preguntas que dejaste a medias.',
          titularA: 'Te faltan',
          titularB: 'unas',
          titularC: 'preguntas',
          entradilla: `Tu cuenta ya está hecha${coma}. Lo único que falta para poder pensar en tu mesa son las preguntas que dejaste a medias.`,
          paso1Titulo: 'Termina tu perfil',
          paso1: 'Esto es lo que falta: de qué hablas, qué comes, qué prefieres esquivar. Es lo que hace que tu mesa no sea al azar.',
          paso2Titulo: 'Verifica tu identidad',
          paso2: 'Después: cédula y una selfie. Es la razón por la que los otros cinco se atreven a sentarse contigo.',
          boton: 'Seguir con mis preguntas',
        },
        /**
         * Subió sus fotos y le rechazamos una. Hoy no recibía nada.
         *
         * NO repite el motivo: ese ya fue en el correo de rechazo, con el
         * texto del catálogo, y volver a dárselo tres días después sería
         * contarle otra vez lo que ya sabe. Este pregunta si pudo.
         *
         * Y dice que las demás están: desde que el rechazo sabe QUÉ foto
         * afecta, la pantalla le pide una sola. Quien leía «repite las
         * fotos» repetía las dos o se quedaba sin saber cuál.
         */
        rechazo: {
          asuntoCorreo: 'Te falta repetir una foto',
          cinta: 'TE FALTA UNA FOTO',
          anticipo: 'Una de tus fotos no nos sirvió. Se repite en un minuto.',
          titularA: 'Te falta',
          titularB: 'repetir una',
          titularC: 'foto',
          entradilla: `Subiste tus fotos${coma}, y una no nos sirvió. Te escribimos entonces para decirte cuál y por qué. Si no te llegó o se te pasó, está todo esperándote donde lo dejaste.`,
          paso1Titulo: 'Tu perfil, listo',
          paso1: 'Ya nos contaste de qué hablas, qué comes y qué prefieres esquivar. Eso no hay que repetirlo.',
          paso2Titulo: 'Repite esa foto',
          paso2: 'La pantalla te dice cuál es y qué le pasó. Las otras ya están y no se tocan.',
          boton: 'Repetir la foto',
        },
        /**
         * Subió una de las dos fotos y se quedó ahí.
         *
         * `cual` dice cuál le falta. Sin él esto diría «te falta una foto» a
         * secas, que obliga a la persona a abrir la pantalla para averiguar
         * cuál de las dos: trabajo nuestro hecho por ella.
         */
        media_foto: {
          asuntoCorreo: 'Te falta una foto',
          cinta: 'FALTA UNA FOTO',
          anticipo: 'Subiste una de las dos. Con la otra quedas lista.',
          titularA: 'Te falta', titularB: 'una', titularC: 'foto',
          entradilla: '',
          paso1Titulo: 'Tu perfil, listo',
          paso1: 'Ya nos contaste de qué hablas, qué comes y qué prefieres esquivar. Eso no hay que repetirlo.',
          paso2Titulo: 'Verifica tu identidad',
          paso2: 'Lo que falta: una sola foto. Es la razón por la que los otros cinco se atreven a sentarse contigo.',
          boton: 'Mandar la que falta',
        },
        // Perfil completo y nada subido. El peor de los tres: está a un
        // paso de poder apartar puesto.
        verificacion: {
          asuntoCorreo: 'Te falta un paso',
          cinta: 'TE FALTA UN PASO',
          anticipo: 'Tu perfil está completo. Solo queda verificar quién eres.',
          titularA: 'Te falta',
          titularB: 'un',
          titularC: 'paso',
          // Dos minutos no es una forma de hablar: es la mediana medida
          // entre terminar el perfil y subir la cédula, y el p90 son diez.
          entradilla: `Tu perfil está completo${coma}. Lo único que falta para que puedas apartar puesto es verificar quién eres: una foto de tu cédula y una selfie. Dos minutos.`,
          paso1Titulo: 'Tu perfil, listo',
          paso1: 'Ya nos contaste de qué hablas, qué comes y qué prefieres esquivar. Eso no hay que repetirlo.',
          paso2Titulo: 'Verifica tu identidad',
          paso2: 'Esto es lo que falta: cédula y una selfie. Es la razón por la que los otros cinco se atreven a sentarse contigo.',
          boton: 'Verificar mi identidad',
        },
      }

      const voz = { ...(voces[fila.kind === 'bienvenida' ? 'bienvenida' : falta] ?? voces.perfil) }

      // «Te falta la selfie» o «te falta la foto de tu cédula», con el
      // nombre delante. La entradilla de `media_foto` se arma aquí porque
      // depende de cuál sea, y el resto de la tarjeta no.
      if (falta === 'media_foto') {
        const cual = (p.cual as string) === 'cedula' ? 'la foto de tu cédula' : 'tu selfie'
        voz.titularC = (p.cual as string) === 'cedula' ? 'cédula' : 'selfie'
        voz.titularA = 'Te falta'
        voz.titularB = (p.cual as string) === 'cedula' ? 'la' : 'tu'
        voz.entradilla = `Subiste una de las dos${coma}, y nos falta ${cual}. Es lo único que queda para que puedas apartar puesto, y se hace en un minuto.`
        voz.boton = (p.cual as string) === 'cedula' ? 'Subir mi cédula' : 'Hacerme la selfie'
        voz.anticipo = `Subiste una de las dos. Nos falta ${cual}.`
      }

      return {
        a,
        datos: {
          ...base,
          ...voz,
          zonaPrincipal: zonas[0] ?? 'tu zona',
          zonas: zonas.length ? unirCon(zonas, ' o ') : 'tu zona',
          // El pie de la tarjeta. En minúscula, como lo diseñó Design, pero
          // con la zona de verdad y no con «las mercedes» escrito a mano.
          //
          // Y SIN el día escrito a mano tampoco. Decía «sábado» siempre, y
          // este correo lo recibe quien dejó su correo: si trae fecha, es la
          // suya —y hoy hay abiertas un viernes y un martes—; si no trae
          // ninguna, no hay día que prometer. Prometer un día que luego no
          // sale es peor que no decirlo.
          pieDeZona: [diaTexto(evento?.starts_at), zonas[0]?.toLowerCase()]
            .filter(Boolean)
            .join(' · ') || 'tu zona',
          enlaceSeguir,
        },
      }
    }

    // Quien pagó y no se sentó. Necesita la fecha de la que se quedó fuera
    // —que viene con el evento— y la siguiente, que es lo único accionable
    // que se le puede ofrecer.
    case 'sin_mesa': {
      const proximas = await proximasFechas(admin, nacimiento)
      return {
        a,
        datos: {
          ...base,
          proxima1: proximas[0] ?? 'Te avisamos en cuanto abramos otra',
        },
      }
    }

    // Entrega 16 · la mañana después. Lo único que necesita del evento es
    // dónde cenó, para que el correo no diga «anoche cenaste» a secas. El
    // candado de la revelación no estorba: para cuando esto sale, `reveal_at`
    // hace horas que pasó.
    case 'encuesta_despues': {
      const mesa = fila.event_id ? await laMesaDe(admin, fila.event_id, fila.profile_id) : null
      // Con cuántos cenó de verdad: decía «cinco personas» siempre, y una
      // mesa puede salir de cinco. Sin mesa que leer, una frase que vale
      // para cualquier número antes que un número inventado.
      return { a, datos: { ...base, sitio: mesa?.sitio ?? '', otros: mesa?.otros ?? 'el resto de la mesa' } }
    }

    /**
     * El juego de la mesa. No tiene plantilla: es solo push.
     *
     * Pasa por aquí igual que los demás porque aquí es donde se resuelve a
     * quién va y se juntan sus datos. Sin este caso caía en «tipo
     * desconocido» y la fila se cerraba como imposible de armar, sin llegar
     * nunca a mandar la push.
     *
     * Lleva el id de la mesa: la app abre el juego DE ESA mesa, y es lo que
     * hace que los seis teléfonos vean las mismas preguntas.
     */
    case 'juego':
      return { a, datos: { ...base, mesaId: (p.mesaId as string) ?? '' } }

    case 'cuenta_lista':
      return { a, datos: { ...base, correo: a } }

    case 'verificacion': {
      // Las dos próximas fechas abiertas, que es la razón del correo: ya
      // puede reservar, y esto es lo que hay. Las SUYAS: una cena de
      // mayores de 40 no se le ofrece a quien no los tiene.
      const proximas = await proximasFechas(admin, nacimiento)
      return {
        a,
        datos: { ...base, proxima1: proximas[0] ?? 'Te avisamos en cuanto abramos una', proxima2: proximas[1] ?? '' },
      }
    }

    /**
     * Perdón: aquel «repite una foto» era un error nuestro.
     *
     * Lleva la próxima fecha abierta porque es lo que convierte la disculpa
     * en algo útil: quien recibió un rechazo falso dejó de esperar nada, y
     * decirle «ya puedes apartar puesto» sin decirle para cuándo lo deja
     * donde estaba.
     *
     * Y NADA de la fecha se escribe a mano. El día sale del evento y la zona
     * de su `event_venues`: una fecha escrita en la plantilla es la que sigue
     * diciendo «el viernes 16» tres semanas después.
     */
    case 'disculpa_verificacion': {
      const { data: fechas } = await admin
        .from('events')
        .select('starts_at, format, city_slug, event_venues(zones(name))')
        .eq('status', 'open')
        .eq('es_prueba', false)
        .gt('booking_closes_at', new Date().toISOString())
        .order('starts_at')
        .limit(1)

      const proxima = fechas?.[0]
      if (!proxima) {
        // Sin fecha abierta la frase no sale, y el botón deja de prometer
        // una que no existe.
        return { a, datos: { ...base, hayFecha: false, textoBoton: 'Ir a mi cuenta' } }
      }

      const zona = await zonaDeLaCiudad(admin, proxima.city_slug)
      const donde = ((proxima.event_venues ?? []) as unknown as { zones: { name: string } | null }[])
        .map((v) => v.zones?.name)
        .filter((x): x is string => !!x)

      return {
        a,
        datos: {
          ...base,
          hayFecha: true,
          // «cena», «drinks», «caminata»: el nombre del formato en minúscula,
          // que es como va en mitad de una frase.
          queHay: nombreDelFormato(proxima.format).toLowerCase(),
          cuando: `el ${diaEnZona(proxima.starts_at, zona)}`,
          donde: unirCon(donde, ' y '),
          textoBoton: 'Ver la fecha',
        },
      }
    }

    case 'verificacion_rechazada': {
      const motivo = await textoDelMotivo(admin, p.motivo as string)

      /**
       * «Lo que vio quien revisó», solo si alguien lo escribió de verdad.
       *
       * La plantilla llevaba la frase del maquetado METIDA A MANO: «el
       * número está borroso en la esquina inferior, lo demás se ve bien».
       * Eso salía a TODO el que recibía un rechazo, dijera lo que dijera su
       * motivo, y el correo se contradecía solo: arriba «aceptamos cédula
       * venezolana o pasaporte vigente» y debajo «el número está borroso».
       *
       * Le llegó así a seis personas. Una de ellas nos escribió el 13-10
       * diciendo que no podía subir su cédula, que es lo que pasa cuando te
       * damos dos explicaciones distintas de lo mismo.
       *
       * `rejection_note` existe y el panel sabe escribirla; hasta hoy nadie
       * la ha escrito nunca (0 de 6). Así que lo normal es que no haya
       * nada, y entonces el bloque no sale. Inventar lo que vio una persona
       * es peor que no contarlo.
       */
      /**
       * QUÉ FOTO es la que hay que repetir. Todo el correo lo daba por
       * hecho: el titular decía «no se lee tu cédula», la fila de al lado
       * «tu selfie, guardada, no hace falta repetirla» y el consejo hablaba
       * de poner el documento plano sobre una mesa.
       *
       * Así que al rechazar una SELFIE el correo decía lo contrario de la
       * verdad dos veces: que repitiera la cédula, que no había tocado, y
       * que la selfie —la que falla— estaba guardada.
       *
       * `afecta` ya vive en el catálogo desde que el rechazo sabe qué foto
       * mira. Solo faltaba que el correo lo leyera.
       */
      const { data: cat } = await admin
        .from('verification_rejection_reasons')
        .select('afecta, allows_retry')
        .eq('code', (p.motivo as string) ?? '')
        .maybeSingle()
      const afecta = (cat as { afecta?: string } | null)?.afecta ?? 'ambas'
      const sePuedeRepetir = (cat as { allows_retry?: boolean } | null)?.allows_retry !== false

      /**
       * El caso no es solo QUÉ foto: es también qué le pasó.
       *
       * `afecta` dice cuál, y con eso solo no basta. «Falta la cédula» y «la
       * foto salió movida» afectan las dos al documento, y un correo que
       * dice «no se LEE tu cédula» a quien no la ha mandado está hablando
       * de una foto que no existe.
       *
       * Y los dos motivos de sospecha no dejan repetir: ahí el correo no
       * puede terminar en «repite y seguimos» con un botón a verificación,
       * porque la pantalla no se lo va a permitir y porque ya le dijimos que
       * nos escriba. Prometer un camino cerrado es peor que no decir nada.
       */
      const codigo = (p.motivo as string) ?? ''
      const caso = !sePuedeRepetir
        ? 'sinReintento'
        : codigo === 'falta-cedula'
          ? 'faltaDocumento'
          : codigo === 'falta-selfie'
            ? 'faltaSelfie'
            : afecta

      const voces: Record<string, Record<string, string>> = {
        id_document: {
          asuntoCorreo: 'Falta una foto',
          cinta: 'FALTA UNA FOTO',
          anticipo: 'Hay que repetir la foto de tu documento. La selfie ya está guardada.',
          titularA: 'No se lee', titularB: 'tu', titularC: 'cédula',
          boton: 'Repetir la foto del documento',
          laOtraTitulo: 'Tu selfie',
          laOtra: 'Guardada, no hace falta repetirla',
          consejo: 'Tres cosas ayudan: luz de día, el documento plano sobre una mesa y la cámara sin inclinar. La mayoría se aprueba a la segunda.',
        },
        selfie: {
          asuntoCorreo: 'Falta una foto',
          cinta: 'FALTA UNA FOTO',
          anticipo: 'Hay que repetir tu selfie. El documento ya está guardado.',
          titularA: 'No se ve bien', titularB: 'tu', titularC: 'selfie',
          boton: 'Repetir la selfie',
          laOtraTitulo: 'Tu documento',
          laOtra: 'Guardado, no hace falta repetirlo',
          consejo: 'Tres cosas ayudan: luz natural, la cara de frente y sin gorra ni lentes oscuros. La mayoría se aprueba a la segunda.',
        },
        ambas: {
          asuntoCorreo: 'Faltan las dos fotos',
          cinta: 'FALTAN LAS FOTOS',
          anticipo: 'Hay que repetir las dos fotos.',
          titularA: 'Hay que repetir', titularB: 'las', titularC: 'dos fotos',
          boton: 'Repetir las fotos',
          laOtraTitulo: 'Las dos',
          laOtra: 'Esta vez hay que mandarlas otra vez',
          consejo: 'Tres cosas ayudan: luz de día, el documento plano sobre una mesa y la cara de frente, sin gorra. La mayoría se aprueba a la segunda.',
        },
        // No es que esté mal: es que no llegó.
        faltaDocumento: {
          asuntoCorreo: 'Nos falta tu documento',
          cinta: 'FALTA UNA FOTO',
          anticipo: 'Nos llegó tu selfie, pero no la foto de tu documento.',
          titularA: 'Nos falta', titularB: 'tu', titularC: 'cédula',
          boton: 'Subir mi documento',
          laOtraTitulo: 'Tu selfie',
          laOtra: 'Guardada, no hace falta repetirla',
          consejo: 'Vale la cédula venezolana o un pasaporte vigente. Con luz de día, plano sobre una mesa y sin recortar los bordes.',
        },
        faltaSelfie: {
          asuntoCorreo: 'Nos falta tu selfie',
          cinta: 'FALTA UNA FOTO',
          anticipo: 'Nos llegó tu documento, pero no tu selfie.',
          titularA: 'Nos falta', titularB: 'tu', titularC: 'selfie',
          boton: 'Hacerme la selfie',
          laOtraTitulo: 'Tu documento',
          laOtra: 'Guardado, no hace falta repetirlo',
          consejo: 'De frente, con luz natural y sin gorra ni lentes oscuros. Es para comprobar que eres tú, nada más.',
        },
        /**
         * Sospecha. Aquí no se ofrece repetir NADA.
         *
         * La pantalla no se lo permite —`allows_retry` es false— y el correo
         * que recibió ya le dijo que nos escriba. Un botón «repetir las
         * fotos» lo mandaría a una puerta cerrada, y los dos motivos de
         * sospecha comparten mensaje a propósito: uno específico le
         * enseñaría a quien suplanta qué corregir.
         */
        sinReintento: {
          asuntoCorreo: 'Sobre tu verificación',
          cinta: 'TU VERIFICACIÓN',
          anticipo: 'No pudimos verificar tu identidad. Escríbenos y lo revisamos contigo.',
          titularA: 'Hablemos de', titularB: 'tu', titularC: 'verificación',
          boton: 'Escribirnos',
          laOtraTitulo: 'Tus fotos',
          laOtra: 'Siguen guardadas mientras lo revisamos',
          consejo: 'Contéstanos a este correo y lo miramos contigo. No hace falta que subas nada más por ahora.',
        },
      }
      const voz = voces[caso] ?? voces.ambas
      const coma = trato ? `, ${trato}` : ''
      // Cuando falta una foto, el mensaje del catálogo YA dice qué hacer
      // («sube tu cédula», «hazte una de frente»). Añadirle «mándala y
      // seguimos» detrás es decirlo dos veces.
      const queRepetir = !sePuedeRepetir || caso === 'faltaDocumento' || caso === 'faltaSelfie'
        ? ''
        : caso === 'ambas'
          ? 'Repite las dos y seguimos.'
          : 'Repite solo esa foto y seguimos.'

      let notaRevisor = ''
      if (fila.profile_id) {
        const { data: v } = await admin
          .from('verifications')
          .select('rejection_note')
          .eq('profile_id', fila.profile_id)
          .eq('status', 'rejected')
          .order('created_at', { ascending: false })
          .limit(1)
        notaRevisor = v?.[0]?.rejection_note?.trim() ?? ''
      }

      return {
        a,
        datos: {
          ...base,
          ...voz,
          motivo,
          // «No es un rechazo» solo cuando de verdad no lo es. Decírselo a
          // quien no puede volver a intentarlo es quitarle importancia a lo
          // único que el correo tenía que dejar claro.
          // El nombre delante y punto. Metiéndolo dentro de la frase del
          // catálogo salía «No pudimos, Kristhi, verificar tu identidad».
          entradilla: sePuedeRepetir
            ? `No es un rechazo${coma}: ${motivo} ${queRepetir}`.trim()
            : `${trato ? trato + ', ' : ''}${trato ? motivo.charAt(0).toLowerCase() + motivo.slice(1) : motivo}`.trim(),
          notaRevisor,
        },
      }
    }

    case 'restablecer_clave':
      return { a, datos: { ...base, enlace: (p.enlace as string) ?? '' } }

    // --- la mesa --------------------------------------------------------
    case 'mesa_asignada': {
      if (!fila.event_id) return { error: 'sin fecha' }
      const mesa = await laMesaDe(admin, fila.event_id, fila.profile_id)
      if (!mesa) return { error: 'sin mesa asignada' }
      return { a, datos: { ...base, ...mesa } }
    }

    /**
     * La mesa cambió después de habérsela contado.
     *
     * El «ahora» se lee de la base como en `mesa_asignada` —mismo
     * `laMesaDe()`, misma verdad— y el «antes» viene en el payload, porque es
     * lo único que la base ya no sabe: es lo que le dijimos, y en cuanto se
     * republica deja de existir en ninguna tabla.
     *
     * Solo se marca como cambiado lo que de verdad cambió. Enseñar el sitio
     * tachado cuando lo único que se movió es el número de mesa obliga a leer
     * las dos líneas para descubrir que una es igual.
     */
    case 'mesa_cambiada': {
      if (!fila.event_id) return { error: 'sin fecha' }
      const mesa = await laMesaDe(admin, fila.event_id, fila.profile_id)
      if (!mesa) return { error: 'sin mesa asignada' }

      const antesMesa = p.antesMesa == null ? null : String(p.antesMesa)
      const antesSitio = p.antesSitio == null ? null : String(p.antesSitio)

      // Si no cambió nada de lo que se puede contar, este correo no tiene
      // nada que decir. Mejor no mandarlo que mandar «cambió tu mesa» y una
      // tarjeta idéntica a la de antes.
      const cambiaMesa = antesMesa != null && antesMesa !== String(mesa.numero)
      const cambiaSitio = antesSitio != null && antesSitio !== mesa.sitio
      if (!cambiaMesa && !cambiaSitio) return { error: 'no cambió nada que contar' }

      return {
        a,
        datos: {
          ...base,
          ...mesa,
          antesMesa,
          antesSitio,
          cambiaMesa,
          cambiaSitio,
          // El porqué que escribió operación al publicar. Vacío se salta la
          // fila entera: un hueco donde iba una explicación es peor que no
          // dar ninguna.
          porque: typeof p.porque === 'string' ? p.porque.trim() : '',
        },
      }
    }

    /**
     * El recordatorio de la mañana NO sabe dónde es.
     *
     * Iba junto a `mesa_asignada` en este mismo `case`, así que llamaba a
     * `laMesaDe()` — y esa función lee el sitio, la dirección, el número y
     * los cinco nombres de la base al enviar. El cron sale a las 13:00 UTC,
     * las nueve de Caracas, y `reveal_at` es a las 16:00: cada sábado este
     * correo contaba a las 09:01 lo que el producto promete no contar hasta
     * mediodía. Tres horas antes, todas las semanas.
     *
     * No se arregla en la plantilla. Si el dato llega, alguien lo vuelve a
     * poner: lo que no llega no se puede filtrar. Este correo dice que es
     * hoy, a qué hora, y que a mediodía se abre todo — y nada más.
     */
    case 'recordatorio': {
      if (!fila.event_id) return { error: 'sin fecha' }
      if (!evento) return { error: 'sin fecha' }

      const zona = await zonaDeLaCiudad(admin, evento.city_slug)
      const voz = vozDe(evento.format)
      const horaDelPlan = partesDe(evento.starts_at, zona)?.horas ?? 20
      const yaAbierta = !!evento.reveal_at && Date.now() >= new Date(evento.reveal_at).getTime()

      return {
        a,
        datos: {
          ...base,
          // La hora de la revelación, de `reveal_at` y en la zona de la
          // ciudad. Escrita a mano decía «12:00 p.m.» aunque la fecha
          // revelara a otra hora, que es lo que pasa en cuanto hay una
          // fecha que no revela a mediodía.
          revelaA: horaDe(evento.reveal_at, zona) ?? '',
          // Si el aviso llega DESPUÉS de la revelación, la push dice otra
          // cosa: a las nueve de la mañana todavía no hay nada que abrir.
          yaRevelado: yaAbierta ? 'si' : '',
          // El plan por su nombre, no «cena» siempre.
          tituloHoy: HOY_ES[evento.format ?? ''] ?? 'Hoy es tu plan',
          // «una mesa» o «un grupo», de `vozDe`. Una caminata no tiene mesa.
          unaUnidad: (voz.unidad === 'grupo' ? 'un ' : 'una ') + voz.unidad,
          // Y la franja del día, de la hora REAL: un café de las diez de la
          // mañana no es «esta noche».
          cuandoDelDia: horaDelPlan < 12 ? 'esta mañana' : horaDelPlan < 19 ? 'esta tarde' : 'esta noche',
          /**
           * La entrada del local, solo si la mesa YA está abierta.
           *
           * Este correo sale a las nueve de la mañana y una cena revela a
           * mediodía: ahí va vacío y la plantilla se salta las dos filas.
           * Enseñar la fachada tres horas antes sería revelar el sitio por
           * la puerta de atrás, y el propio cuerpo del correo dice «todavía
           * no sabes dónde». En un plan de mañana —que revela la víspera— sí
           * sale, que es para lo que la pidió Design.
           */
          ...(yaAbierta
            ? await (async () => {
                const suya = await laMesaDe(admin, fila.event_id!, fila.profile_id)
                return { fotoEntrada: suya?.fotoEntrada ?? '', sitio: suya?.sitio ?? '' }
              })()
            : { fotoEntrada: '', sitio: '' }),
        },
      }
    }

    // --- el dinero ------------------------------------------------------
    case 'pago_en_revision':
    case 'pago_confirmado':
    case 'pago_no_cuadra': {
      const pago = await elPagoDe(admin, fila.profile_id, fila.event_id)
      return { a, datos: { ...base, ...pago, motivo: (p.motivo as string) ?? '' } }
    }

    /**
     * El correo escrito a mano. Lo único que sale del payload es el texto.
     *
     * En párrafos y no en una cadena con saltos: la plantilla los pinta uno a
     * uno con `{{ . }}`, que ESCAPA. Pasar HTML desde el payload sería abrir
     * una puerta para meter marcado en un correo desde una fila de la base, y
     * no hace falta ninguna para escribir tres frases.
     *
     * Sin texto no se manda. Un correo en blanco con nuestro logo es peor que
     * ningún correo: la persona cree que algo se rompió.
     */
    case 'mensaje': {
      const texto = typeof p.texto === 'string' ? p.texto.trim() : ''
      if (!texto) return { error: 'sin texto' }
      const parrafos = texto.split(/\n{1,}/).map((l) => l.trim()).filter(Boolean)
      const asunto = typeof p.asunto === 'string' && p.asunto.trim() ? p.asunto.trim() : 'Te escribimos'
      return {
        a,
        datos: {
          ...base,
          asunto,
          parrafos,
          // Lo que se lee en la bandeja antes de abrir. La primera frase del
          // propio mensaje, que es exactamente de lo que va.
          adelanto: parrafos[0].slice(0, 140),
        },
      }
    }

    /**
     * Los avisos del día, juntos (entrega 21).
     *
     * El payload lleva IDS, no datos: entre que se encola —a las once de la
     * mañana— y que sale —a las doce— puede cambiar el precio, la zona o el
     * sitio, y lo que se manda tiene que ser lo que hay cuando sale.
     *
     * Si para cuando toca no queda ninguna fecha que contar, no se manda: una
     * fecha cancelada entre medias no es motivo para escribirle a nadie.
     */
    case 'avisos_del_dia': {
      const ids = (clave: string): string[] => {
        const v = (p as Record<string, unknown>)[clave]
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
      }

      const deLasFechas = async (lista: string[], conCierre: boolean) => {
        if (!lista.length) return []
        const { data: evs } = await admin
          .from('events')
          .select('id, format, starts_at, booking_closes_at, price_usd, city_slug, status')
          .in('id', lista)
          .eq('status', 'open')
          .order('starts_at')

        const salida = []
        for (const ev of evs ?? []) {
          const zonaDeEv = await zonaDeLaCiudad(admin, ev.city_slug)
          const { data: sedes } = await admin
            .from('event_venues')
            .select('zone_slug')
            .eq('event_id', ev.id)
          const slugs = [...new Set((sedes ?? []).map((v) => v.zone_slug).filter((z): z is string => !!z))]
          const nombres = await nombresDeZonas(admin, slugs)
          // Con el mes, como en la maqueta: en un correo que puede llevar
          // una fecha de este domingo y otra del jueves que viene, «Domingo
          // 25» a secas obliga a mirar el calendario.
          const cuandoEs = partesDe(ev.starts_at, zonaDeEv)
          salida.push({
            dia: cuandoEs
              ? `${alta(cuandoEs.dia)} ${cuandoEs.numero} de ${cuandoEs.mes}`
              : diaEnZonaAlto(ev.starts_at, zonaDeEv),
            plan: NOMBRES_DE_FORMATO[ev.format ?? ''] ?? 'Plan',
            hora: horaDe(ev.starts_at, zonaDeEv) ?? '',
            zonas: unirCon(nombres, ' y '),
            precio: ev.price_usd != null ? `${Number(ev.price_usd)} ref` : '',
            // Con la hora: «hasta mañana» sin hora deja a alguien pensando
            // que tiene el día entero cuando le quedan dos horas.
            ...(conCierre
              ? { cierra: `${cuandoCierra(ev.booking_closes_at, zonaDeEv)} a las ${horaDe(ev.booking_closes_at, zonaDeEv) ?? ''}`.trim() }
              : {}),
          })
        }
        return salida
      }

      const abiertas = await deLasFechas(ids('aperturas'), false)
      const cierran = await deLasFechas(ids('cierres'), true)
      if (!abiertas.length && !cierran.length) return { error: 'ya no queda ninguna fecha que contar' }

      // Como mucho tres aperturas; el resto se cuenta. Los plazos salen
      // todos: cada uno tiene su hora límite y no se puede resumir.
      const PRIMERAS = 3
      const sobran = Math.max(0, abiertas.length - PRIMERAS)

      /**
       * El titular, según lo que haya. Tres frases y no una plantilla con el
       * número dentro: «Se abrieron 1 fechas» es lo que sale de armarla al
       * vuelo, y el acento va en la segunda mitad.
       */
      const n = abiertas.length + cierran.length
      const titular = abiertas.length && cierran.length
        ? { titular: `${alta(enLetra(n))} ${n === 1 ? 'plan' : 'planes'}`, acento: 'en tus zonas.' }
        : cierran.length
          ? { titular: `${alta(enLetra(cierran.length))} ${cierran.length === 1 ? 'fecha' : 'fechas'}`, acento: cierran.length === 1 ? 'cierra mañana.' : 'cierran mañana.' }
          : { titular: abiertas.length === 1 ? 'Se abrió' : 'Se abrieron', acento: `${enLetra(abiertas.length)} ${abiertas.length === 1 ? 'fecha' : 'fechas'}.` }

      return {
        a,
        datos: {
          ...base,
          titular: titular.titular,
          titularAcento: titular.acento,
          resumen: `${titular.titular} ${titular.acento}`,
          hayAbiertas: abiertas.length ? 'si' : '',
          abiertas: abiertas.slice(0, PRIMERAS),
          masAbiertas: sobran ? enLetra(sobran) : '',
          hayCierran: cierran.length ? 'si' : '',
          cierran,
        },
      }
    }

    // El cupón no lleva importes a propósito: no hay ninguno. Lleva lo mismo
    // que el resto —qué fecha, dónde y cuándo se revela— y nada de banco.
    case 'puesto_con_cupon':
      return { a, datos: { ...base, cupon: (p.cupon as string) ?? '' } }

    // --- lo que se cae --------------------------------------------------
    case 'cancelacion': {
      const pago = await elPagoDe(admin, fila.profile_id, fila.event_id)
      return {
        a,
        datos: {
          ...base,
          queEra: nombreDelFormato(evento?.format),
          zona: (await nombresDeZonas(admin, evento?.zone_slug ? [evento.zone_slug] : []))[0] ?? '',
          referencia: pago.referencia,
        },
      }
    }

    case 'fecha_cancelada': {
      const pago = await elPagoDe(admin, fila.profile_id, fila.event_id)
      return { a, datos: { ...base, conCortesia: p.conCortesia === true, referencia: pago.referencia } }
    }

    /**
     * «Esta fecha se cierra mañana».
     *
     * Todo sale del evento, nada del payload: el día, la hora y cuándo cierra.
     * Si la fecha se mueve entre encolar y enviar —y el cron encola con un día
     * de margen— lo que se manda es lo de ahora, no lo de entonces.
     */
    case 'cierra_pronto': {
      const zonas = await nombresDeZonas(admin, (p.zonas as string[]) ?? [])
      const zona = await zonaDeLaCiudad(admin, evento?.city_slug)
      const cierra = cuandoCierra(evento?.booking_closes_at, zona)
      const yaTiene = await laQueYaTiene(admin, fila.profile_id, fila.event_id, zona)
      return {
        a,
        datos: {
          ...base,
          zona: zonas[0] ?? '',
          // Para poder decir «ya tienes la cena del viernes 9, esta es otra».
          // Vacio si no tiene ninguna, y entonces la frase no sale.
          yaTiene,
          // DOS FORMAS DEL MISMO DIA, y no es duplicar: `cuando` encabeza un
          // bloque y va con mayuscula; `cuandoFrase` va en mitad del asunto
          // —«El viernes 9 se cierra hoy»— y ahi la mayuscula sobra. Con una
          // sola, el asunto decia «El Viernes 9».
          cuando: diaEnZonaAlto(evento?.starts_at, zona),
          cuandoFrase: diaEnZona(evento?.starts_at, zona),
          hora: evento?.starts_at ? horaTexto(evento.starts_at) : '',
          cierra,
          CIERRA: cierra.toUpperCase(),
          // Para la push, que no tiene sitio para la frase entera: «Otra
          // cena» o «Otros drinks», por formato. El correo ya lo dice con
          // sus propias palabras.
          otra: OTRA[evento?.format ?? ''] ?? 'Otra fecha',
        },
      }
    }

    /**
     * Una cena con edad mínima, a quien la tiene.
     *
     * Esta fecha YA estaba abierta: lo nuevo no es que haya mesa, es para
     * quién es. Por eso no reutiliza `abrimos_zona`, cuya plantilla dice
     * «dijimos que te escribíamos el día que hubiera mesa en tu zona».
     *
     * Y por eso la nota de abajo cambia según la persona: a quien le falta
     * verificarse, este correo no le sirve de nada si no se lo decimos. Le
     * estamos ofreciendo apartar un puesto que todavía no puede apartar.
     */
    case 'cena_edad_minima': {
      const zona = evento?.city_slug ? await zonaDeLaCiudad(admin, evento.city_slug) : ZONA_POR_DEFECTO
      const edadMinima = evento?.age_band_min ?? 40

      // Las zonas abiertas de ESA fecha, no las que marcó la persona: lo
      // que se promete es dónde puede caer la cena.
      const { data: sedes } = await admin
        .from('event_venues')
        .select('zone_slug')
        .eq('event_id', fila.event_id ?? '')
      const nombres = await nombresDeZonas(admin, (sedes ?? []).map((v) => v.zone_slug))

      /**
       * ¿Puede apartar puesto ya, o le falta algo?
       *
       * `v_verified_profiles` es la misma vista que mira `/api/pago`, así
       * que esto no puede decir que sí a quien la ruta va a decir que no.
       */
      let lista = true
      if (fila.profile_id) {
        const { data: v } = await admin
          .from('v_verified_profiles')
          .select('id')
          .eq('id', fila.profile_id)
          .maybeSingle()
        lista = !!v
      }

      return {
        a,
        datos: {
          ...base,
          edadMinima: String(edadMinima),
          zonas: nombres.length ? unirCon(nombres, ' o ') : 'Caracas',
          cuandoCorto: evento?.starts_at ? diaCorto(evento.starts_at) : '',
          cuandoFrase: evento?.starts_at ? `Este ${diaEnZona(evento.starts_at, zona)}` : 'Esta semana',
          diaEnMayusculas: evento?.starts_at ? diaEnZonaAlto(evento.starts_at, zona).toUpperCase() : 'ESTA SEMANA',
          horaFrase: evento?.starts_at ? `A las ${horaEnLetraDe(evento.starts_at, zona)}` : '',
          cierreFrase: evento?.booking_closes_at
            ? `${cuandoCierra(evento.booking_closes_at, zona)} a las ${horaTexto(evento.booking_closes_at)}`
            : 'pronto',
          entradilla: `Esta vez la mesa es de ${edadMinima} para arriba. Seis desconocidos, todos de tu edad, en un restaurante que elegimos nosotros.`,
          /**
           * Y lo único que cambia de persona a persona.
           *
           * A quien ya está verificada se le cuenta lo que pasa después; a
           * quien no, lo que le falta. Mandarle a alguien «aparta tu puesto»
           * sin decirle que no puede todavía es ofrecerle una puerta
           * cerrada, que es el fallo que llevamos toda la semana quitando.
           */
          // El botón abre SU fecha, no la agenda a secas. Con dos cenas el
          // mismo sábado, dejarla en la lista es pedirle que adivine cuál
          // era la suya: el primero que hizo caso se apuntó a la otra en
          // ocho minutos.
          enlaceFecha: `${SITIO}/cuenta?fecha=${encodeURIComponent(fila.event_id ?? '')}`,
          nota: lista
            ? 'Si no se juntan seis, te avisamos y no se cobra nada. Nunca sentamos una mesa a medias.'
            : 'Te falta terminar de verificarte para poder apartar puesto: una foto de tu cédula y una selfie. Dos minutos, y entras.',
        },
      }
    }

    case 'abrimos_zona': {
      const zonas = await nombresDeZonas(admin, (p.zonas as string[]) ?? [])
      return {
        a,
        datos: {
          ...base,
          zona: zonas[0] ?? '',
          // La fecha corta para el bloque grande. La plantilla llevaba
          // «Sábado 21» ESCRITO A MANO, y el aforo también: «18 personas
          // apuntadas · faltan pocas plazas». Los dos salieron a gente real.
          // El día venía preparado desde aquí y la plantilla no lo usaba.
          cuandoCorto: evento?.starts_at ? diaCorto(evento.starts_at) : '',
          cuandoFrase: evento?.starts_at ? `El primero es el ${diaTexto(evento.starts_at)}.` : '',
          horaFrase: evento?.starts_at ? `A las ${horaEnLetra(evento.starts_at)}` : '',
        },
      }
    }
  }

  return { error: 'tipo desconocido' }
}

// ---------------------------------------------------------------------
// Los pedazos, cada uno con una sola consulta
// ---------------------------------------------------------------------

type Admin = ReturnType<typeof createAdminClient>

/**
 * La zona horaria de la ciudad de una fecha.
 *
 * Sin ciudad, la del producto. Es el mismo respaldo que usa el resto, y el
 * motivo por el que `ZONA_POR_DEFECTO` se llama asi: la buena es la de la
 * ciudad, esta es solo lo que queda cuando no se sabe.
 */
/**
 * La otra fecha que esta persona YA tiene, si tiene alguna.
 *
 * Existe por una confusion real: a quien tenia la cena del viernes le llego
 * «El sabado 10 se cierra hoy» y lo leyo como si hablara de la suya. El aviso
 * invita a una fecha a la que NO esta apuntada, y eso tiene que decirlo el
 * propio correo: quien ya tiene mesa no esta leyendo con el calendario
 * delante.
 *
 * La mas proxima que siga viva, y nunca la de este mismo aviso.
 */
async function laQueYaTiene(
  admin: Admin,
  perfilId: string | null,
  exceptoEvento: string | null,
  zona: string,
): Promise<string> {
  if (!perfilId) return ''

  const { data } = await admin
    .from('bookings')
    .select('event_id, events(starts_at, format, status)')
    .eq('profile_id', perfilId)
    .in('status', ['pending_payment', 'confirmed', 'attended'])

  const vivas = (data ?? [])
    .filter((b) => b.event_id !== exceptoEvento)
    .map((b) => b.events as unknown as { starts_at: string; format: string; status: string } | null)
    .filter((e): e is { starts_at: string; format: string; status: string } =>
      !!e && e.status !== 'cancelled' && new Date(e.starts_at).getTime() + FIN_CENA > Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  const suya = vivas[0]
  if (!suya) return ''
  return `${LA_DEL[suya.format] ?? 'el plan'} del ${diaEnZona(suya.starts_at, zona)}`
}

async function zonaDeLaCiudad(admin: Admin, slug: string | null | undefined): Promise<string> {
  if (!slug) return ZONA_POR_DEFECTO
  const { data } = await admin.from('cities').select('timezone').eq('slug', slug).maybeSingle()
  return data?.timezone || ZONA_POR_DEFECTO
}


/**
 * «Hoy es tu cena», por formato.
 *
 * Frase entera y no una plantilla con el nombre dentro: en español el
 * articulo y el numero cambian —«tu cena», «tus drinks»— y armarla al vuelo
 * acaba diciendo «Hoy es tu drinks». Son once, caben escritas.
 */
/**
 * «la cena», «los drinks»: el plan con su articulo, para nombrar OTRA fecha.
 *
 * Misma razon que `HOY_ES`: en español cambian el articulo y el numero, y
 * armarlo al vuelo acaba diciendo «la drinks».
 */
const LA_DEL: Record<string, string> = {
  dinner: 'la cena',
  foodie_dinner: 'la cena',
  women_dinner: 'la cena',
  drinks: 'los drinks',
  coffee: 'el café',
  brunch: 'el brunch',
  women_brunch: 'el brunch',
  walk: 'la caminata',
  hike: 'el senderismo',
  run: 'la salida a correr',
  padel: 'el pádel',
  pilates: 'el pilates',
  cycling: 'la rodada',
}

/**
 * «Otra cena», «Otros drinks»: para invitar a una fecha que NO es la suya.
 *
 * Tercera lista del mismo tipo y por el mismo motivo que las otras dos: el
 * articulo y el numero cambian con el formato, y «Otra drinks» es lo que sale
 * de armarlo al vuelo.
 */
const OTRA: Record<string, string> = {
  dinner: 'Otra cena',
  foodie_dinner: 'Otra cena',
  women_dinner: 'Otra cena',
  drinks: 'Otros drinks',
  coffee: 'Otro café',
  brunch: 'Otro brunch',
  women_brunch: 'Otro brunch',
  walk: 'Otra caminata',
  hike: 'Otro senderismo',
  run: 'Otra salida a correr',
  padel: 'Otro pádel',
  pilates: 'Otro pilates',
  cycling: 'Otra rodada',
}

const HOY_ES: Record<string, string> = {
  dinner: 'Hoy es tu cena',
  foodie_dinner: 'Hoy es tu cena',
  women_dinner: 'Hoy es tu cena',
  drinks: 'Hoy son tus drinks',
  coffee: 'Hoy es tu café',
  brunch: 'Hoy es tu brunch',
  women_brunch: 'Hoy es tu brunch',
  walk: 'Hoy es tu caminata',
  hike: 'Hoy es tu senderismo',
  run: 'Hoy toca correr',
  padel: 'Hoy es tu pádel',
  pilates: 'Hoy es tu pilates',
  cycling: 'Hoy toca rodar',
}

function nombreDelFormato(f: string | null | undefined): string {
  return NOMBRES_DE_FORMATO[f ?? ''] ?? 'Cena'
}

/**
 * El número en letra, hasta el diez.
 *
 * «Se abrieron 5 fechas» en un titular de Young Serif a cuarenta y cuatro
 * píxeles se lee como una factura. Por encima de diez vuelve la cifra, que
 * tampoco va a pasar: son las fechas que se abren en un día.
 */
const EN_LETRA = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
const enLetra = (n: number): string => EN_LETRA[n] ?? String(n)
/** «dos» → «Dos», para empezar una frase. */
const alta = (t: string): string => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)

function unirCon(xs: string[], y: string): string {
  if (xs.length <= 1) return xs[0] ?? ''
  return `${xs.slice(0, -1).join(', ')}${y}${xs[xs.length - 1]}`
}

async function nombresDeZonas(admin: Admin, slugs: string[], perfilId?: string | null): Promise<string[]> {
  let lista = slugs
  // Sin slugs en el payload se miran las suyas: es el caso de la bienvenida,
  // que se encola sin saber todavía qué contestó.
  if (!lista.length && perfilId) {
    const { data } = await admin
      .from('profile_traits')
      .select('zones')
      .eq('profile_id', perfilId)
      .maybeSingle()
    lista = (data?.zones ?? []) as string[]
  }
  if (!lista.length) return []

  const { data } = await admin.from('zones').select('slug, name').in('slug', lista)
  // En el orden en que venían, no en el que devuelva la base.
  return lista.map((s) => (data ?? []).find((z) => z.slug === s)?.name ?? s).filter(Boolean)
}

/**
 * Las dos próximas que ESTA PERSONA puede reservar.
 *
 * Lo pide el correo de «ya estás verificada» y el de «te quedaste sin
 * mesa»: los dos terminan ofreciendo lo que hay. Ofrecerle a alguien de 25
 * una cena de mayores de 40 es mandarlo a una puerta que le vamos a cerrar,
 * y en el peor momento, porque es el correo que celebra que ya puede entrar.
 *
 * `nacimiento` opcional: sin él solo se ofrecen las fechas sin banda, que es
 * la misma decisión que toma la portada cuando no sabe quién mira.
 */
async function proximasFechas(admin: Admin, nacimiento?: string | null): Promise<string[]> {
  const { data } = await admin
    .from('events')
    .select('starts_at, format, age_band_min, age_band_max, event_venues(zones(name))')
    .eq('status', 'open')
    .gt('booking_closes_at', new Date().toISOString())
    .order('starts_at')
    .limit(6)

  return (data ?? []).filter((e) => cabeEnLaFecha(nacimiento, e)).slice(0, 2).map((e) => {
    const zonas = ((e.event_venues ?? []) as unknown as { zones: { name: string } | null }[])
      .map((v) => v.zones?.name)
      .filter(Boolean)
    return [nombreDelFormato(e.format), diaTexto(e.starts_at), zonas.join(' y ')].filter(Boolean).join(' · ')
  })
}

async function textoDelMotivo(admin: Admin, codigo: string | undefined): Promise<string> {
  if (!codigo) return 'hay que repetir la foto.'
  const { data } = await admin
    .from('verification_rejection_reasons')
    .select('message')
    .eq('code', codigo)
    .maybeSingle()
  return data?.message ?? 'hay que repetir la foto.'
}

async function laMesaDe(admin: Admin, eventoId: string, perfilId: string | null) {
  if (!perfilId) return null

  const { data: fila } = await admin
    .from('table_members')
    .select('table_id, dinner_tables!inner(table_number, event_id, restaurant_id, grabacion, events!inner(grabacion), restaurants(id, name, address, maps_url, place_id, lat, lng, zone_slug, facade_photo_path))')
    .eq('profile_id', perfilId)
    .eq('dinner_tables.event_id', eventoId)
    .maybeSingle()

  if (!fila) return null

  const mesa = fila.dinner_tables as unknown as {
    table_number: number
    restaurant_id: string | null
    grabacion: boolean
    events: { grabacion: boolean } | null
    restaurants: {
      id: string
      name: string
      address: string
      maps_url: string | null
      zone_slug: string | null
      facade_photo_path: string | null
    } | null
  }

  const { data: otros } = await admin
    .from('table_members')
    .select('profile_id, seat_order, profiles(display_name, full_name)')
    .eq('table_id', fila.table_id)
    .neq('profile_id', perfilId)
    .order('seat_order')

  const { data: rasgos } = await admin
    .from('profile_traits')
    .select('profile_id, industry')
    .in('profile_id', (otros ?? []).map((o) => o.profile_id))

  // El sector se guarda con su código estable —`construccion`, `diseno`— que
  // no es lo que se lee. La etiqueta vive en las opciones de la pregunta, y
  // se resuelve ahí igual que en Mi mesa y en el panel: un mapa escrito aquí
  // sería un tercer catálogo desincronizándose a su ritmo.
  const { data: pregunta } = await admin
    .from('questions')
    .select('options, questionnaire_versions!inner(is_active)')
    .eq('key', 'sector')
    .eq('questionnaire_versions.is_active', true)
    .maybeSingle()

  const etiqueta = new Map(
    ((pregunta?.options ?? []) as { value: string; label: string }[]).map((o) => [o.value, o.label]),
  )

  const sector = new Map(
    (rasgos ?? []).map((r) => [r.profile_id, r.industry ? (etiqueta.get(r.industry) ?? r.industry) : '']),
  )
  const zonas = mesa.restaurants?.zone_slug
    ? await nombresDeZonas(admin, [mesa.restaurants.zone_slug])
    : []

  const numero = String(mesa.table_number).padStart(2, '0')
  const direccion = mesa.restaurants?.address ?? ''

  // De cuántos es una mesa en ESTA fecha. De la fecha y no de una constante:
  // `seats_per_table` se puede cambiar al abrirla, y el día que haya una de
  // cuatro a propósito esto no puede llamarla corta.
  const { data: deLaFecha } = await admin
    .from('events')
    .select('seats_per_table, reveal_at')
    .eq('id', eventoId)
    .maybeSingle()

  /**
   * ¿Y canceló alguien DE ESTA MESA después de contárnosla?
   *
   * Michael, 17-10: «el correo de 5 sigue diciendo que es de 5 porque
   * alguien canceló, ¿no? eso no cambia». Pues sí cambiaba: la frase salía
   * siempre que la mesa fuera corta, y una mesa se publica corta a propósito
   * cuando no queda nadie en espera que encaje. A esa gente le estábamos
   * contando una cancelación que no existió.
   *
   * Se sabe por el correo que se le mandó a quien canceló: su fila de
   * `table_members` ya no existe, pero `mesa_asignada` guarda en el payload
   * en qué mesa estaba. Es la misma comprobación que hace Mi mesa.
   */
  const cancelaronDeEstaMesa = await (async () => {
    if (!deLaFecha?.reveal_at) return false
    const { data: caidos } = await admin
      .from('bookings')
      .select('profile_id')
      .eq('event_id', eventoId)
      .not('cancelled_at', 'is', null)
      .gt('cancelled_at', deLaFecha.reveal_at)

    if (!caidos?.length) return false

    const { data: loSuyo } = await admin
      .from('scheduled_emails')
      .select('payload')
      .eq('event_id', eventoId)
      .eq('kind', 'mesa_asignada')
      .in('profile_id', caidos.map((c) => c.profile_id))

    return (loSuyo ?? []).some(
      (f) => String(((f.payload ?? {}) as { mesa?: unknown }).mesa ?? '') === String(mesa.table_number),
    )
  })()

  const porMesa = deLaFecha?.seats_per_table ?? 6
  const enLaMesa = (otros ?? []).length + 1

  // Si es la ÚNICA mesa de ese sitio esa noche, el número sobra: «di que vas
  // a la mesa de Aro, la 01» donde solo hay una mesa de Aro manda a buscar un
  // cartel que no existe. Lo cuenta el mismo sitio que la web y la app, para
  // que el correo y la pantalla no digan cosas distintas de la misma mesa.
  const unica = (await mesasUnicas([{ eventoId, sitioId: mesa.restaurant_id }]))
    .has(claveDeMesa(eventoId, mesa.restaurant_id))

  return {
    numero,
    sitio: mesa.restaurants?.name ?? '',
    direccion,
    zona: zonas[0] ?? '',
    // El de la ficha si lo tiene; si no, uno construido, que es mejor que un
    // botón que no lleva a ningún sitio.
    // Del mismo sitio que el de la web: `enlaceDeMapa`. Aquí se construía a
    // mano y sin la ciudad, y en `Mi mesa` de otra forma distinta también sin
    // ella. Dos botones con el mismo nombre y dos destinos.
    mapa: enlaceDeMapa(mesa.restaurants) ?? '',
    /**
     * La entrada del local (entrega 20), bajo la dirección.
     *
     * Vacío cuando ese sitio no tiene foto, y entonces la plantilla se salta
     * las dos filas: de los nueve locales la tienen cuatro, así que el correo
     * sin foto no es el caso raro.
     *
     * La misma dirección que la app y la web, de `urlDeFotoDeLocal`: una
     * firmada de Supabase caducaría, y un correo se abre tres días después.
     */
    fotoEntrada: urlDeFotoDeLocal(mesa.restaurants?.id, mesa.restaurants?.facade_photo_path) ?? '',
    mesaUnica: unica,
    comoLlegar: unica ? 'la mesa de Aro' : `la mesa de Aro, la ${numero}`,
    gente: (otros ?? []).map((o) => {
      const quien = o.profiles as unknown as { display_name: string | null; full_name: string | null } | null
      const nombre = quien?.display_name || quien?.full_name?.split(' ')[0] || '—'
      return { nombre, inicial: nombre.charAt(0), sector: sector.get(o.profile_id) ?? '' }
    }),
    /**
     * Cuántos son los OTROS, en letra. Casi siempre cinco. Casi.
     *
     * Una mesa puede salir de cinco: alguien cancela dentro de las 24 horas y
     * no queda nadie en espera que encaje, y la mesa se publica así a
     * propósito —rehacerla movería a cinco personas que ya leyeron con quién
     * cenan—. Esta misma noche hay dos.
     *
     * El correo listaba a los cuatro que había y la línea de vista previa
     * seguía diciendo «con cinco personas», que es lo primero que se lee en
     * la bandeja, antes de abrir. Y la encuesta del día siguiente lo repetía.
     * Contarlo mal en la frase y bien en la lista es peor que no contarlo:
     * obliga a contar los nombres para ver cuál de las dos es la verdad.
     */
    otros: `${EN_LETRA[(otros ?? []).length] ?? (otros ?? []).length} personas`,
    /**
     * Y si la mesa salió corta, se dice. Con el porqué.
     *
     * Una mesa es de seis —`events.seats_per_table`— y a veces sale de cinco:
     * alguien cancela dentro de las 24 horas y no queda en espera nadie que
     * encaje, y se publica así a propósito, porque rehacerla movería a cinco
     * personas que ya saben con quién cenan.
     *
     * Hasta hoy el correo no lo mencionaba: salían cuatro nombres donde se
     * esperan cinco y quien contaba no sabía si faltaba alguien por aparecer,
     * si se nos había olvidado uno o si la mesa era así. La frase es de
     * Michael (16-10) y dice las dos cosas, cuántos son y por qué: «Son
     * cinco: alguien canceló y no llegamos a sentar a nadie más».
     *
     * Vacía cuando la mesa está completa, y entonces la plantilla se salta la
     * fila entera. Lo normal es que esté completa.
     */
    mesaCorta: !(enLaMesa > 0 && enLaMesa < porMesa)
      ? ''
      : cancelaronDeEstaMesa
        ? `Son ${EN_LETRA[enLaMesa] ?? enLaMesa}: alguien canceló y no llegamos a sentar a nadie más.`
        // Sin cancelación, la mesa salió así: se dice cuántos son y ya. La
        // frase de antes le achacaba a alguien una cancelación inventada.
        : `Son ${EN_LETRA[enLaMesa] ?? enLaMesa}, y esta vez no llegamos a seis.`,
    /**
     * Si esa noche grabamos en ESTA mesa.
     *
     * La marca la pone operación al armar la mesa, y la fecha entera puede
     * encenderla también. La plantilla se salta el bloque cuando está vacío:
     * un aviso de grabación en una mesa donde no hay cámara es ruido, y la
     * vez que sí haya cámara ya nadie lo lee.
     */
    grabamos: mesa.grabacion || mesa.events?.grabacion ? 'si' : '',
  }
}

async function elPagoDe(admin: Admin, perfilId: string | null, eventoId: string | null) {
  const vacio = { referencia: '—', montoLocal: '—', montoUsd: '—', tasa: '—' }
  if (!perfilId) return vacio

  const consulta = admin
    .from('payments')
    .select('amount_usd, amount_local, fx_rate, datos, reference_code, booking_id, bookings(event_id)')
    .eq('profile_id', perfilId)
    .order('created_at', { ascending: false })
    .limit(1)

  const { data } = await consulta
  const pago = (data ?? [])[0]
  if (!pago) return vacio

  // Si el correo es de una fecha concreta y el último pago es de otra, no se
  // enseña: un importe que no es el suyo es peor que un guión.
  if (eventoId) {
    const dela = (pago.bookings as unknown as { event_id: string } | null)?.event_id
    if (dela && dela !== eventoId) return vacio
  }

  const datos = (pago.datos ?? {}) as Record<string, unknown>
  // De su columna, con respaldo en `datos.ref` para los pagos de antes de que
  // se empezara a escribir. Buscaba `datos.referencia`, `datos.codigo` y
  // `datos.telefono`, tres claves que NINGÚN método usa —los campos se llaman
  // `ref`, `tel` y `banco`—, así que el comprobante decía «Referencia: —»
  // siempre. Y dos líneas más abajo el mismo correo le pide que lo guarde
  // «por si algo no cuadra»: le pedíamos guardar el comprobante sin el único
  // dato con el que se cuadra algo.
  const ref = pago.reference_code ?? datos.ref

  return {
    referencia: ref != null ? String(ref) : '—',
    montoLocal: bs(pago.amount_local),
    montoUsd: usd(pago.amount_usd),
    tasa: pago.fx_rate != null ? Number(pago.fx_rate).toLocaleString('es-VE', { maximumFractionDigits: 2 }) : '—',
  }
}

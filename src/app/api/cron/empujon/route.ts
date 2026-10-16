import { NextResponse } from 'next/server'

import { ciudades } from '@/lib/ciudades'
import { encolar } from '@/lib/correos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El correo de quien se quedó a medias.
 *
 * Antes salía a los cinco segundos de dejar el correo, mientras la persona
 * estaba en la pantalla siguiente haciendo justo lo que el correo le pedía.
 * Ahora el disparador no es en qué fase estás, sino **si te paraste**. Quien
 * lo hace todo de una sentada no recibe nada.
 *
 * TRES silencios, el mismo correo con palabras distintas:
 *
 *   - dejó su dirección y no llegó a tener cuenta        → `perfil`
 *   - tiene cuenta y dejó el cuestionario a medias       → `preguntas`
 *   - terminó el perfil y no ha subido nada para verificarse → `verificacion`
 *
 * `preguntas` es nuevo y era un hueco de verdad: el empujón cubría el
 * escalón de antes y el de después, y a quien se paraba justo en el medio no
 * le llegaba nada nunca. Eran diez personas reales, varias paradas desde
 * hacía más de una semana.
 */

export const dynamic = 'force-dynamic'

type Falta = 'perfil' | 'preguntas' | 'verificacion' | 'rechazo' | 'media_foto'

/**
 * Cuántas horas de silencio antes de cada ola, por estado.
 *
 * **La de verificación son DOS**, y la primera vuelve a la hora.
 *
 * Estuvo en una hora, se midió, y el resultado fue que de 29 personas que
 * recibieron el empujón de «te falta verificarte» 26 no subieron la cédula
 * nunca. De ahí salió moverlo a veinticuatro.
 *
 * Esa conclusión estaba mal, y la culpa era de este fichero solo a medias:
 * **aquel correo decía lo que no era**. La plantilla nunca tuvo la rama que
 * su propio comentario prometía, así que a quien solo le faltaba la cédula
 * le llegaba, con el asunto «Tienes puesto», una segunda bienvenida que le
 * pedía terminar un perfil que ya estaba terminado. No se midió el momento:
 * se midió un correo equivocado. Mover la hora no podía arreglar eso.
 *
 * Y lo que sí sabemos del momento apunta al revés: entre terminar el perfil
 * y subir la cédula la mediana es de DOS MINUTOS y el p90 de diez. Esto se
 * gana o se pierde en la primera media hora, no al día siguiente.
 *
 * Así que la primera ola vuelve a la hora —con el correo ya corregido— y la
 * segunda se queda a las veinticuatro para quien no volvió con la primera.
 * Dos y se acabó: insistir es lo que convierte un recordatorio en spam.
 */
const OLAS: Record<Falta, number[]> = {
  perfil: [24],
  preguntas: [24],
  verificacion: [1, 24],
  /**
   * El rechazo espera UN DÍA, y una sola vez.
   *
   * Estuvo en dos, y no había con qué defenderlo: han existido CINCO
   * rechazos en toda la historia del club, de cuatro personas, los cuatro
   * esta noche, y ninguna ha vuelto todavía. Cero datos. Los dos días
   * salieron de un razonamiento —«no le pises el correo de rechazo que
   * acaba de recibir»— y ese razonamiento ya lo cubre el silencio de veinte
   * horas, que es independiente de esta cuenta.
   *
   * Lo único medido que se le parece dice lo contrario: entre terminar el
   * perfil y subir la cédula la mediana son dos minutos. Quien va a repetir
   * una foto no tarda día y medio en decidirse, y a los dos días el correo
   * llega cuando la persona ya cerró el asunto.
   *
   * A la hora no, eso sí: al rechazar sale ya un correo con el motivo, y
   * uno detrás sería repetirle lo que acaba de leer.
   */
  rechazo: [24],
  /**
   * Subió UNA de las dos fotos y se quedó ahí. A LA HORA.
   *
   * Era el agujero más silencioso del embudo: esa persona no sale en la cola
   * de revisión —la cola exige las dos fotos, a propósito, para no decidir
   * sobre una que todavía se está subiendo— y tampoco recibía el empujón de
   * verificación, porque la condición era «¿subió algo?» y ella sí había
   * subido algo. Nadie la veía y nadie le escribía.
   *
   * Lo puse en TRES horas por prudencia y estaba mal. Con 250 personas que
   * subieron las dos, el hueco entre una foto y la otra es:
   *
   *   mediana 0,9 min · p90 2,9 · p95 3,9 · p99 38
   *   el 96% ha terminado a los 5 minutos · el 99% a la media hora
   *
   * A la hora solo quedan DOS de 250 en mitad del trámite. A las tres horas
   * quedan las mismas dos. O sea: las tres horas no ahorraban una sola
   * molestia y le costaban dos horas de silencio a quien sí se quedó fuera.
   *
   * Menos de una hora no se puede: el cron pasa cada hora en punto.
   */
  media_foto: [1],
}

/**
 * Y un tope por arriba: catorce días.
 *
 * El empujón es «te acabas de parar», y ese correo deja de ser verdad en
 * algún momento. A quien se apuntó hace seis semanas y no volvió no se le
 * escribe «sigues donde lo dejaste»: eso es una campaña de reactivación,
 * que es otro correo, otra decisión y otra persona quien la toma.
 *
 * Sin este tope, el día que se toca una ola o se añade un estado, la
 * primera pasada escribe de golpe a todo el que lleve meses parado. Hoy
 * eso serían unas sesenta personas en un solo minuto, sin que nadie lo
 * haya pedido.
 */
const MAXIMO_DIAS = 14

/**
 * Y que un empujón no se sobreponga a otro.
 *
 * Los estados son excluyentes —nadie está parado en dos sitios a la vez—
 * pero se encadenan: quien recibe «te falta un paso», sube la cédula y se
 * la rechazamos pasa a `rechazo`, y sin esto recibiría dos empujones y el
 * correo de rechazo en el mismo día.
 *
 * VEINTE HORAS entre dos cualesquiera. Deja pasar el par que sí queremos
 * —la ola de 1 h y la de 24, que van a 23 h de distancia— y corta todo lo
 * que caiga más cerca.
 */
const SILENCIO_ENTRE_EMPUJONES = 20

/**
 * Y un tope duro: TRES en toda la vida de una cuenta.
 *
 * Las horas sueltas se pueden tocar sin querer, y entonces no queda nada
 * que impida que alguien reciba un empujón tras otro durante semanas. Esto
 * no depende de ninguna cuenta: a la cuarta, no.
 */
const MAXIMO_POR_PERSONA = 3

/**
 * Y no a cualquier hora.
 *
 * El cron corre cada hora para que «una hora» signifique una hora; con una
 * pasada diaria, quien se paraba a las tres de la tarde recibia el empujon
 * al dia siguiente. Pero correr cada hora significa tambien que alguien que
 * abandona a las dos de la madrugada recibe un correo a las tres, y eso no
 * es diligencia: es despertar a alguien para pedirle que rellene un
 * formulario.
 *
 * De ocho de la mañana a nueve de la noche, hora de Caracas. Quien se para
 * de noche lo recibe al despertar, que es cuando podia hacer algo con el.
 */
const DESDE_CARACAS = 8
const HASTA_CARACAS = 21

/** Caracas va cuatro horas por detras de UTC, y no cambia con la estacion. */
function horaEnCaracas(d: Date): number {
  return (d.getUTCHours() + 24 - 4) % 24
}

const HORA = 3600_000

type Candidato = {
  falta: Falta
  /** Desde cuándo está parado. En ISO. */
  desde: string
  /** Para `media_foto`: cuál de las dos le falta. */
  detalle?: string
  /** Para `encolar` y para la clave de repetición. */
  perfil?: string
  correo?: string
  ciudad?: string
}

/**
 * Qué ola le toca, si le toca alguna.
 *
 * La MAYOR de las que ya vencieron, y solo si esa no se mandó. Así quien
 * cruza las veinticuatro horas recibe la segunda y no la primera con
 * retraso, y quien ya pasó las dos no recibe nada.
 */
function olaPendiente(
  c: Candidato,
  ahora: number,
  hechos: Set<string>,
  antiguos: Set<string>,
  ultimo: Map<string, number>,
  cuantos: Map<string, number>,
): number | null {
  const clave = c.perfil ?? c.correo ?? ''

  // Ni encima de otro ni sin fin. Los dos candados antes que nada: lo que
  // se decida después no puede saltárselos.
  if ((cuantos.get(clave) ?? 0) >= MAXIMO_POR_PERSONA) return null
  const anterior = ultimo.get(clave)
  if (anterior !== undefined && (ahora - anterior) / HORA < SILENCIO_ENTRE_EMPUJONES) return null
  // Quien recibió un empujón de este estado ANTES de que hubiera olas no
  // vuelve a recibir ninguna. Su fila no dice de qué ola era, y la duda se
  // resuelve del lado de no volver a escribirle.
  if (antiguos.has(`${clave}|${c.falta}`)) return null

  const edad = (ahora - new Date(c.desde).getTime()) / HORA
  if (edad > MAXIMO_DIAS * 24) return null

  const vencidas = OLAS[c.falta].filter((h) => edad >= h)
  const ola = vencidas[vencidas.length - 1]
  if (ola === undefined) return null
  return hechos.has(`${clave}|${c.falta}|${ola}`) ? null : ola
}

async function empujar(seco: boolean) {
  const hora = horaEnCaracas(new Date())
  if (!seco && (hora < DESDE_CARACAS || hora >= HASTA_CARACAS)) {
    return NextResponse.json({ fuera_de_hora: hora, perfil: 0, preguntas: 0, verificacion: 0, rechazo: 0, media_foto: 0 })
  }

  const admin = createAdminClient()
  const ahora = Date.now()
  const masViejo = new Date(ahora - MAXIMO_DIAS * 24 * HORA).toISOString()

  // A quién se le empujó ya. Se pregunta una vez, no una por persona.
  //
  // Por `empujon`, no por `bienvenida`. Preguntando por la bienvenida esto
  // descartaba a TODO el que se hubiera dado de alta —el alta encola la suya
  // en el segundo cero—, que es exactamente todo el mundo.
  const { data: yaEmpujados } = await admin
    .from('scheduled_emails')
    .select('email, profile_id, payload, send_at')
    .eq('kind', 'empujon')

  const hechos = new Set<string>()
  const antiguos = new Set<string>()
  /** Cuándo fue el último empujón de cada persona, sea del estado que sea. */
  const ultimo = new Map<string, number>()
  /** Y cuántos lleva en total. */
  const cuantos = new Map<string, number>()
  for (const r of yaEmpujados ?? []) {
    const p = (r.payload ?? {}) as { falta?: string; ola?: number }
    const clave = r.profile_id ?? r.email
    if (!clave || !p.falta) continue
    if (p.ola === undefined) antiguos.add(`${clave}|${p.falta}`)
    else hechos.add(`${clave}|${p.falta}|${p.ola}`)
    cuantos.set(clave, (cuantos.get(clave) ?? 0) + 1)
    const cuando = new Date(r.send_at).getTime()
    if (!Number.isNaN(cuando)) ultimo.set(clave, Math.max(ultimo.get(clave) ?? 0, cuando))
  }

  /**
   * Qué motivos de rechazo dejan volver a intentarlo.
   *
   * Los dos de sospecha NO, y eso no es un detalle: a quien rechazamos por
   * sospecha de suplantación se le dijo que nos escribiera, y mandarle un
   * «repite la foto» tres días después sería contradecir lo que ya le
   * dijimos y pedirle que lo intente otra vez.
   */
  const { data: catalogoMotivos } = await admin
    .from('verification_rejection_reasons')
    .select('code, allows_retry')
  const seRepite = new Set(
    (catalogoMotivos ?? []).filter((m) => m.allows_retry).map((m) => m.code),
  )

  const candidatos: Candidato[] = []

  /**
   * Las ciudades abiertas, para no empujar a quien no podemos sentar.
   *
   * A quien dice en la puerta que está en Valencia se le promete una cosa
   * —«te escribimos el día que abramos»— y este cron le mandaba la
   * contraria dos días después: «termina tu perfil y reserva», sobre una
   * ciudad donde no hay ni fechas ni zonas. Dos correos nuestros
   * contradiciéndose es peor que no escribir ninguno.
   *
   * Su perfil sigue pudiendo completarse —el botón está en el final de la
   * puerta y nadie se lo quita—; lo que no hacemos es perseguirlo por algo
   * que todavía no le sirve.
   */
  const abiertas = new Set((await ciudades()).filter((c) => c.abierta).map((c) => c.slug))

  // --- 1. dejó su correo y no llegó a tener cuenta ----------------------
  const { data: aMedias } = await admin
    .from('waitlist')
    .select('email, city_slug, created_at')
    .is('converted_profile_id', null)
    .gt('created_at', masViejo)

  for (const l of aMedias ?? []) {
    if (!l.email) continue
    if (!abiertas.has(l.city_slug ?? 'caracas')) continue
    candidatos.push({
      falta: 'perfil',
      desde: l.created_at,
      correo: l.email,
      ciudad: l.city_slug ?? 'caracas',
    })
  }

  // --- 2 y 3. los que tienen cuenta ------------------------------------
  //
  // `es_prueba` fuera, y aquí y no en `encolar`: la cuenta del revisor de
  // Apple está marcada de prueba y TIENE que recibir sus correos para que
  // la revisión funcione. El candado va en lo que no es imprescindible, que
  // es esto, no en la puerta por donde salen también los acuses.
  //
  // Sin este filtro la primera pasada le habría escrito a los catorce
  // robots de Google Play, que están parados en el cuestionario desde hace
  // días con cuentas de Gmail de verdad.
  const { data: conCuenta } = await admin
    .from('profiles')
    .select('id, status, created_at')
    .in('status', ['pending_questionnaire', 'pending_verification'])
    .eq('es_prueba', false)
    .is('deleted_at', null)
    .gt('created_at', masViejo)

  for (const p of conCuenta ?? []) {
    if (p.status === 'pending_verification') {
      const { data: suyas } = await admin
        .from('verifications')
        .select('kind, status, rejection_reason, reviewed_at, created_at')
        .eq('profile_id', p.id)
        .neq('status', 'expired')
        .order('created_at', { ascending: false })

      /**
       * ¿Tiene las DOS, o solo una?
       *
       * Con las dos, está esperando a que alguien la mire y no hay nada que
       * empujar. Con una, está a medias y nadie se lo ha dicho.
       */
      const vivas = (suyas ?? []).filter((v) => v.status === 'pending' || v.status === 'approved')
      const tiene = new Set(vivas.map((v) => v.kind))

      if (tiene.size >= 2) continue

      /**
       * El RECHAZO manda sobre «te falta una foto», y el orden importa.
       *
       * A quien le rechazamos la cédula le queda una sola foto viva —la
       * selfie— así que cae en los dos sitios. Y «subiste una de las dos y
       * nos falta tu cédula» es falso para ella: la subió, y se la
       * rechazamos nosotros. Decírselo así sería contarle su propia
       * historia al revés, que es justo el fallo que llevo todo el día
       * quitando de estos correos.
       *
       * Su estado es `rechazo`, que ya existe y sale a las 24 h con el
       * motivo de verdad.
       */
      const rechazadaPrimero = (suyas ?? []).find((v) => v.status === 'rejected')

      if (tiene.size === 1 && !rechazadaPrimero) {
        const desde = vivas.map((v) => v.created_at).sort()[0]
        candidatos.push({
          falta: 'media_foto',
          desde,
          perfil: p.id,
          // Cuál le falta, para que el correo lo diga y no lo adivine.
          detalle: tiene.has('id_document') ? 'selfie' : 'cedula',
        })
        continue
      }

      /**
       * Y si lo subió y se lo rechazamos, el correo es OTRO.
       *
       * Sin esto caía en `verificacion` y recibía «no has subido nada ·
       * ya nos contaste de qué hablas», que a quien ha subido su cédula
       * dos veces y se la hemos rechazado dos veces no solo es falso: es
       * ofensivo. Hoy mismo había una persona así en la lista de mañana.
       */
      const rechazada = (suyas ?? []).find((v) => v.status === 'rejected')
      if (rechazada) {
        if (!rechazada.rejection_reason || !seRepite.has(rechazada.rejection_reason)) continue
        candidatos.push({
          falta: 'rechazo',
          desde: rechazada.reviewed_at ?? rechazada.created_at,
          perfil: p.id,
        })
        continue
      }

      candidatos.push({ falta: 'verificacion', desde: p.created_at, perfil: p.id })
      continue
    }

    // `pending_questionnaire`: tiene cuenta y le faltan preguntas.
    //
    // El reloj NO es el del alta, es el de la última respuesta que guardó.
    // Quien ayer contestó cinco y hoy tres está avanzando, y escribirle «te
    // quedaste a medias» a alguien que estuvo aquí esta mañana es decirle
    // que no nos enteramos de lo que hace.
    const { data: ultima } = await admin
      .from('answers')
      .select('answered_at')
      .eq('profile_id', p.id)
      .order('answered_at', { ascending: false })
      .limit(1)

    const desde = ultima?.[0]?.answered_at ?? p.created_at
    candidatos.push({ falta: 'preguntas', desde, perfil: p.id })
  }

  // --- a encolar -------------------------------------------------------
  //
  // `repetidos` cuenta lo que chocó con el índice. Sin él, este cron informa
  // de lo que intentó y no de lo que hizo, que es como estuvo diez días
  // diciendo que empujaba a gente sin encolar una sola fila.
  const cuenta: Record<Falta, number> = { perfil: 0, preguntas: 0, verificacion: 0, rechazo: 0, media_foto: 0 }
  const enSeco: { falta: Falta; ola: number; quien: string; horasParado: number }[] = []
  let repetidos = 0

  for (const c of candidatos) {
    const ola = olaPendiente(c, ahora, hechos, antiguos, ultimo, cuantos)
    if (ola === null) continue

    if (seco) {
      enSeco.push({
        falta: c.falta,
        ola,
        quien: c.perfil ?? c.correo ?? '?',
        horasParado: Math.round((ahora - new Date(c.desde).getTime()) / HORA),
      })
      cuenta[c.falta]++
      continue
    }

    const destino = c.perfil ? { perfil: c.perfil } : { correo: c.correo as string }
    const r = await encolar(
      destino,
      'empujon',
      { falta: c.falta, ola, ...(c.ciudad ? { ciudad: c.ciudad } : {}), ...(c.detalle ? { cual: c.detalle } : {}) },
      /**
       * A la cola, no en el acto.
       *
       * `encolar` manda al momento cuando no se le da hora, y eso está bien
       * para lo que contesta a algo que la persona acaba de hacer: quien
       * sube su cédula y no recibe nada en quince minutos piensa que no
       * funcionó. El empujón es lo contrario: nadie lo está esperando.
       *
       * Y con sesenta destinatarios cada envío en línea es una pasada
       * entera de la cola DENTRO de este cron. Sesenta pasadas seguidas es
       * quedarse sin tiempo de función a mitad de la lista. Noventa
       * segundos lo deja para la pasada de la cola, que es de quien es ese
       * trabajo y que ya movió casi quinientos correos en un día.
       */
      { cuando: new Date(Date.now() + 90_000) },
    )
    if (r === 'encolado') cuenta[c.falta]++
    else repetidos++
  }

  return NextResponse.json({ ...cuenta, repetidos, ...(seco ? { seco: true, enSeco } : {}) })
}

/**
 * Mismo candado que los otros dos crones, y la misma pasada en seco.
 *
 * `?seco=1` calcula a quién le tocaría y no escribe nada. Es la regla de la
 * casa para cualquier cron que encole, y aquí hacía falta más que en
 * ninguno: este fichero es el único que le escribe a gente que no ha hecho
 * nada para recibir un correo.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  return empujar(new URL(request.url).searchParams.get('seco') === '1')
}

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Las notificaciones push.
 *
 * **No tienen cola propia.** Viajan en la misma fila de `scheduled_emails`
 * que el correo: el mismo destinatario, el mismo tipo, el mismo `send_at` y
 * el mismo índice de «uno por persona y fecha». Una segunda cola en paralelo
 * serían dos ideas distintas de cuándo se avisa a alguien, y eso en este
 * repositorio ya costó caro dos veces —el precio escrito a mano en siete
 * sitios, las horas de cierre en cinco—.
 *
 * De ahí se hereda gratis lo que más trabajo costó: las preferencias de
 * «Cómo te escribimos» ya se miraron al encolar, los imprescindibles se
 * mandan aunque la persona esté de baja, y lo que no se encoló no se manda
 * por ningún canal.
 *
 * Quien se dio de baja de los correos tampoco recibe push. No es lo mismo
 * —son dos canales— pero lo que pidió esa persona fue que dejáramos de
 * escribirle, y mandarle por el teléfono lo que acaba de apagar por correo
 * sería buscarle la vuelta a su decisión.
 */

/** La API de Expo. Acepta hasta cien mensajes por llamada. */
const EXPO = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECIBOS = 'https://exp.host/--/api/v2/push/getReceipts'
const POR_LOTE = 100

export type Token = {
  id: string
  token: string
}

/**
 * Lo que se ve en la pantalla bloqueada.
 *
 * Corto y neutro a propósito: una push se lee de un vistazo y sin abrir. Lo
 * que NO lleva es nada que no deba verse sin desbloquear el teléfono —el
 * restaurante antes de la revelación, el nombre de quien te reportó— porque
 * una notificación se enseña sola encima de la pantalla.
 *
 * `null` significa que ese tipo no manda push. La mayoría no: un acuse de
 * pago en revisión o un «te faltan preguntas» no merecen vibrar un teléfono,
 * y una push que no aporta es la que hace que se apaguen todas.
 */
type Copy = { titulo: string; cuerpo: string; ruta?: string }

export function copyDe(
  tipo: string,
  datos: Record<string, unknown>,
): Copy | null {
  const t = (clave: string, porDefecto = '') => {
    const v = datos[clave]
    return typeof v === 'string' && v ? v : porDefecto
  }

  switch (tipo) {
    case 'mesa_asignada':
      return {
        titulo: 'Ya sabes con quién cenas',
        cuerpo: 'Tu mesa está abierta: el sitio, la hora y los otros cinco.',
        ruta: '/mesa',
      }
    case 'recordatorio': {
      // SALE A LAS NUEVE DE LA MAÑANA, antes de la revelación, y decía «abre
      // tu mesa para ver dónde es y cómo llegar»: a esa hora no hay nada que
      // abrir. Prometer algo que no está es la forma más rápida de que la
      // siguiente notificación no se abra.
      //
      // Y por su nombre: «Hoy es tu cena» o «Hoy son tus drinks», no «cena»
      // siempre. Sale del mismo sitio que el correo, así que los dos canales
      // dicen lo mismo del mismo plan.
      const revelaA = t('revelaA')
      return {
        titulo: t('tituloHoy', 'Hoy es tu plan'),
        cuerpo: t('yaRevelado')
          ? 'Ya puedes ver dónde es y con quién.'
          : revelaA
            ? `A las ${revelaA} sabrás dónde y con quién.`
            : 'Hoy sabrás dónde y con quién.',
        ruta: '/mesa',
      }
    }
    case 'verificacion':
      return {
        titulo: 'Tu identidad está verificada',
        cuerpo: 'Ya puedes apartar puesto en cualquier fecha abierta.',
        ruta: '/cuenta',
      }
    case 'verificacion_rechazada':
      return {
        titulo: 'Hay que repetir una foto',
        cuerpo: 'Te contamos qué pasó y cuál repetir.',
        ruta: '/verificacion',
      }
    case 'abrimos_zona': {
      // El día y la hora los arma `correos-datos` con el reloj de la ciudad y
      // llegan ya escritos. Aquí no se vuelve a formatear nada: una segunda
      // forma de decir la fecha es una fecha que un día dirá otra cosa.
      const zona = t('zona')
      const cuando = t('cuando')
      const hora = t('hora')
      return {
        titulo: zona ? `Nueva fecha en ${zona}` : 'Nueva fecha abierta',
        cuerpo: [cuando, hora && `a las ${hora}`].filter(Boolean).join(' ') || 'Ya puedes apartar puesto.',
        ruta: '/cuenta',
      }
    }
    case 'pago_confirmado':
      return {
        titulo: 'Pago confirmado',
        cuerpo: 'Tu puesto está apartado. Te avisamos cuando se abra tu mesa.',
        ruta: '/cuenta',
      }
    case 'juego': {
      // La única que no tiene correo detrás. Y la única cuya `ruta` necesita
      // el id de la mesa: la app abre el juego DE ESA mesa, que es lo que
      // hace que los seis teléfonos vean las mismas preguntas.
      //
      // El texto es el aprobado el 10-10, y es mas flojo a proposito: la
      // version anterior —«¿Ya pidieron?» y «que una persona abra el juego y
      // lea la primera pregunta»— daba una instruccion a una mesa que puede
      // estar conversando bien y no necesitar nada. Esto lo deja donde tiene
      // que estar: ahi lo tienen, por si hace falta.
      return {
        titulo: 'Por si hace falta',
        cuerpo: 'En tu mesa tienes un juego para romper el hielo.',
        ruta: '/juego',
      }
    }
    case 'encuesta_despues':
      // El correo del dia despues ya salia; la push no, porque este tipo no
      // tenia caso aqui. Y es el aviso que mas caduca de todos: la ventana
      // para valorar son 48 horas, asi que un correo que se lee el lunes
      // llega cuando ya no se puede contestar.
      //
      // Sin decir con quien ceno ni donde: una notificacion se enseña sola
      // encima de la pantalla bloqueada.
      return {
        titulo: '¿Qué tal estuvo?',
        cuerpo: 'Cuéntanos de la cena y del sitio. Tarda un minuto.',
        ruta: '/mesa',
      }
    case 'cierra_pronto': {
      // ESTE AVISO INVITA A UNA FECHA A LA QUE LA PERSONA NO ESTA APUNTADA, y
      // esa es toda la dificultad. A quien ya tenia la cena del viernes le
      // llego «El sabado 10 se cierra hoy» y lo leyo como si hablara de la
      // suya: entendio que su propia cena se caia. En una push es peor que en
      // un correo, porque se lee de un vistazo y sin abrir nada.
      //
      // Asi que el titulo lo dice desde la primera palabra —«Otra cena»— y el
      // cuerpo nombra la que SI tiene, con su dia, para que no haya que
      // adivinar cual es cual. Quien no tiene ninguna no lee «otra»: para esa
      // persona no hay otra, y la frase seria un acertijo.
      const cuando = t('cuandoFrase')
      const cierra = t('cierra')
      const yaTiene = t('yaTiene')
      return {
        titulo: yaTiene
          ? [t('otra', 'Otra fecha'), cuando && `el ${cuando}`].filter(Boolean).join(', ')
          : cuando
            ? `Queda sitio el ${cuando}`
            : 'Queda sitio en una fecha abierta',
        cuerpo: yaTiene
          ? `Ya tienes ${yaTiene}. Esta es otra${cierra ? ` y se cierra ${cierra}` : ''}.`
          : cierra
            ? `Se cierra ${cierra}: después ya no se puede apartar puesto.`
            : 'Todavía puedes apartar puesto.',
        ruta: '/cuenta',
      }
    }
    case 'llego_tarde': {
      const quien = t('nombre')
      const min = t('minutos')
      return {
        titulo: 'Alguien de tu mesa llega tarde',
        cuerpo: quien && min
          ? `${quien} llega unos ${min} minutos tarde.`
          : 'Te esperan unos minutos más.',
        ruta: '/mesa',
      }
    }
    default:
      return null
  }
}

/** Los tokens vivos de varias personas, de una sola consulta. */
export async function tokensDe(perfiles: string[]): Promise<Map<string, Token[]>> {
  const mapa = new Map<string, Token[]>()
  if (!perfiles.length) return mapa

  const { data } = await createAdminClient()
    .from('push_tokens')
    .select('id, token, profile_id')
    .in('profile_id', perfiles)
    .is('baja_en', null)

  for (const fila of data ?? []) {
    const lista = mapa.get(fila.profile_id) ?? []
    lista.push({ id: fila.id, token: fila.token })
    mapa.set(fila.profile_id, lista)
  }

  return mapa
}

type Mensaje = {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
  channelId: 'aro'
  sound: 'default'
}

export type Salida =
  /**
   * Qué pasó con cada mensaje del lote, por token.
   *
   * No basta con «salió el lote»: si el único teléfono de una persona está
   * muerto, su aviso NO llegó, y marcar la fila como enviada es decir que sí.
   * Eso convierte «no me llegó la push» en una pregunta sin respuesta, que es
   * exactamente lo que `provider_id` arregló para el correo.
   */
  | { estado: 'hecho'; vivos: Set<string>; tickets: Map<string, string> }
  | { estado: 'error'; motivo: string }

/**
 * Manda un lote a Expo y da de baja los tokens que ya no existen.
 *
 * `DeviceNotRegistered` llega en la respuesta inmediata cuando el token es
 * inválido, y en los recibos cuando el teléfono desinstaló la app después.
 * Se miran los dos: un token muerto que nadie da de baja hace que cada envío
 * posterior arrastre un error que no es un error.
 */
async function mandarLote(mensajes: Mensaje[], porToken: Map<string, string>): Promise<Salida> {
  const clave = process.env.EXPO_ACCESS_TOKEN

  try {
    const r = await fetch(EXPO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Opcional en Expo: sin cuenta con «enhanced security» no hace falta.
        ...(clave ? { Authorization: `Bearer ${clave}` } : {}),
      },
      body: JSON.stringify(mensajes),
      signal: AbortSignal.timeout(20_000),
    })

    if (!r.ok) {
      const cuerpo = await r.text().catch(() => '')
      return { estado: 'error', motivo: `${r.status} ${cuerpo.slice(0, 160)}` }
    }

    const j = (await r.json()) as {
      data?: { status: string; id?: string; details?: { error?: string } }[]
    }

    const muertos: string[] = []
    const vivos = new Set<string>()
    const tickets = new Map<string, string>()

    ;(j.data ?? []).forEach((res, i) => {
      if (res.status === 'ok') {
        vivos.add(mensajes[i].to)
        if (res.id) tickets.set(mensajes[i].to, res.id)
        return
      }
      if (res.details?.error === 'DeviceNotRegistered') {
        const id = porToken.get(mensajes[i].to)
        if (id) muertos.push(id)
      }
    })

    if (muertos.length) await darDeBaja(muertos)

    // El recibo NO se pide aquí.
    //
    // Expo tarda minutos en tenerlo, así que preguntarlo en el mismo segundo
    // devuelve un hueco y deja la fila diciendo que no se sabe nada. Lo lee
    // `leerRecibos()` en una pasada posterior del mismo cron, que ya corre
    // cada cuarto de hora.
    return { estado: 'hecho', vivos, tickets }
  } catch (e) {
    return { estado: 'error', motivo: e instanceof Error ? e.message : 'sin respuesta' }
  }
}

/**
 * Los recibos: lo que dice Expo minutos después, cuando ya sabe si el
 * teléfono la recibió.
 *
 * El ticket solo dice que Expo la ACEPTÓ, igual que `sent_at` en el correo
 * solo dice que Resend lo aceptó. Lo que pasó después está aquí, y es donde
 * aparece el `DeviceNotRegistered` de quien desinstaló la app.
 *
 * Corre en la misma pasada del cron de correos, que ya pasa cada cuarto de
 * hora: no hace falta un cron nuevo y el retraso natural es justo el que Expo
 * pide. Solo mira filas con ticket y sin recibo, y deja un margen para no
 * preguntar por algo que todavía no existe.
 *
 * Nunca lanza: un recibo que no se puede leer no puede tumbar el envío de los
 * correos que van en la misma vuelta.
 */
const MARGEN_RECIBO = 10 * 60 * 1000

export async function leerRecibos(): Promise<number> {
  const admin = createAdminClient()

  try {
    const { data: filas } = await admin
      .from('scheduled_emails')
      .select('id, push_ticket')
      .not('push_ticket', 'is', null)
      .is('push_recibo', null)
      .lte('push_at', new Date(Date.now() - MARGEN_RECIBO).toISOString())
      .limit(100)

    if (!filas?.length) return 0

    // ticket → de qué fila y de qué token es. Sin esto, dar de baja a alguien
    // con dos teléfonos sería adivinar cuál.
    const deTicket = new Map<string, { fila: string; token: string }>()
    for (const f of filas) {
      for (const t of (f.push_ticket ?? []) as { t?: string; k?: string }[]) {
        if (t?.t && t?.k) deTicket.set(t.t, { fila: f.id, token: t.k })
      }
    }

    const ids = [...deTicket.keys()]
    if (!ids.length) return 0

    const r = await fetch(EXPO_RECIBOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) return 0

    const j = (await r.json()) as {
      data?: Record<string, { status: string; details?: { error?: string } }>
    }

    const muertos: string[] = []
    const porFila = new Map<string, string[]>()

    for (const [ticket, res] of Object.entries(j.data ?? {})) {
      const quien = deTicket.get(ticket)
      if (!quien) continue

      const dicho = res.status === 'ok' ? 'ok' : (res.details?.error ?? res.status)
      const lista = porFila.get(quien.fila) ?? []
      lista.push(dicho)
      porFila.set(quien.fila, lista)

      if (res.details?.error === 'DeviceNotRegistered') muertos.push(quien.token)
    }

    if (muertos.length) await darDeBaja(muertos)

    for (const [fila, dichos] of porFila) {
      await admin
        .from('scheduled_emails')
        .update({ push_recibo: [...new Set(dichos)].join(', ') } as never)
        .eq('id', fila)
    }

    return porFila.size
  } catch {
    // Silencio a propósito: las push ya salieron y los correos van detrás.
    return 0
  }
}

async function darDeBaja(ids: string[]): Promise<void> {
  await createAdminClient()
    .from('push_tokens')
    .update({ baja_en: new Date().toISOString() } as never)
    .in('id', ids)
}

/**
 * Manda las push de un grupo de filas de la cola.
 *
 * Devuelve, por fila, qué pasó: para escribirlo en `push_at` o en
 * `push_motivo` y poder contestar «¿por qué no me llegó?».
 *
 * En seco arma los mensajes y NO llama a Expo. Hace falta por lo mismo que en
 * los correos: no hay staging, esta base es la de producción, y una prueba
 * que vibra el teléfono de medio club no se puede deshacer.
 */
export async function mandarPush(
  filas: {
    id: string
    profile_id: string | null
    kind: string
    event_id: string | null
    datos: Record<string, unknown>
  }[],
  seco = false,
): Promise<Map<string, { ok: boolean; motivo?: string; ticket?: { t: string; k: string }[] }>> {
  const resultado = new Map<
    string,
    { ok: boolean; motivo?: string; ticket?: { t: string; k: string }[] }
  >()

  const conCopy = filas
    .map((f) => ({ fila: f, copy: f.profile_id ? copyDe(f.kind, f.datos) : null }))
    .filter((x) => {
      if (!x.fila.profile_id) {
        // Sin perfil no hay teléfono: es un correo a un lead.
        resultado.set(x.fila.id, { ok: false, motivo: 'sin_perfil' })
        return false
      }
      if (!x.copy) {
        resultado.set(x.fila.id, { ok: false, motivo: 'sin_copy' })
        return false
      }
      return true
    })

  if (!conCopy.length) return resultado

  const tokens = await tokensDe([...new Set(conCopy.map((x) => x.fila.profile_id as string))])

  const mensajes: Mensaje[] = []
  const porToken = new Map<string, string>()
  const filaDeMensaje: string[] = []

  for (const { fila, copy } of conCopy) {
    const suyos = tokens.get(fila.profile_id as string) ?? []
    if (!suyos.length) {
      resultado.set(fila.id, { ok: false, motivo: 'sin_token' })
      continue
    }

    for (const t of suyos) {
      porToken.set(t.token, t.id)
      mensajes.push({
        to: t.token,
        title: copy!.titulo,
        body: copy!.cuerpo,
        // Lo que la app usa para abrir la pantalla. `destinoDe` mira primero
        // `ruta` y si no `tipo`, así que van los dos.
        data: {
          tipo: fila.kind,
          ...(copy!.ruta ? { ruta: copy!.ruta } : {}),
          ...(fila.event_id ? { eventoId: fila.event_id } : {}),
          // La mesa, cuando el aviso es de una mesa concreta. La app la
          // necesita para abrir el juego de ESA mesa y no de otra.
          ...(typeof fila.datos.mesaId === 'string' ? { mesaId: fila.datos.mesaId } : {}),
        },
        channelId: 'aro',
        sound: 'default',
      })
      filaDeMensaje.push(fila.id)
    }
  }

  if (!mensajes.length) return resultado

  if (seco) {
    for (const id of new Set(filaDeMensaje)) resultado.set(id, { ok: true, motivo: 'seco' })
    return resultado
  }

  for (let i = 0; i < mensajes.length; i += POR_LOTE) {
    const lote = mensajes.slice(i, i + POR_LOTE)
    const idsLote = filaDeMensaje.slice(i, i + POR_LOTE)
    const r = await mandarLote(lote, porToken)

    if (r.estado === 'error') {
      for (const id of new Set(idsLote)) resultado.set(id, { ok: false, motivo: r.motivo })
      continue
    }

    // Una fila salió si llegó a ALGUNO de sus teléfonos. Con dos teléfonos y
    // uno muerto, la persona la recibió: eso es un envío. Con el único
    // muerto, no la recibió nadie y la fila lo dice.
    for (let k = 0; k < lote.length; k++) {
      const id = idsLote[k]
      const destino = lote[k].to
      const llego = r.vivos.has(destino)
      const previo = resultado.get(id)

      if (!llego) {
        if (!previo?.ok) resultado.set(id, { ok: false, motivo: 'token_muerto' })
        continue
      }

      // El ticket, atado a SU token: es con lo que el recibo sabrá después a
      // qué teléfono dar de baja si resulta que ya no existe.
      const ticket = r.tickets.get(destino)
      const tokenId = porToken.get(destino)
      const acumulado = previo?.ticket ?? []
      resultado.set(id, {
        ok: true,
        ticket: ticket && tokenId ? [...acumulado, { t: ticket, k: tokenId }] : acumulado,
      })
    }
  }

  return resultado
}

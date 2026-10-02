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
    case 'recordatorio':
      return {
        titulo: 'Es hoy',
        cuerpo: 'Abre tu mesa para ver dónde es y cómo llegar.',
        ruta: '/mesa',
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
  | { estado: 'hecho'; vivos: Set<string> }
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
    const recibos: string[] = []
    const vivos = new Set<string>()

    ;(j.data ?? []).forEach((res, i) => {
      if (res.status === 'ok') {
        vivos.add(mensajes[i].to)
        if (res.id) recibos.push(res.id)
        return
      }
      if (res.details?.error === 'DeviceNotRegistered') {
        const id = porToken.get(mensajes[i].to)
        if (id) muertos.push(id)
      }
    })

    if (muertos.length) await darDeBaja(muertos)
    if (recibos.length) await mirarRecibos(recibos, porToken, mensajes)

    return { estado: 'hecho', vivos }
  } catch (e) {
    return { estado: 'error', motivo: e instanceof Error ? e.message : 'sin respuesta' }
  }
}

/**
 * Los recibos, que es donde Expo dice si el teléfono la recibió de verdad.
 *
 * La primera respuesta solo dice que Expo aceptó el mensaje, igual que
 * `sent_at` en el correo solo dice que Resend lo aceptó. Lo que pasó después
 * está aquí, y es donde aparece el `DeviceNotRegistered` de quien desinstaló
 * la app.
 *
 * Nunca lanza: un recibo que no se puede leer no puede tumbar un envío que ya
 * salió.
 */
async function mirarRecibos(
  ids: string[],
  porToken: Map<string, string>,
  mensajes: Mensaje[],
): Promise<void> {
  try {
    const r = await fetch(EXPO_RECIBOS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) return

    const j = (await r.json()) as {
      data?: Record<string, { status: string; details?: { error?: string } }>
    }

    const muertos: string[] = []
    for (const [reciboId, res] of Object.entries(j.data ?? {})) {
      if (res.details?.error !== 'DeviceNotRegistered') continue
      // El recibo no trae el token, así que se cruza por posición: los ids
      // llegan en el mismo orden en que se mandaron los mensajes.
      const i = ids.indexOf(reciboId)
      const id = i >= 0 && mensajes[i] ? porToken.get(mensajes[i].to) : null
      if (id) muertos.push(id)
    }

    if (muertos.length) await darDeBaja(muertos)
  } catch {
    // Silencio a propósito: ya está mandada.
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
): Promise<Map<string, { ok: boolean; motivo?: string }>> {
  const resultado = new Map<string, { ok: boolean; motivo?: string }>()

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
      const llego = r.vivos.has(lote[k].to)
      const previo = resultado.get(id)
      if (llego) resultado.set(id, { ok: true })
      else if (!previo?.ok) resultado.set(id, { ok: false, motivo: 'token_muerto' })
    }
  }

  return resultado
}

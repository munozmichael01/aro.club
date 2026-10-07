import { createAdminClient } from '@/lib/supabase/admin'
import { diaYMes } from '@/lib/fechas'
import { SITIO, enviar } from '@/lib/remitente'

/**
 * Los avisos al equipo: lo que entra y nadie ha mirado todavía.
 *
 * Hasta ahora, subir la verificación o reportar un pago solo le escribía a
 * quien lo hacía. Por nuestro lado no pasaba nada: había que entrar en
 * Operación a ver si había cola. Una cola que solo se descubre mirando es una
 * cola que se descubre tarde, y estos dos son justo los que esperan a una
 * persona de verdad —uno no puede reservar hasta que le aprueben la cédula,
 * el otro ya pagó y espera a que le cuadren el pago—.
 *
 * NO SON CORREOS DE MIEMBRO, y por eso no pasan por `scheduled_emails` ni por
 * el catálogo de plantillas. Es la misma decisión que tomó `/api/fallo`, y por
 * el mismo motivo: meter un aviso interno en el catálogo lo pone en la lista
 * de correos que alguien puede recibir, y además lo sometería a las bajas de
 * correo —que son de los miembros, no nuestras—. Van sin `List-Unsubscribe`
 * a propósito: no hay de qué darse de baja, es nuestro propio buzón.
 *
 * Tampoco se encolan: un aviso de que hay cola que llega un cuarto de hora
 * después se lee como que no funciona.
 */

/**
 * A dónde.
 *
 * Al Gmail y no a `hola@aro.club` a propósito. Esa dirección es nuestra en
 * Resend y llega por su reenvío: si el reenvío se cae —y ya estuvo apagado,
 * el `receiving` del dominio sin encender— el aviso desaparece sin que nadie
 * lo note, que es exactamente lo que esto viene a arreglar. Un buzón de
 * verdad depende de una cosa menos.
 *
 * Sale por Resend igual, como todo lo que mandamos. Lo que se quita de en
 * medio es el salto de recepción, no el de envío.
 */
const AVISOS_A = process.env.CORREO_AVISOS || 'somos.aroclub@gmail.com'

/**
 * La cuenta del revisor de Apple.
 *
 * La crea `scripts/cuenta-revision.mjs` y hace el recorrido entero —sube
 * cédula y selfie, reporta un pago— porque Apple exige poder probarlo. Esos
 * movimientos llegan a la misma cola que los de verdad, y procesarlos como
 * tales es trabajo tirado: nadie va a cenar.
 *
 * Se reconoce por el correo, que es de ese guion y de nadie más.
 */
const CORREO_REVISOR = 'revision.appstore@aro.club'

const escapar = (v: string) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export type Aviso = {
  asunto: string
  titulo: string
  filas: [string, string][]
  /** A qué pantalla de Operación lleva. */
  pestana: 'verificaciones' | 'pagos'
  /** Si viene de la cuenta del revisor de Apple. */
  deRevision: boolean
}

/** El HTML, aparte del envío: así la pasada en seco enseña lo mismo que sale. */
export function componerAviso(a: Aviso): { asunto: string; html: string } {
  const filas = a.filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#566A5D;font:400 13px/1.5 -apple-system,sans-serif;vertical-align:top;white-space:nowrap">${escapar(k)}</td>` +
        `<td style="padding:6px 0;color:#14342A;font:500 13px/1.5 -apple-system,sans-serif">${escapar(v)}</td></tr>`,
    )
    .join('')

  // El aviso del revisor va ARRIBA y no en una fila más: es lo que decide si
  // esto se trabaja o se descarta, y leerlo después de haber abierto el panel
  // llega tarde.
  const marca = a.deRevision
    ? `<p style="margin:0 0 14px;padding:10px 14px;background:#F2E9D5;border-radius:10px;font:600 13px/1.5 -apple-system,sans-serif;color:#7A4B16">` +
      `Es la cuenta del revisor de Apple. No es un movimiento real: no hay a quién sentar ni dinero que cuadrar.</p>`
    : ''

  const enlace = `${SITIO}/operacion#${a.pestana}`

  const html =
    `<div style="font:400 15px/1.6 -apple-system,sans-serif;color:#14342A;max-width:640px">` +
    marca +
    `<p style="margin:0 0 16px"><strong>${escapar(a.titulo)}</strong></p>` +
    `<table cellpadding="0" cellspacing="0">${filas}</table>` +
    `<p style="margin:20px 0 0"><a href="${enlace}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#14342A;color:#FAF3E4;text-decoration:none;font:600 14px/1 -apple-system,sans-serif">Abrir en Operación</a></p>` +
    `</div>`

  return { asunto: a.deRevision ? `[revisión Apple] ${a.asunto}` : a.asunto, html }
}

/**
 * Manda el aviso, o lo devuelve sin mandarlo.
 *
 * Un fallo aquí NO tumba lo que lo disparó. Quien acaba de subir su cédula no
 * puede ver un error porque nuestro buzón esté caído: lo suyo quedó guardado,
 * y lo que falla es nuestro aviso. Se registra, que es lo que permite darse
 * cuenta.
 */
export async function mandarAviso(
  a: Aviso,
  seco = false,
): Promise<{ estado: string; asunto: string; html: string }> {
  const { asunto, html } = componerAviso(a)
  if (seco) return { estado: 'seco', asunto, html }

  try {
    const r = await enviar(AVISOS_A, asunto, html)
    if (r.estado !== 'enviado') {
      console.error(
        '[avisos] el aviso al equipo NO salió · ' +
          JSON.stringify({ estado: r.estado, asunto }),
      )
    }
    return { estado: r.estado, asunto, html }
  } catch (e) {
    console.error('[avisos] el aviso al equipo reventó', e)
    return { estado: 'error', asunto, html }
  }
}

/** Nombre y correo de alguien, para decir quién es sin que haya que buscarlo. */
async function quienEs(perfilId: string) {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('full_name, display_name, email, city_slug')
    .eq('id', perfilId)
    .maybeSingle()
  return data
}

/**
 * «Hay una verificación esperando.»
 *
 * Se llama cuando están LAS DOS —cédula y selfie—, que es cuando se puede
 * revisar. Avisar al subir la primera sería avisar dos veces de lo mismo y la
 * primera no se puede trabajar.
 */
export async function avisoDeVerificacion(
  perfilId: string,
  seco = false,
): Promise<{ estado: string; asunto: string; html: string } | null> {
  const p = await quienEs(perfilId)
  if (!p) return null

  const admin = createAdminClient()
  const { data: fotos } = await admin
    .from('verifications')
    .select('kind, created_at, status')
    .eq('profile_id', perfilId)
    .in('status', ['pending'])

  // Si ya le rechazamos una antes, decirlo: un reintento se mira distinto —se
  // comprueba si corrigió lo que se le pidió— y el motivo está en la ficha.
  const { count: rechazos } = await admin
    .from('verifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', perfilId)
    .eq('status', 'rejected')

  const nombre = p.display_name || p.full_name || p.email || 'sin nombre'
  const esRevisor = (p.email ?? '').toLowerCase() === CORREO_REVISOR

  const filas: [string, string][] = [
    ['Quién', `${nombre} · ${p.email ?? '—'}`],
    ['Entró', diaYMes((fotos ?? [])[0]?.created_at ?? new Date().toISOString())],
    ['Trae', `${(fotos ?? []).length} de 2 fotos`],
    ['Ciudad', p.city_slug ?? '—'],
  ]
  if ((rechazos ?? 0) > 0) {
    filas.push(['Reintento', `sí, ya tuvo ${rechazos} rechazo${rechazos === 1 ? '' : 's'}`])
  }

  return mandarAviso(
    {
      asunto: `Verificación pendiente · ${nombre}`,
      titulo: 'Hay una verificación esperando a que alguien la mire.',
      filas,
      pestana: 'verificaciones',
      deRevision: esRevisor,
    },
    seco,
  )
}

/**
 * «Alguien reportó un pago.»
 *
 * Solo los que hay que CUADRAR, que son los de método manual: entran en
 * `under_review` y son los que llenan la cola de Pagos. Un pago confirmado
 * solo no espera a nadie, y avisar de él sería avisar de que no hay nada que
 * hacer.
 */
export async function avisoDePago(
  pagoId: string,
  seco = false,
): Promise<{ estado: string; asunto: string; html: string } | null> {
  const admin = createAdminClient()
  // El NOMBRE del método, no su id. «pm» no le dice nada a quien abre el
  // banco a buscar la transferencia; «Pago Móvil» sí.
  const { data: pago } = await admin
    .from('payments')
    .select(
      'id, profile_id, amount_usd, amount_local, moneda, metodo, datos, status, reportado_en, payment_methods(nombre), bookings(events(starts_at, city_slug))',
    )
    .eq('id', pagoId)
    .maybeSingle()

  if (!pago) return null

  const p = await quienEs(pago.profile_id)
  const nombre = p?.display_name || p?.full_name || p?.email || 'sin nombre'
  const esRevisor = (p?.email ?? '').toLowerCase() === CORREO_REVISOR

  // La referencia es lo que operación busca en el extracto del banco, así que
  // va entera y sin recortar. Vive dentro de `datos`, que es el formulario del
  // método: cada método pide lo suyo.
  const datos = (pago.datos ?? {}) as Record<string, unknown>
  const referencia = String(datos.ref ?? datos.referencia ?? '—')

  const cena = (pago.bookings as unknown as { events: { starts_at: string } | null } | null)
    ?.events?.starts_at

  const importe =
    pago.moneda === 'VES' && pago.amount_local
      ? `${pago.amount_local} Bs · ${pago.amount_usd} USD`
      : `${pago.amount_usd} USD`

  return mandarAviso(
    {
      asunto: `Pago reportado · ${nombre}`,
      titulo: 'Alguien reportó un pago y espera a que se le cuadre.',
      filas: [
        ['Quién', `${nombre} · ${p?.email ?? '—'}`],
        ['Cena', cena ? diaYMes(cena) : '—'],
        ['Importe', importe],
        ['Referencia', referencia],
        [
          'Método',
          (pago.payment_methods as unknown as { nombre: string } | null)?.nombre ??
            String(pago.metodo ?? '—'),
        ],
      ],
      pestana: 'pagos',
      deRevision: esRevisor,
    },
    seco,
  )
}

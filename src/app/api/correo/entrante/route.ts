import { createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { enviar } from '@/lib/remitente'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Lo que la gente responde a `hola@aro.club`.
 *
 * Resend recibe el correo y lo entrega aquí. No es un buzón: es una tubería,
 * y esto es lo que hay al otro lado.
 *
 * Hace dos cosas, en este orden y no al revés:
 *
 *   1. **Lo guarda.** Antes de nada. Si el reenvío falla —Resend caído, la
 *      cuenta al límite del día— el mensaje ya está escrito y se puede
 *      reintentar. Un correo que se evapora es peor que uno que rebota,
 *      porque nadie se entera de que existió.
 *   2. **Lo reenvía** al buzón de siempre, para poder contestar desde donde
 *      se contesta todo.
 *
 * Y de paso lo ata a un perfil si quien escribe es alguien nuestro. Eso es lo
 * que hace que esto valga más que un reenviador: una respuesta al correo de
 * una mesa es información sobre esa mesa, y en una bandeja personal no la ve
 * el resto del equipo.
 *
 * **Siempre responde 200**, salvo que la firma no cuadre. Un webhook que
 * devuelve error hace que el proveedor reintente, y reintentar algo que ya
 * guardamos solo duplica. Si algo falla por dentro, se anota y se sigue.
 */

/** A dónde se reenvía. Sin esto se guarda igual, pero no sale a ningún lado. */
const BUZON = process.env.CORREO_REENVIO ?? ''

/**
 * Comprueba la firma del webhook (esquema Svix, que es el que usa Resend).
 *
 * Sin esto, cualquiera que sepa la URL puede meternos correos inventados en
 * la base y hacer que se los reenviemos a quien quiera. La ruta es pública
 * por definición —tiene que serlo para que Resend la llame— así que la firma
 * es lo único que separa un mensaje de verdad de uno fabricado.
 */
function firmaValida(cuerpo: string, cabeceras: Headers): boolean {
  const secreto = process.env.RESEND_WEBHOOK_SECRET
  // Sin secreto configurado no se acepta nada. Preferimos no recibir a
  // recibir cualquier cosa: lo primero se nota, lo segundo no.
  if (!secreto) return false

  const id = cabeceras.get('svix-id')
  const ts = cabeceras.get('svix-timestamp')
  const firmas = cabeceras.get('svix-signature')
  if (!id || !ts || !firmas) return false

  // Cinco minutos de margen: sin esto, quien capture una petición válida
  // puede repetirla mañana.
  const edad = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(edad) || edad > 300) return false

  const clave = Buffer.from(secreto.replace(/^whsec_/, ''), 'base64')
  const esperada = createHmac('sha256', clave).update(`${id}.${ts}.${cuerpo}`).digest('base64')

  // La cabecera puede traer varias, separadas por espacio y con su versión.
  return firmas.split(' ').some((f) => {
    const valor = f.startsWith('v1,') ? f.slice(3) : f
    const a = Buffer.from(valor)
    const b = Buffer.from(esperada)
    return a.length === b.length && timingSafeEqual(a, b)
  })
}

/** La primera dirección que aparezca, venga como venga. */
function direccionDe(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return direccionDe(v[0])
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return String(o.email ?? o.address ?? o.value ?? '')
  }
  return ''
}

/** Solo el correo, sin el «Nombre Apellido <…>» de alrededor. */
function soloCorreo(v: string): string {
  const m = v.match(/<([^>]+)>/)
  return (m ? m[1] : v).trim().toLowerCase()
}

export async function POST(request: Request) {
  const cuerpo = await request.text()

  if (!firmaValida(cuerpo, request.headers)) {
    // 401 y no 404: aquí sí interesa que el proveedor sepa que le rechazamos
    // por firma, porque es un fallo de configuración que hay que ver.
    return new NextResponse(null, { status: 401 })
  }

  let evento: Record<string, unknown>
  try {
    evento = JSON.parse(cuerpo)
  } catch {
    return NextResponse.json({ ok: true, nota: 'cuerpo ilegible' })
  }

  // El payload real de Resend puede traer los campos en la raíz o dentro de
  // `data`. Se miran los dos y se guarda el crudo entero: si mañana hace
  // falta un campo que hoy no extraemos, está ahí y no hay que pedirle a
  // nadie que vuelva a escribir.
  const d = (evento.data ?? evento) as Record<string, unknown>

  const de = soloCorreo(direccionDe(d.from))
  if (!de) return NextResponse.json({ ok: true, nota: 'sin remitente' })

  const admin = createAdminClient()

  // ¿Es alguien nuestro? Se mira por las dos direcciones que guardamos: la
  // de la cuenta y la de contacto, que pueden ser distintas.
  const { data: perfil } = await admin
    .from('profiles')
    .select('id')
    .or(`email.eq.${de},contact_email.eq.${de}`)
    .is('deleted_at', null)
    .maybeSingle()

  const fila = {
    de,
    para: soloCorreo(direccionDe(d.to)) || null,
    asunto: typeof d.subject === 'string' ? d.subject : null,
    texto: typeof d.text === 'string' ? d.text : null,
    html: typeof d.html === 'string' ? d.html : null,
    profile_id: perfil?.id ?? null,
    proveedor_id: typeof d.email_id === 'string' ? d.email_id : (typeof d.id === 'string' ? d.id : null),
    crudo: evento as never,
  }

  const { data: guardado, error } = await admin
    .from('correos_entrantes')
    .insert(fila as never)
    .select('id')
    .maybeSingle()

  if (error) {
    // 23505 es el índice único del id del proveedor: es un reintento de algo
    // que ya tenemos, y eso no es un fallo.
    if (error.code === '23505') return NextResponse.json({ ok: true, nota: 'repetido' })
    console.error('[correo entrante] no se pudo guardar', error)
    // Se devuelve 200 igual: si devolviéramos error, reintentaría en bucle.
    return NextResponse.json({ ok: true, nota: 'no se guardó' })
  }

  // --- y ahora el reenvío ------------------------------------------------
  if (!BUZON) return NextResponse.json({ ok: true, guardado: guardado?.id, reenviado: false })

  const cabecera =
    `<div style="font:400 13px/1.6 -apple-system,sans-serif;color:#566A5D;` +
    `border-bottom:1px solid #DCD3BC;padding-bottom:10px;margin-bottom:16px">` +
    `Respuesta a <strong>${fila.para ?? 'Aro Club'}</strong> de <strong>${de}</strong>` +
    (perfil ? ' · es un miembro' : ' · no está en la base') +
    `</div>`

  const r = await enviar(
    BUZON,
    fila.asunto ? `↩ ${fila.asunto}` : `↩ Respuesta de ${de}`,
    cabecera + (fila.html || `<pre style="white-space:pre-wrap;font:400 14px/1.6 -apple-system,sans-serif">${fila.texto ?? ''}</pre>`),
  )

  await admin
    .from('correos_entrantes')
    .update({
      reenviado_at: r.estado === 'enviado' ? new Date().toISOString() : null,
      error_reenvio: r.estado === 'enviado' ? null : (r.estado === 'error' ? r.motivo : 'sin remitente'),
    } as never)
    .eq('id', guardado?.id ?? '')

  return NextResponse.json({ ok: true, guardado: guardado?.id, reenviado: r.estado === 'enviado' })
}

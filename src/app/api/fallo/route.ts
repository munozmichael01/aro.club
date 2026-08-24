import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { enviar, SITIO } from '@/lib/remitente'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Donde aterrizan los errores de JavaScript de las pantallas.
 *
 * Hasta hoy no había forma de enterarse. Un error en `/pago` deja la página en
 * blanco, la persona se va, y en los registros no hay nada: el servidor
 * devolvió 200 con el fichero. Nos enterábamos porque alguien escribiera.
 *
 * ## Nunca datos de la persona
 *
 * Ni correo, ni nombre, ni lo que haya escrito en un campo. Lo que se acepta
 * está en el esquema de abajo y es una lista cerrada: pantalla, mensaje,
 * dónde del código, navegador. Nada de lo que llegue de más se guarda, porque
 * ni siquiera se lee.
 *
 * De la IP se guarda su HUELLA, no la IP. Sirve para frenar a quien quiera
 * llenarnos el buzón y no sirve para saber quién es.
 *
 * ## Esto no puede tumbar nada
 *
 * Devuelve 204 pase lo que pase. Una ruta de registro que falla y hace que la
 * pantalla enseñe un error es peor que no tener registro: convierte un fallo
 * en dos. Todo va dentro de un `try` que se lo traga.
 *
 * ## El freno del aviso
 *
 * Una pantalla rota genera un error por VISITA. Guardar uno por visita llena
 * la tabla, y avisar por cada uno son cuatrocientos correos — y un buzón
 * inundado se ignora, que es lo mismo que no tener alerta.
 *
 * Así que una fila por error DISTINTO, con su contador, y un correo cada
 * media hora como mucho por cada error. El primero sale al momento: cuando
 * algo se rompe en producción, media hora es mucho.
 */

const cuerpo = z.object({
  // De qué pantalla. Se recorta a la ruta: una URL entera puede llevar el
  // token de un enlace de correo en la query.
  pantalla: z.string().trim().max(120),
  mensaje: z.string().trim().min(1).max(500),
  origen: z.string().trim().max(300).optional(),
  pila: z.string().trim().max(2000).optional(),
  navegador: z.string().trim().max(300).optional(),
  tipo: z.enum(['error', 'promesa']).optional(),
})

/** Cada cuánto, como mucho, un correo del MISMO error. */
const MINUTOS_ENTRE_AVISOS = 30

/** Cuántos errores distintos puede abrir una misma IP en diez minutos. */
const TOPE_POR_IP = 20
const VENTANA_IP_MIN = 10

const AVISOS_A = 'hola@aro.club'

function huellaDe(...partes: (string | undefined)[]): string {
  return createHash('sha256').update(partes.filter(Boolean).join('|')).digest('hex').slice(0, 32)
}

export async function POST(request: Request) {
  try {
    const parsed = cuerpo.safeParse(await request.json().catch(() => null))
    // Un cuerpo que no cuadra se descarta en silencio. No hay nadie leyendo
    // la respuesta: esto lo llama un `onerror`.
    if (!parsed.success) return new NextResponse(null, { status: 204 })

    const d = parsed.data
    const admin = createAdminClient()

    // `database.types.ts` es de antes de estas dos tablas, que se crearon con
    // esta entrega, así que el cliente tipado no las conoce y hay que pasarle
    // los nombres con `as never`. Es el apaño que ya usa el repo para lo que
    // va por delante de los tipos generados; se cae solo al regenerarlos.

    // La IP, en huella. `x-forwarded-for` puede traer varias: la primera es
    // la del cliente y las demás las de los proxies.
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
    const ipHuella = huellaDe(ip || 'sin-ip')

    const desde = new Date(Date.now() - VENTANA_IP_MIN * 60_000).toISOString()
    const { count } = await admin
      .from('errores_cliente_ip' as never)
      .select('*', { count: 'exact', head: true })
      .eq('ip_huella' as never, ipHuella as never)
      .gte('creado_en' as never, desde as never)

    if ((count ?? 0) >= TOPE_POR_IP) return new NextResponse(null, { status: 204 })

    // La huella del error: pantalla + mensaje + dónde. Es lo que agrupa las
    // cuatrocientas visitas de una pantalla rota en una sola fila.
    const huella = huellaDe(d.pantalla, d.mensaje, d.origen)
    const ahora = new Date().toISOString()

    const { data: filaCruda } = await admin
      .from('errores_cliente' as never)
      .select('huella, veces, avisado_en')
      .eq('huella' as never, huella as never)
      .maybeSingle()

    const ya = filaCruda as { veces: number | null; avisado_en: string | null } | null

    if (ya) {
      await admin
        .from('errores_cliente' as never)
        .update({ veces: (ya.veces ?? 0) + 1, ultima_vez: ahora } as never)
        .eq('huella' as never, huella as never)
    } else {
      await admin.from('errores_cliente' as never).insert({
        huella,
        pantalla: d.pantalla,
        mensaje: d.mensaje,
        origen: d.origen ?? null,
        pila: d.pila ?? null,
        navegador: d.navegador ?? null,
      } as never)
      await admin.from('errores_cliente_ip' as never).insert({ ip_huella: ipHuella } as never)
    }

    const veces = (ya?.veces ?? 0) + 1

    // Los Runtime Logs de Vercel. Una línea estructurada para poder filtrar:
    // con el texto suelto no se puede buscar por pantalla.
    console.error(
      '[pantalla-rota] ' +
        JSON.stringify({
          pantalla: d.pantalla,
          mensaje: d.mensaje,
          origen: d.origen,
          navegador: d.navegador,
          tipo: d.tipo ?? 'error',
          veces,
          huella,
        }),
    )

    // --- el aviso, con freno --------------------------------------------
    const ultimo = ya?.avisado_en ? new Date(ya.avisado_en).getTime() : 0
    const toca = Date.now() - ultimo > MINUTOS_ENTRE_AVISOS * 60_000

    if (toca) {
      // Se marca ANTES de mandar. Si se marcara después, dos visitas a la vez
      // pasan las dos el filtro y salen dos correos — que es el principio de
      // los cuatrocientos.
      await admin
        .from('errores_cliente' as never)
        .update({ avisado_en: ahora } as never)
        .eq('huella' as never, huella as never)

      await avisar(d, veces, huella)
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    // Se lo traga a propósito. Una ruta de registro que falla y hace que la
    // pantalla enseñe un error convierte un fallo en dos.
    console.error('[fallo] no se pudo registrar el error de pantalla', e)
    return new NextResponse(null, { status: 204 })
  }
}

/**
 * El correo interno. Sin plantilla de Design: no es un correo a un miembro,
 * es un aviso a nosotros, y meterlo en el catálogo de plantillas lo pondría
 * en la lista de correos que alguien puede recibir.
 */
async function avisar(
  d: z.infer<typeof cuerpo>,
  veces: number,
  huella: string,
): Promise<void> {
  const escapar = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const filas = [
    ['Pantalla', d.pantalla],
    ['Error', d.mensaje],
    ['Dónde', d.origen ?? '—'],
    ['Tipo', d.tipo === 'promesa' ? 'Promesa rechazada' : 'Error de JavaScript'],
    ['Veces', String(veces)],
    ['Navegador', d.navegador ?? '—'],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#566A5D;font:400 13px/1.5 -apple-system,sans-serif;vertical-align:top;white-space:nowrap">${k}</td>` +
        `<td style="padding:6px 0;color:#14342A;font:500 13px/1.5 -apple-system,sans-serif">${escapar(v)}</td></tr>`,
    )
    .join('')

  const html =
    `<div style="font:400 15px/1.6 -apple-system,sans-serif;color:#14342A;max-width:640px">` +
    `<p style="margin:0 0 4px"><strong>Una pantalla se rompió en ${escapar(d.pantalla)}.</strong></p>` +
    `<p style="margin:0 0 16px;color:#566A5D;font-size:13px">Máximo un aviso cada ${MINUTOS_ENTRE_AVISOS} minutos por error. ` +
    `Los siguientes se cuentan y no se mandan.</p>` +
    `<table cellpadding="0" cellspacing="0">${filas}</table>` +
    (d.pila
      ? `<pre style="margin:16px 0 0;padding:12px;background:#F2E9D5;border-radius:10px;overflow:auto;font:400 12px/1.5 ui-monospace,monospace;color:#2C4A38;white-space:pre-wrap">${escapar(d.pila)}</pre>`
      : '') +
    `<p style="margin:16px 0 0;color:#566A5D;font-size:12px">Huella <code>${huella}</code> · ${SITIO}</p>` +
    `</div>`

  const r = await enviar(AVISOS_A, `Pantalla rota: ${d.pantalla}`, html)

  // Se registra TODO lo que no sea «enviado», no solo el error. Sin clave de
  // Resend `enviar` devuelve `sin-remitente` sin quejarse, y mirando solo el
  // estado `error` la alerta se caía en silencio — que es exactamente el
  // fallo que esta ruta viene a arreglar, un piso más arriba.
  if (r.estado !== 'enviado') {
    console.error(
      '[fallo] el aviso NO salió · ' +
        JSON.stringify({ estado: r.estado, motivo: 'motivo' in r ? r.motivo : null, huella }),
    )
  }
}

import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { asuntoDe, pintar, type Valores } from '@/lib/plantillas'
import type { Correo } from '@/lib/correos'

/**
 * Quien manda los correos de verdad.
 *
 * Hasta ahora `scheduled_emails` era un cuaderno: se apuntaba qué habría que
 * mandar, a quién y cuándo, y no lo leía nadie. Esto es lo que faltaba al
 * otro lado.
 *
 * **Hoy no hay remitente todavía**: sin `RESEND_API_KEY` y sin el dominio
 * verificado, `enviar` no manda nada y lo dice. Eso es a propósito: el resto
 * —leer la cola, armar los datos, pintar la plantilla, marcarla enviada— se
 * puede probar entero sin mandarle un correo a nadie, y el día que exista el
 * dominio solo hace falta la variable.
 */

const DE = process.env.CORREO_DE ?? 'Aro Club <hola@aro.club>'
const CLAVE = process.env.RESEND_API_KEY
export const SITIO = process.env.NEXT_PUBLIC_SITIO ?? 'https://aro.club'

/** Qué plantilla usa cada tipo. El nombre del fichero es de Design. */
const PLANTILLA: Record<Correo, string> = {
  bienvenida: '01-bienvenida.html',
  verificacion: '02-verificacion.html',
  mesa_asignada: '03-mesa-asignada.html',
  recordatorio: '04-recordatorio.html',
  cancelacion: '05-cancelacion.html',
  pago_en_revision: '06-pago-en-revision.html',
  pago_confirmado: '07-pago-confirmado.html',
  pago_no_cuadra: '08-pago-no-cuadra.html',
  restablecer_clave: '09-restablecer-clave.html',
  verificacion_rechazada: '10-verificacion-rechazada.html',
  abrimos_zona: '11-abrimos-zona.html',
  fecha_cancelada: '12-fecha-cancelada.html',
  cuenta_lista: '13-cuenta-lista.html',
}

// Las plantillas se leen del disco una vez y se quedan: son trece ficheros
// que no cambian mientras el proceso vive.
const enMemoria = new Map<string, string>()

async function plantillaDe(tipo: Correo): Promise<string | null> {
  const fichero = PLANTILLA[tipo]
  if (!fichero) return null
  if (enMemoria.has(fichero)) return enMemoria.get(fichero) ?? null

  try {
    const ruta = path.join(process.cwd(), 'src', 'lib', 'correos-plantillas', fichero)
    const html = await readFile(ruta, 'utf8')
    enMemoria.set(fichero, html)
    return html
  } catch (e) {
    console.error('[remitente] no se pudo leer la plantilla', fichero, e)
    return null
  }
}

export type Pintado = { asunto: string; html: string }

/** Deja el correo listo para mandar, sin mandarlo. */
export async function componer(tipo: Correo, datos: Valores): Promise<Pintado | null> {
  const plantilla = await plantillaDe(tipo)
  if (!plantilla) return null

  const conBase: Valores = { sitioWeb: SITIO, ...datos }
  const html = pintar(plantilla, conBase)
  // El asunto sale del <title> ya pintado: así lleva los mismos datos que el
  // cuerpo y no puede decir una fecha distinta de la que va dentro.
  return { asunto: asuntoDe(html), html }
}

export type Resultado =
  | { estado: 'enviado'; id: string | null }
  | { estado: 'sin-remitente' }
  | { estado: 'error'; motivo: string }

/**
 * Manda. Sin clave no manda y lo dice: no se finge un envío.
 *
 * Resend, no SMTP: es lo que ya decidimos, y la cuenta gratis da 3.000 al
 * mes y 100 al día, que para Caracas con doscientos miembros sobra. Lo que
 * exige es un dominio verificado, y de ahí que esto no pueda encenderse
 * hasta que `aro.club` exista.
 */
export async function enviar(a: string, asunto: string, html: string): Promise<Resultado> {
  if (!CLAVE) return { estado: 'sin-remitente' }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLAVE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: DE, to: [a], subject: asunto, html }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!r.ok) {
      const cuerpo = await r.text().catch(() => '')
      return { estado: 'error', motivo: `${r.status} ${cuerpo.slice(0, 200)}` }
    }

    const d = (await r.json().catch(() => ({}))) as { id?: string }
    return { estado: 'enviado', id: d.id ?? null }
  } catch (e) {
    return { estado: 'error', motivo: e instanceof Error ? e.message : 'sin respuesta' }
  }
}

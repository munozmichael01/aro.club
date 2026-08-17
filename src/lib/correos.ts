import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La cola de correos, en un solo sitio.
 *
 * Estaba repetida: `/api/operacion/pagos` tenía su propia función `encolar`,
 * `/api/cancelar` y `/api/operacion/publicar` hacían el insert a mano, y tres
 * de las ocho plantillas de Design no las encolaba nadie —la de verificación
 * entre ellas, que es la que le dice a alguien que ya puede reservar—.
 *
 * **Hoy no hay remitente: esto no manda nada.** Es el registro de lo que
 * habría que mandar, con su destinatario y su momento. Cuando el remitente
 * exista, lee esta tabla y todo el recorrido ya está anotado.
 *
 * Encolar NUNCA tumba la operación que lo dispara: si la anotación falla se
 * escribe en el log y se sigue. Que alguien no reciba un correo es malo; que
 * no se le apruebe la identidad por no poder anotar el correo, peor.
 */

export type Correo =
  | 'bienvenida'
  | 'verificacion'
  | 'mesa_asignada'
  | 'recordatorio'
  | 'cancelacion'
  | 'pago_en_revision'
  | 'pago_confirmado'
  | 'pago_no_cuadra'
  // Entrega 13: el rechazo deja de ir dentro de `verificacion` con un
  // resultado en el payload. Son dos mensajes distintos —«ya puedes
  // reservar» y «repite esta foto»— y con un solo tipo el remitente tendria
  // que mirar dentro del payload para elegir plantilla.
  | 'verificacion_rechazada'
  | 'fecha_cancelada'
  | 'restablecer_clave'
  | 'abrimos_zona'
  // Entrega 14: el hueco de en medio. Alguien termina el perfil, sube la
  // cédula y la selfie —todo lo que le pedimos— y no recibía nada hasta que
  // una persona aprobara la identidad. La bienvenida es de quien se queda a
  // medias y la de verificación llega al aprobar: entre las dos había
  // silencio justo después del único paso incómodo del embudo.
  | 'cuenta_lista'

type AQuien = { perfil: string } | { correo: string }

export async function encolar(
  aQuien: AQuien,
  tipo: Correo,
  detalle: Record<string, unknown> = {},
  opciones: { eventoId?: string | null; cuando?: Date } = {},
): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from('scheduled_emails')
      .insert({
        profile_id: 'perfil' in aQuien ? aQuien.perfil : null,
        email: 'correo' in aQuien ? aQuien.correo.trim().toLowerCase() : null,
        kind: tipo,
        event_id: opciones.eventoId ?? null,
        // Por defecto ahora. El recordatorio del día de la cena es el único
        // que se programa para más tarde.
        send_at: (opciones.cuando ?? new Date()).toISOString(),
        payload: detalle as never,
      } as never)

    // 23505 es el índice único de la bienvenida: encolarla dos veces al mismo
    // correo no es un error, es la respuesta correcta a que alguien vuelva a
    // dejar su dirección.
    if (error && error.code !== '23505') {
      console.error('[correos] no se encoló', tipo, error)
      return
    }

    // Y sale ya, sin esperar al cron.
    //
    // La cola pasa cada quince minutos, y eso está bien para el recordatorio
    // de la cena —que se programa con horas de antelación— pero no para los
    // que contestan a algo que la persona acaba de hacer. Quien sube su
    // cédula y no recibe nada en quince minutos no piensa «habrá una cola»,
    // piensa que no funcionó. Se comprobó con una cuenta real: el acuse del
    // pago tardó diez minutos en salir.
    //
    // El cron no sobra: sigue siendo la red que recoge lo que falle aquí
    // —un corte de red, un límite de la cuenta— y lo que va programado para
    // más tarde. Esto solo adelanta lo inmediato.
    if (!opciones.cuando || opciones.cuando.getTime() <= Date.now()) {
      await despacharPendientes()
    }
  } catch (e) {
    console.error('[correos] no se encoló', tipo, e)
  }
}

/**
 * Manda lo que esté vencido en la cola. Lo usan el cron y `encolar`.
 *
 * Nunca lanza: encolar un correo no puede fallar porque el envío falle. Si
 * algo se tuerce, la fila se queda sin `sent_at` y el cron la recoge en la
 * siguiente vuelta, que es exactamente para lo que está.
 */
export async function despacharPendientes(): Promise<number> {
  try {
    // Se importan aquí dentro y no arriba porque `correos-datos` necesita el
    // tipo `Correo` de este mismo fichero: en la cabecera sería un ciclo.
    const [{ prepararCorreo }, { componer, enviar }] = await Promise.all([
      import('@/lib/correos-datos'),
      import('@/lib/remitente'),
    ])

    const admin = createAdminClient()
    const { data: pendientes } = await admin
      .from('scheduled_emails')
      .select('id, profile_id, email, kind, event_id, payload')
      .is('sent_at', null)
      .lte('send_at', new Date().toISOString())
      .order('send_at')
      .limit(25)

    let mandados = 0

    for (const fila of pendientes ?? []) {
      const listo = await prepararCorreo(fila as Parameters<typeof prepararCorreo>[0])

      // No se puede armar y no se va a poder mañana: se cierra para que no se
      // reintente cada cuarto de hora para siempre.
      if ('error' in listo) {
        console.error('[correos] no se pudo armar', fila.kind, listo.error)
        await admin.from('scheduled_emails')
          .update({ sent_at: new Date().toISOString() } as never).eq('id', fila.id)
        continue
      }

      // La columna admite algún `kind` sin plantilla propia —'comprobante'—,
      // así que el tipo de la base es más ancho que el de los correos. Si no
      // hay plantilla, `componer` devuelve null y se anota abajo.
      const pintado = await componer(fila.kind as Correo, listo.datos)
      if (!pintado) { console.error('[correos] sin plantilla', fila.kind); continue }

      const r = await enviar(listo.a, pintado.asunto, pintado.html)

      // Sin remitente configurado no se toca nada: la cola espera al día que
      // exista y no se pierde ninguno.
      if (r.estado === 'sin-remitente') break

      if (r.estado === 'error') {
        // Este sí se reintenta: un fallo de red se arregla solo.
        console.error('[correos] no salió', fila.kind, r.motivo)
        continue
      }

      await admin.from('scheduled_emails')
        .update({ sent_at: new Date().toISOString() } as never).eq('id', fila.id)
      if (r.estado === 'enviado') mandados++
    }

    return mandados
  } catch (e) {
    console.error('[correos] fallo despachando', e)
    return 0
  }
}

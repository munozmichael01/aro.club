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
    }
  } catch (e) {
    console.error('[correos] no se encoló', tipo, e)
  }
}

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Qué hizo operación, quién y cuándo.
 *
 * La tabla existía desde el primer día y estaba vacía: ninguna ruta escribía
 * en ella. Aprobar una identidad, confirmar un pago, despublicar unas mesas
 * —decisiones sobre personas y sobre dinero— no dejaban rastro. Con una sola
 * persona operando eso no duele; el día que sean dos, la pregunta «¿quién
 * aprobó esto?» no tiene respuesta.
 *
 * No es opcional por comodidad: es lo que permite responder a un miembro que
 * pregunta por qué le rechazamos la cédula, y lo que separa un error de una
 * sospecha.
 *
 * **Nunca falla la operación.** Si el registro no se puede escribir se anota
 * en el log del servidor y se sigue: perder la anotación de un pago que sí se
 * confirmó es malo, pero no confirmarlo por no poder anotarlo es peor.
 */

/** Lo que se puede hacer. Lista corta y explícita, no texto libre. */
export type Accion =
  | 'verificacion_aprobada'
  | 'verificacion_rechazada'
  | 'pago_confirmado'
  | 'pago_no_cuadra'
  | 'fecha_abierta'
  | 'fecha_cancelada'
  | 'mesas_publicadas'
  | 'mesas_despublicadas'
  | 'mesas_repartidas'
  | 'local_creado'
  | 'local_editado'
  | 'incidencia_resuelta'

type Entidad = 'verificacion' | 'pago' | 'evento' | 'local' | 'incidencia'

export async function anotar(
  actorId: string,
  accion: Accion,
  entidad: Entidad,
  entidadId: string | null,
  detalle: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from('ops_audit_log')
      .insert({
        actor_id: actorId,
        action: accion,
        entity: entidad,
        entity_id: entidadId,
        payload: detalle as never,
      } as never)

    if (error) console.error('[auditoria] no se anotó', accion, error)
  } catch (e) {
    console.error('[auditoria] no se anotó', accion, e)
  }
}

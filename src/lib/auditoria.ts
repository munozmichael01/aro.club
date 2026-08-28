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
  // La escribe un DISPARADOR de `events`, no una ruta: borrar una fecha se
  // hace con la clave de servicio y no pasa por el panel.
  | 'fecha_borrada'
  | 'mesas_publicadas'
  | 'mesas_despublicadas'
  | 'mesas_repartidas'
  | 'local_creado'
  | 'local_editado'
  | 'incidencia_resuelta'
  | 'acceso_concedido'
  | 'acceso_retirado'
  // Sacar los correos de los leads a un fichero es la única acción del panel
  // cuyo resultado se va del producto: a partir de ahí no controlamos ni
  // quién lo abre ni qué se manda desde él. Por eso deja rastro aunque no
  // cambie nada en la base.
  | 'leads_exportados'
  // Entrega 16. Quién vino lo marca operación, no la persona que cenó, y
  // decide `events_attended`, las reincidencias y el veto de tres meses. Un
  // dato que decide eso tiene que llevar firma: un veto sin firma no se puede
  // discutir con la persona a la que se le aplica.
  | 'asistencia_marcada'

type Entidad =
  | 'verificacion' | 'pago' | 'evento' | 'local' | 'incidencia' | 'equipo' | 'leads'
  | 'reserva'

export async function anotar(
  /**
   * Quién lo hizo, o `null` si no lo hizo una persona de operación.
   *
   * `null` es para lo que pasa SOLO: el disparador que anota una fecha
   * borrada, o el hueco de una mesa que se rellena cuando alguien cancela.
   * En esos casos no hay actor, y poner el perfil del miembro sería mentir
   * dos veces: este registro es de lo que hace OPERACIÓN, y además la clave
   * ajena `actor_id → profiles` deja ese perfil sin poder borrarse. Eso ya
   * pasó: al anotar una cancelación con el id de quien cancelaba, el guion de
   * limpieza dejó de poder borrar su cuenta de prueba.
   */
  actorId: string | null,
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

-- Y una sola vez por persona y fecha.
--
-- Va en su propia migración porque un valor nuevo de un enum no se puede usar
-- en la misma transacción en que se añade.

drop index if exists scheduled_emails_una_por_persona;

create unique index scheduled_emails_una_por_persona
  on scheduled_emails (profile_id, kind, event_id)
  where kind in ('abrimos_zona', 'recordatorio', 'fecha_cancelada', 'cierra_pronto');

comment on index scheduled_emails_una_por_persona is
  'Solo los correos que ANUNCIAN algo una vez. Los que acusan una accion '
  '—cancelar, pagar, que te asignen mesa— se pueden repetir sobre la misma '
  'fecha, porque la accion se puede repetir.';

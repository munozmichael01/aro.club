-- El aviso del segundo acto es «uno por persona y fecha», como el juego:
-- republicar una mesa no es una segunda noche, y el teléfono no tiene por qué
-- vibrar dos veces con el mismo bar.

drop index if exists scheduled_emails_una_por_persona;

create unique index scheduled_emails_una_por_persona
  on scheduled_emails (profile_id, kind, event_id)
  where kind in ('abrimos_zona', 'recordatorio', 'fecha_cancelada', 'cierra_pronto', 'juego', 'segundo_acto');

comment on index scheduled_emails_una_por_persona is
  'Solo los avisos que ANUNCIAN algo una vez, correo o push. Los que acusan '
  'una accion —cancelar, pagar, que te asignen mesa— se pueden repetir sobre '
  'la misma fecha, porque la accion se puede repetir. Un tipo nuevo que se '
  'encole una vez por persona y fecha TIENE que entrar aqui.';

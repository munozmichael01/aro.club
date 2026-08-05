-- =====================================================================
-- La lista de espera guarda tambien lo que responde el quiz de la landing.
--
-- waitlist ya tenia rootedness y zones. Faltaban los otros dos pasos del
-- quiz. Son deliberadamente mas gruesos que el cuestionario de 17
-- preguntas: aqui todavia no hay perfil ni cuenta, solo un correo y una
-- intencion. El desglose fino llega cuando la persona se registra.
-- =====================================================================

alter table waitlist
  add column formats text[] not null default '{}',
  add column conversation_topics text[] not null default '{}',
  add column quiz_completed_at timestamptz;

-- Para responder "que planes pide la gente" sin escanear la tabla entera:
-- es la pregunta que decide que formato se abre despues de las cenas.
create index waitlist_formats_gin on waitlist using gin (formats);
create index waitlist_topics_gin on waitlist using gin (conversation_topics);
create index on waitlist (rootedness);

comment on column waitlist.formats is
  'Tokens gruesos del quiz de la landing: dinner, drinks, movement, coffee. '
  '"movement" agrupa correr, senderismo, padel, pilates y ciclismo, que en el '
  'cuestionario completo si van por separado.';

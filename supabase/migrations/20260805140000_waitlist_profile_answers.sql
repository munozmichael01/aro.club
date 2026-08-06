-- =====================================================================
-- El resto del cuestionario, respondido antes de tener cuenta.
--
-- No van como columnas sueltas: son 12 preguntas hoy y pueden ser otras
-- manana, y el principio del esquema es que cambiar el cuestionario NO
-- obligue a alterar tablas. Se guardan como clave-valor, igual que en
-- `answers`, y se vuelcan ahi cuando el lead se convierte en perfil.
-- =====================================================================

alter table waitlist
  add column profile_answers jsonb not null default '{}',
  add column profile_completed_at timestamptz;

create index waitlist_profile_answers_gin on waitlist using gin (profile_answers);

comment on column waitlist.profile_answers is
  'Respuestas del bloque de perfil respondidas desde la landing, sin cuenta. '
  'Mismas claves que questions.key de la version activa. Se copian a answers '
  'cuando la persona se registra.';

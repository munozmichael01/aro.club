-- =====================================================================
-- Por que pantalla del cuestionario va quien YA tiene cuenta.
--
-- `waitlist.questionnaire_screen` guarda eso para un lead, y es lo que hace
-- que al volver salga «te quedaste en la pantalla 3». Quien entra con Google
-- no tiene lead: tiene cuenta desde el primer segundo, y hasta ahora esa
-- informacion no tenia donde vivir para el.
--
-- Sin esto, quien deja el cuestionario a medias y vuelve empieza por la
-- primera pantalla. No pierde respuestas —se guardan una a una— pero tiene
-- que pasar por delante de todas otra vez, y eso es exactamente lo que
-- `questionnaire_screen` existe para evitar.
-- =====================================================================

alter table profiles
  add column if not exists questionnaire_screen int not null default 0;

comment on column profiles.questionnaire_screen is
  'Por que pantalla del cuestionario va. El equivalente de '
  'waitlist.questionnaire_screen para quien entra con cuenta desde el '
  'principio, que es lo que pasa al entrar con Google.';

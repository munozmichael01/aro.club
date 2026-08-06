-- =====================================================================
-- Progreso del cuestionario para poder retomarlo.
--
-- El guardado es por pregunta (HANDOFF §2.4), asi que profile_answers ya
-- lleva las respuestas. Falta solo por donde iba, para reabrir en la
-- pantalla correcta y poder avisar de que se retoma.
-- =====================================================================

alter table waitlist
  add column questionnaire_screen smallint not null default 0
    check (questionnaire_screen between 0 and 4);

comment on column waitlist.questionnaire_screen is
  'Ultima pantalla vista del cuestionario, 0..4. Con profile_completed_at '
  'nulo y esta > 0, el cuestionario se retoma y lo avisa en pantalla.';

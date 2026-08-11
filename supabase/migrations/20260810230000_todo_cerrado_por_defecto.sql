-- Cerrado por defecto.
--
-- Llevo dos rondas tapando filtraciones de una en una: primero `restaurants`
-- y `events`, y al volver a mirar aparecieron diez más. Entre ellas:
--
--   · `profile_identities` — el correo de TODO el que se ha registrado.
--   · `matching_runs`      — la propuesta entera antes de publicarla, con
--                            nombre, edad, género, sector y empresa de cada
--                            persona de cada mesa.
--   · `event_venues`       — la misma filtración del restaurante que creí
--                            cerrada, por otra puerta.
--   · `payment_accounts` y `payment_methods` — los datos de cuenta, saltándose
--                            el freno que puse en la API.
--   · cinco vistas —`v_credit_balance`, `v_verified_profiles`,
--     `v_lead_progreso`, `v_rechazos_por_perfil`, `v_city_demand`— que no
--     heredan las políticas de sus tablas.
--
-- Ir tabla por tabla no funciona: la siguiente que se cree vuelve a nacer
-- abierta y yo vuelvo a no mirarla. Así que se invierte la regla.
--
-- **El navegador no lee nada directamente.** Todo pasa por /api/*, que usa la
-- clave de servicio y salta esto. Ya era así de hecho —no hay una sola
-- pantalla que use el cliente de navegador— pero no estaba impuesto.

revoke select on all tables in schema public from anon, authenticated;

-- Lo único público, y por qué:
--   cities, zones                     la landing pregunta dónde estás
--   questions, questionnaire_versions el cuestionario es abierto
--   products                          los packs y su precio
--   fx_rates                          la tasa del día no es secreta
--   verification_rejection_reasons    los motivos son cerrados y visibles
--   v_fechas_publicas                 cuándo y en qué zonas, nunca dónde
grant select on
  cities, zones, questions, questionnaire_versions, products,
  fx_rates, verification_rejection_reasons, v_fechas_publicas
to anon, authenticated;

-- Y lo que se cree mañana nace cerrado, sin que nadie tenga que acordarse.
alter default privileges in schema public
  revoke select on tables from anon, authenticated;

comment on schema public is
  'Cerrado por defecto para anon y authenticated. El navegador no lee tablas: '
  'todo pasa por /api/*, que usa la clave de servicio. Abrir algo al publico '
  'es un GRANT explicito, no un olvido.';

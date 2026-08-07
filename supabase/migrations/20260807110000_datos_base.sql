-- =====================================================================
-- F3 · Datos base. Desbloquea dos restricciones duras del reparto.
--
-- Ninguna pantalla pedia fecha de nacimiento ni genero, asi que el spread
-- de edad de 10 anios y el balance de genero no tenian de donde salir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. GENERO: al codigo del contrato, como se hizo con arraigo
-- ---------------------------------------------------------------------

alter type gender_t rename value 'female'      to 'mujer';
alter type gender_t rename value 'male'        to 'hombre';
alter type gender_t rename value 'non_binary'  to 'no-binario';
alter type gender_t rename value 'undisclosed' to 'sin-decir';


-- ---------------------------------------------------------------------
-- 2. El lead recoge los datos base antes de tener cuenta
--
-- `full_name` y `phone_e164` ya existian en waitlist. Faltan el trato, la
-- fecha y el genero. Cuando el lead se convierte en perfil, estas cinco
-- pasan tal cual a profiles, que ya tiene sus columnas.
-- ---------------------------------------------------------------------

alter table waitlist
  add column display_name text,
  add column birthdate date,
  add column gender gender_t,
  add column base_completed_at timestamptz;

-- Movil venezolano: prefijos validos mas siete cifras. El +58 es fijo y no
-- se teclea, asi que se guarda ya normalizado a E.164.
alter table waitlist
  add constraint waitlist_phone_ve check (
    phone_e164 is null or phone_e164 ~ '^\+58(412|414|416|422|424|426)[0-9]{7}$'
  );

alter table profiles
  add constraint profiles_phone_ve check (
    phone_e164 is null or phone_e164 ~ '^\+58(412|414|416|422|424|426)[0-9]{7}$'
  );

-- Solo mayores de 18. La pantalla ya lo bloquea, pero un cliente puede
-- saltarse la pantalla y esto no.
alter table waitlist
  add constraint waitlist_mayor_de_edad check (
    birthdate is null or birthdate <= (current_date - interval '18 years')
  );

comment on column waitlist.display_name is
  'El trato: lo unico de los datos base que ve la mesa. El resto no se muestra.';


-- ---------------------------------------------------------------------
-- 3. Cuando estan completos, el lead puede pasar a verificacion
-- ---------------------------------------------------------------------

create or replace view v_lead_progreso as
select w.email,
       w.city,
       w.quiz_completed_at is not null                      as quiz_hecho,
       w.profile_completed_at is not null                   as cuestionario_hecho,
       w.base_completed_at is not null                      as datos_base_hechos,
       (select count(*) from jsonb_object_keys(w.profile_answers))::int as respuestas,
       w.questionnaire_screen,
       w.converted_profile_id is not null                   as tiene_cuenta
from waitlist w;

comment on view v_lead_progreso is
  'Por donde va cada lead. Alimenta el paso siguiente de Mi cuenta y el '
  'contador de cuantas respuestas faltan.';

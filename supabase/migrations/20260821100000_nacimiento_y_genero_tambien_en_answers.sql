-- =====================================================================
-- `nacimiento` y `genero` también son respuestas, y no estaban en `answers`.
--
-- La entrega que las convirtió en preguntas
-- (20260818150000_nacimiento_y_genero_al_cuestionario) hizo bien la mitad
-- que se ve: las metió en el catálogo, la pantalla las pregunta y el valor
-- aterriza en `waitlist.birthdate` / `.gender` como el resto de heredables.
--
-- Lo que no hizo es lo que no se ve. `convertir_lead` lleva a `answers` dos
-- cosas: el jsonb `profile_answers` clave por clave, y —en un bloque
-- APARTE— las heredables, que no están en ese jsonb porque viven en columna
-- propia. Ese segundo bloque tenía las cuatro de la landing escritas a mano:
-- arraigo, zonas, días y temas. Añadir dos heredables sin tocar esa lista
-- las deja fuera de `answers` para siempre.
--
-- Se ve en la base: seis perfiles con las cuatro viejas y ninguno con las dos
-- nuevas, teniéndolas en `profiles`. Y se veía en la pantalla, que es como
-- lo cazó Michael: Inicio decía «completas» —porque `situacionDePerfil` las
-- parchea leyendo `profiles`— y Perfil decía que faltaban dos, porque cuenta
-- `answers` a secas. Dos pantallas, dos cuentas, el mismo usuario.
--
-- Dos arreglos, y el segundo importa más:
--
--   1. Rellenar lo que falta de quien ya tiene el dato.
--   2. Que `convertir_lead` no vuelva a dejarlas fuera — si solo se
--      rellenara, la próxima persona que convierta entraría descuadrada
--      otra vez, y la siguiente pregunta heredable repetiría el fallo.
--
-- Por qué `answers` Y la columna no son dos verdades: `profiles.birthdate`
-- es el dato operativo —de ahí derivan los rasgos y el pool del reparto— y
-- `answers` es el registro de qué contestó en el cuestionario. Es la misma
-- relación que ya tienen arraigo, zonas, días y temas desde el primer día.
-- La columna manda; `answers` acompaña.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. Que no vuelva a pasar: la lista deja de ser de cuatro.
-- --------------------------------------------------------------------
create or replace function convertir_lead(
  p_profile_id uuid,
  p_lead_email text,
  p_auth_email text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead waitlist%rowtype;
begin
  select * into v_lead from waitlist where email = p_lead_email;
  if not found then
    raise exception 'lead no encontrado: %', p_lead_email;
  end if;

  insert into profiles (
    id, email, contact_email, waitlist_id, full_name, display_name,
    birthdate, gender, phone_e164, rootedness, city_slug, status
  ) values (
    p_profile_id, p_auth_email, v_lead.email, v_lead.id,
    v_lead.full_name, v_lead.display_name, v_lead.birthdate,
    coalesce(v_lead.gender, 'sin-decir'), v_lead.phone_e164, v_lead.rootedness,
    coalesce(v_lead.city_slug, 'caracas'),
    (case when v_lead.profile_completed_at is not null
          then 'pending_verification' else 'pending_questionnaire' end)::member_status_t
  )
  on conflict (id) do nothing;

  -- Las respuestas viajan al almacen definitivo, clave por clave.
  insert into answers (profile_id, version_id, question_key, value)
  select p_profile_id, qv.id, clave, valor
  from questionnaire_versions qv,
       jsonb_each(coalesce(v_lead.profile_answers, '{}'::jsonb)) as x(clave, valor)
  where qv.is_active
  on conflict (profile_id, version_id, question_key) do update
    set value = excluded.value;

  -- Y las HEREDABLES, que no estan en profile_answers porque tienen columna
  -- propia. Esta lista tiene que ser la misma que `HEREDABLES` en
  -- src/app/api/cuestionario/route.ts. Son seis desde el 18 de agosto de
  -- 2026, no cuatro: si se anade otra pregunta con columna propia, va aqui
  -- el mismo dia o no llega nunca a `answers`.
  insert into answers (profile_id, version_id, question_key, value)
  select p_profile_id, qv.id, t.clave, t.valor
  from questionnaire_versions qv,
       (values
         ('arraigo',    to_jsonb(v_lead.rootedness)),
         ('zonas',      to_jsonb(v_lead.zones)),
         ('dias',       to_jsonb(v_lead.days)),
         ('temas',      to_jsonb(v_lead.conversation_topics)),
         ('nacimiento', to_jsonb(v_lead.birthdate)),
         ('genero',     to_jsonb(v_lead.gender))
       ) as t(clave, valor)
  where qv.is_active and t.valor is not null and t.valor <> 'null'::jsonb
  on conflict (profile_id, version_id, question_key) do update
    set value = excluded.value;

  update waitlist set converted_profile_id = p_profile_id where id = v_lead.id;
end $$;

-- --------------------------------------------------------------------
-- 2. Lo que ya existe.
--
-- Desde `profiles`, que es la fuente: el lead puede haberse borrado o traer
-- el dato viejo si alguien lo corrigio despues en su perfil.
--
-- `on conflict do nothing` y no `do update`: si por lo que sea ya hay una
-- respuesta guardada, manda esa. Esto rellena huecos, no reescribe.
-- --------------------------------------------------------------------
insert into answers (profile_id, version_id, question_key, value)
select p.id, qv.id, t.clave, t.valor
from profiles p
cross join questionnaire_versions qv,
lateral (values
  ('nacimiento', to_jsonb(p.birthdate)),
  ('genero',     to_jsonb(p.gender))
) as t(clave, valor)
where qv.is_active
  and p.deleted_at is null
  and t.valor is not null
  and t.valor <> 'null'::jsonb
on conflict (profile_id, version_id, question_key) do nothing;

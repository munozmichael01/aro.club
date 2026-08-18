-- =====================================================================
-- `convertir_lead` era DOS funciones, y la buena no la llamaba nadie.
--
-- `20260809200000_ciudad_en_conversion.sql` arregló que el perfil naciera
-- sin ciudad... en una función con otra firma. Postgres no reemplaza por
-- nombre sino por firma, así que aquel `create or replace` no sustituyó
-- nada: creó una SEGUNDA función al lado.
--
--   convertir_lead(p_profile_id, p_lead_email, p_auth_email)  ← la que se llama
--   convertir_lead(p_email, p_profile_id)                     ← la que copia la ciudad
--
-- `/api/cuenta` llama a la de tres argumentos, o sea que la ciudad lleva sin
-- copiarse desde entonces y el arreglo lleva nueve días sin efecto. Hoy no
-- rompe nada porque solo hay Caracas; el día que abra Valencia, todo el
-- mundo creado por el funnel es de ninguna ciudad, y esa columna es la que
-- decide dónde se abre la siguiente fecha.
--
-- Aquí la de tres argumentos pasa a copiar la ciudad, y la de dos se va: una
-- función que nadie llama y que hace casi lo mismo es la trampa preparada
-- para el siguiente que lea el nombre y crea que la ha arreglado.
-- =====================================================================

create or replace function convertir_lead(
  p_profile_id uuid,
  p_lead_email text,
  p_auth_email text
) returns void
language plpgsql volatile security definer set search_path = public as $$
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
    -- La ciudad del lead, y Caracas si el lead no la trae: es la única
    -- abierta, y un perfil sin ciudad no sale en ningún contador.
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

  -- Y lo que el lead contestó en la landing, que no está en profile_answers.
  insert into answers (profile_id, version_id, question_key, value)
  select p_profile_id, qv.id, t.clave, t.valor
  from questionnaire_versions qv,
       (values
         ('arraigo', to_jsonb(v_lead.rootedness)),
         ('zonas',   to_jsonb(v_lead.zones)),
         ('dias',    to_jsonb(v_lead.days)),
         ('temas',   to_jsonb(v_lead.conversation_topics))
       ) as t(clave, valor)
  where qv.is_active and t.valor is not null and t.valor <> 'null'::jsonb
  on conflict (profile_id, version_id, question_key) do update
    set value = excluded.value;

  update waitlist set converted_profile_id = p_profile_id where id = v_lead.id;
end $$;

-- La huérfana. Nadie la llama: `/api/cuenta` es el único sitio que convierte.
drop function if exists convertir_lead(text, uuid);

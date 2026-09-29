-- `convertir_lead` se lleva la atribucion al perfil.
--
-- La columna `profiles.source` acaba de existir; esto es lo que hace que
-- quien SI pasa por un lead no la pierda al convertirse. Va en su propia
-- migracion porque la anterior ya estaba aplicada: editarla no la vuelve a
-- correr, y un fichero que dice una cosa y una base que tiene otra es peor
-- que no tener el fichero.
--
-- Y que `convertir_lead` lo lleve, para que quien SI pasa por un lead no lo
-- pierda al convertirse. Es la misma funcion de siempre con una columna mas:
-- se reescribe entera porque `create or replace` lo exige, y el resto queda
-- palabra por palabra como estaba.
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
    birthdate, gender, phone_e164, rootedness, status, source
  ) values (
    p_profile_id, p_auth_email, v_lead.email, v_lead.id,
    v_lead.full_name, v_lead.display_name, v_lead.birthdate,
    coalesce(v_lead.gender, 'sin-decir'), v_lead.phone_e164, v_lead.rootedness,
    case when v_lead.profile_completed_at is not null
         then 'pending_verification' else 'pending_questionnaire' end,
    v_lead.source
  )
  on conflict (id) do nothing;

  insert into answers (profile_id, version_id, question_key, value)
  select p_profile_id, qv.id, clave, valor
  from questionnaire_versions qv,
       jsonb_each(coalesce(v_lead.profile_answers, '{}'::jsonb)) as x(clave, valor)
  where qv.is_active
  on conflict (profile_id, version_id, question_key) do update
    set value = excluded.value;

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

comment on function convertir_lead is
  'Crea el perfil desde el lead y le pasa sus respuestas y su atribucion. Se '
  'ata por el id del lead, no por el correo: con Apple o Google el correo '
  'puede ser otro.';

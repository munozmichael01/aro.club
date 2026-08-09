-- La ciudad del lead viaja al perfil al convertirse. Sin esto, el perfil
-- nace sin ciudad y el dia que haya dos ciudades abiertas no se sabe a
-- cual pertenece nadie que se registre desde hoy.
create or replace function convertir_lead(p_email text, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead waitlist%rowtype;
begin
  select * into v_lead from waitlist where email = p_email;
  if not found then
    raise exception 'no hay lead con ese correo';
  end if;

  insert into profiles (
    id, email, contact_email, waitlist_id, full_name, display_name,
    birthdate, gender, phone_e164, rootedness, city_slug, status
  )
  values (
    p_profile_id, p_email, v_lead.email, v_lead.id,
    v_lead.full_name, v_lead.display_name, v_lead.birthdate,
    coalesce(v_lead.gender, 'sin-decir'), v_lead.phone_e164, v_lead.rootedness,
    coalesce(v_lead.city_slug, 'caracas'),
    (case when v_lead.profile_completed_at is not null
          then 'pending_verification' else 'pending_questionnaire' end)::member_status_t
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

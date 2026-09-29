-- El cast que me dejé al reescribir `convertir_lead`.
--
-- La migración anterior la reescribió entera para añadirle `source`, y al
-- hacerlo el `case` del estado dejó de resolverse contra el enum:
--
--   column "status" is of type member_status_t but expression is of type text
--
-- O sea que `convertir_lead` estuvo rota: cualquiera que creara su cuenta
-- —con contraseña o con Google— viniendo de un lead, se quedaba sin perfil y
-- con un 500. Lo cazó la prueba del camino de contraseña, que es justo para
-- lo que se hace antes y después de tocar esto.
--
-- Se pone el cast explícito en vez de confiar en que el literal se resuelva
-- solo, que es lo que lo hacía frágil.

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
    -- Con el cuestionario cerrado ya solo falta verificar identidad.
    (case when v_lead.profile_completed_at is not null
          then 'pending_verification' else 'pending_questionnaire' end)::member_status_t,
    v_lead.source
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

  -- Y las cuatro de la landing, que viven en columnas propias.
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

-- =====================================================================
-- Guardado de una respuesta sin pisar las demas.
--
-- El guardado es por pregunta, asi que llegan varias escrituras seguidas
-- sobre la misma fila. Haciendo leer-modificar-escribir en el servidor,
-- dos respuestas rapidas leen el mismo estado y la segunda borra a la
-- primera. Se pierde una respuesta y nada falla.
--
-- Aqui la fusion la hace Postgres con `||`, dentro de la propia sentencia.
-- =====================================================================

create or replace function guardar_respuesta(
  p_email    text,
  p_clave    text,
  p_valor    jsonb,      -- null borra la clave
  p_pantalla smallint default null,
  p_fin      boolean default false
) returns void
language sql volatile security definer set search_path = public as $$
  update waitlist set
    profile_answers = case
      when p_valor is null then profile_answers - p_clave
      else profile_answers || jsonb_build_object(p_clave, p_valor)
    end,
    questionnaire_screen = greatest(questionnaire_screen, coalesce(p_pantalla, 0)),
    profile_completed_at = case
      when p_fin then coalesce(profile_completed_at, now())
      else profile_completed_at
    end
  where email = p_email;
$$;

comment on function guardar_respuesta is
  'Fusiona una respuesta en profile_answers de forma atomica. Evita que dos '
  'guardados seguidos se pisen: el patron leer-modificar-escribir en el '
  'servidor pierde respuestas cuando la gente marca rapido.';

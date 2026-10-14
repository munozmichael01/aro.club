-- =====================================================================
-- `convertir_lead` se reescribió copiando una versión vieja, y se llevó por
-- delante dos cosas que ya estaban arregladas.
--
-- El 28 de septiembre se reescribió DOS VECES —una para añadirle `source` y
-- otra para el cast del enum que faltaba— y las dos veces el cuerpo se copió
-- de una versión anterior al 21 de agosto. Así que volvieron dos fallos que
-- ya tenían su migración, su explicación y su relleno:
--
--   1. La lista de heredables volvió a ser de CUATRO. El comentario que la
--      acompañaba —«son seis desde el 18 de agosto, no cuatro: si se añade
--      otra pregunta con columna propia, va aquí el mismo día o no llega
--      nunca a `answers`»— se copió también... y se copió la lista de
--      cuatro que ese mismo comentario advertía de no dejar corta.
--
--   2. `city_slug` desapareció del insert. La columna existe, es nullable, y
--      `ciudadDe()` trata el nulo como Caracas, así que no falló nada: se
--      quedó callado.
--
-- Lo que hay hoy en la base, 14 de octubre:
--
--   · 373 de las 373 conversiones de octubre tienen `arraigo`, `zonas`,
--     `dias` y `temas` en `answers`, y NINGUNA tiene `nacimiento` ni
--     `genero`. Con el dato en `profiles.birthdate`, que sí viaja.
--   · 377 perfiles con `city_slug` nulo, todos conversiones desde el 28-09.
--     De ellos SEIS no son de Caracas: tres de Valencia, uno de Maracaibo y
--     dos de «otra». A esos seis, Mi cuenta les ha estado enseñando la cena
--     de Caracas con su cuenta atrás, que es exactamente el fallo que
--     `ciudadDe` vino a arreglar en su día. Ninguno llegó a reservar.
--
-- Lo que NO se rompió, y por qué: el reparto saca la edad y el género de
-- `profiles`, no de `answers`, y el embudo parchea las dos preguntas desde
-- `profiles` antes de contar lo que falta. Por eso el usuario nunca vio nada
-- raro y la única pantalla que lo cantaba es la ficha de operación, que lee
-- `answers` a pelo y lleva semanas diciendo «Sin responder» sobre la fecha de
-- nacimiento de casi todo el mundo. Es como lo cazó Michael.
--
-- La lección no es «faltaba un comentario»: el comentario estaba y era
-- bueno. Es que una lista escrita a mano dentro de un cuerpo de función que
-- se copia entero no sobrevive al copiado. Por eso este arreglo viene con su
-- comprobador en `scripts/comprobar-cuestionario.mjs`, que compara esta lista
-- con `HEREDABLES` de src/app/api/cuestionario/route.ts y falla antes del
-- push. Es la tercera vez que esta lista se queda corta; la primera que algo
-- lo va a notar sin que alguien mire.
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
    birthdate, gender, phone_e164, rootedness, city_slug, status, source
  ) values (
    p_profile_id, p_auth_email, v_lead.email, v_lead.id,
    v_lead.full_name, v_lead.display_name, v_lead.birthdate,
    coalesce(v_lead.gender, 'sin-decir'), v_lead.phone_e164, v_lead.rootedness,
    -- Su ciudad, y Caracas solo si el lead no trae ninguna. Sin esto el
    -- perfil nace sin ciudad y `ciudadDe` lo da por Caracas: quien vive en
    -- Valencia acaba viendo la cena de Caracas.
    coalesce(v_lead.city_slug, 'caracas'),
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

  -- Y las HEREDABLES, que no estan en `profile_answers` porque tienen
  -- columna propia.
  --
  -- SON SEIS. Esta lista tiene que ser la misma que `HEREDABLES` en
  -- src/app/api/cuestionario/route.ts, y `comprobar-cuestionario.mjs` lo
  -- comprueba en cada push. Si reescribes esta funcion, no copies el cuerpo
  -- de una migracion anterior: copia ESTA, que es la ultima.
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
-- Y lo que ya entró descuadrado.
--
-- Desde `profiles`, que es la fuente del dato operativo: el lead puede
-- haberse borrado, o traer el valor viejo si la persona lo corrigió después
-- en su perfil.
--
-- `do nothing` y no `do update`: si por lo que sea ya hay una respuesta
-- guardada, manda esa. Esto rellena huecos, no reescribe.
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

-- --------------------------------------------------------------------
-- La ciudad, en cambio, SOLO desde el lead.
--
-- Aquí no hay fuente alternativa: `profiles.city_slug` es justo lo que está
-- vacío. Se copia lo que la persona declaró en su alta y no se inventa un
-- 'caracas' para quien no dijo nada: lo que no se sabe se deja sin saber, y
-- `ciudadDe` ya decide qué hacer con el nulo. Lo que esto arregla son los
-- seis que SÍ dijeron otra cosa y a los que estábamos tratando de Caracas.
-- --------------------------------------------------------------------
update profiles p
   set city_slug = w.city_slug
  from waitlist w
 where w.id = p.waitlist_id
   and p.city_slug is null
   and w.city_slug is not null;

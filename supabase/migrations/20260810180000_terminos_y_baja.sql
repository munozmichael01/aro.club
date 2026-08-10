-- 1 · Aceptación de términos
--
-- No había ni columna ni registro: nadie ha aceptado nunca nada, y mientras
-- tanto guardamos cédulas y selfies. El problema no es la tienda —que
-- también lo exige—: es que pedimos un documento de identidad sin constancia
-- de que la persona consintiera para qué.
--
-- Se guarda CUÁNDO y QUÉ VERSIÓN. La versión importa: el día que cambie el
-- legal hay que saber quién aceptó cuál, o «aceptó los términos» deja de
-- querer decir nada.
alter table profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text;

comment on column profiles.terms_version is
  'Version del legal que acepto. Sin esto, cambiar los terminos borraria la '
  'trazabilidad de que acepto cada quien.';

-- Los perfiles que ya existen se quedan en null a proposito. Son cuentas de
-- prueba y ninguna acepto nada: estamparles una fecha seria inventarse un
-- consentimiento, que es exactamente lo que esta columna existe para evitar.

-- 2 · Baja de cuenta
--
-- Baja NO es borrar la fila. `profiles.id` referencia `auth.users` con
-- ON DELETE CASCADE, y de `profiles` cuelgan `bookings`, `payments` y
-- `credit_ledger` tambien en cascada: borrar el usuario de auth se llevaria
-- por delante la facturacion que el legal promete conservar diez años.
--
-- Asi que la baja ANONIMIZA y corta el acceso, y lo que se borra de verdad
-- es lo que prometimos borrar: respuestas y documentos.
alter table profiles
  add column if not exists deleted_at timestamptz;

comment on column profiles.deleted_at is
  'Cuenta dada de baja. La fila sobrevive como lapida porque de ella cuelga '
  'la facturacion; el nombre, la fecha de nacimiento y el telefono se vacian, '
  'y las respuestas y los documentos se borran de verdad.';

create index if not exists profiles_activos on profiles (id) where deleted_at is null;

-- Quien se dio de baja no entra al reparto, aunque le quedara una reserva
-- confirmada. Se recrea la vista entera —no basta con soltarla— porque de
-- ella cuelga todo el emparejamiento.
drop view if exists v_matching_pool;

create view v_matching_pool as
select b.event_id, b.id as booking_id, p.id as profile_id,
       pt.age, pt.gender, pt.rootedness, pt.industry,
       coalesce(ea.canonical, pt.employer_normalized) as employer_key,
       pt.life_stage, pt.social_energy, pt.intention, pt.romantic_openness,
       pt.dining_focus, pt.budget_tier,
       pt.interests, pt.conversation_topics, pt.dealbreakers,
       pt.dietary, pt.languages,
       coalesce(
         (select array_agg(bz.zone_slug) from booking_zones bz where bz.booking_id = b.id),
         pt.zones
       ) as zones
from bookings b
join profiles p on p.id = b.profile_id
join profile_traits pt on pt.profile_id = p.id
left join employer_aliases ea on ea.alias = pt.employer_normalized
where b.status = 'confirmed'
  and p.status = 'active'
  and p.deleted_at is null
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);

alter view v_matching_pool set (security_invoker = on);

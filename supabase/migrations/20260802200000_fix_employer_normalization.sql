-- =====================================================================
-- Corrige normalize_employer: los sufijos societarios con puntos.
--
-- Fallo: se quitaba la puntuacion antes de buscar el sufijo, asi que
-- 'BANESCO C.A.' quedaba en 'banesco c a' y no coincidia con el patron.
-- El caso mas comun en Venezuela era justo el que fallaba, y de esto
-- depende la restriccion dura de no sentar a dos personas de la misma
-- empresa.
--
-- Arreglo: quitar los puntos PRIMERO ('C.A.' -> 'ca'), y despues aplicar
-- el borrado de sufijo dos veces para cubrir tambien las variantes que
-- llegan ya separadas ('grupo x c a').
-- =====================================================================

-- De la columna generada cuelgan dos indices y la vista del pool de
-- matching. Se quitan explicitamente, no con CASCADE, para que quede
-- escrito exactamente que se cae y que se vuelve a crear.
drop view if exists v_matching_pool;
drop index if exists profile_traits_employer_normalized_idx;
drop index if exists profile_traits_employer_trgm;

alter table profile_traits drop column employer_normalized;

create or replace function normalize_employer(raw text) returns text
language sql immutable as $$
  with a as (
    select translate(lower(coalesce(raw, '')),
                     'áàäâãéèëêíìïîóòöôõúùüûñç',
                     'aaaaaeeeeiiiiooooouuuunc') as t
  ), b as (
    -- Los puntos se van primero: 'C.A.' -> 'ca', 'S.R.L.' -> 'srl'
    select replace(t, '.', '') as t from a
  ), c as (
    select btrim(regexp_replace(t, '[^a-z0-9]+', ' ', 'g')) as t from b
  ), d as (
    select btrim(regexp_replace(t, '\s+', ' ', 'g')) as t from c
  ), e as (
    -- Dos pasadas: cubre 'banesco ca' y tambien 'grupo x c a'
    select btrim(regexp_replace(
             btrim(regexp_replace(t,
               '\s+(ca|sa|srl|sca|scs|sas|llc|inc|corp|ltd|ltda|cia|compania|company|a|c|s)$',
               '', 'g')),
             '\s+(ca|sa|srl|sca|scs|sas|llc|inc|corp|ltd|ltda|cia|compania|company|a|c|s)$',
             '', 'g')) as t
    from d
  )
  select nullif(t, '') from e;
$$;

alter table profile_traits
  add column employer_normalized text
  generated always as (normalize_employer(employer)) stored;

create index profile_traits_employer_normalized_idx
  on profile_traits (employer_normalized);
create index profile_traits_employer_trgm on profile_traits
  using gin (employer_normalized gin_trgm_ops);

-- Se recrea igual que estaba. employer_key resuelve el alias confirmado por
-- operaciones si existe, y si no cae en el valor normalizado.
create or replace view v_matching_pool as
select b.event_id,
       b.id as booking_id,
       p.id as profile_id,
       pt.age, pt.gender, pt.rootedness, pt.industry,
       coalesce(ea.canonical, pt.employer_normalized) as employer_key,
       pt.life_stage, pt.social_energy, pt.intention, pt.romantic_openness,
       pt.dining_focus, pt.budget_tier,
       pt.interests, pt.conversation_topics, pt.dealbreakers,
       pt.dietary, pt.languages, pt.zones
from bookings b
join profiles p on p.id = b.profile_id
join profile_traits pt on pt.profile_id = p.id
left join employer_aliases ea on ea.alias = pt.employer_normalized
where b.status = 'confirmed'
  and p.status = 'active'
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);

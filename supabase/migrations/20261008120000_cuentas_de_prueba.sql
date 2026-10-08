-- Una cuenta de prueba no ocupa un asiento en una cena de verdad.
--
-- EL PROBLEMA, CONCRETO. La cuenta del revisor de Apple tenía cuatro créditos
-- —se los daba `cuenta-revision.mjs` para que el botón se viera como lo ve un
-- miembro— y hay dos fechas reales abiertas. Con saldo, `/api/reservar` crea
-- la reserva ya CONFIRMADA y cobra el crédito en el mismo gesto: el revisor
-- de Apple podía apuntarse a una cena real durante la revisión, contar como
-- apuntado, y entrar al reparto con cinco desconocidos que sí van a ir.
--
-- Los créditos se quitan aparte, con un apunte en el libro. Esto es lo otro:
-- que no vuelva a poder pasar aunque alguien le dé créditos otra vez, aunque
-- canjee un cupón, o aunque operación apruebe por error un Pago Móvil
-- inventado.
--
-- POR QUÉ UN TRIGGER Y NO UNA COMPROBACIÓN EN CADA SITIO. Hay cuatro caminos
-- distintos que dejan una reserva confirmada —reservar con crédito, pagar con
-- un método automático, canjear un cupón, y que operación apruebe un pago— y
-- treinta y dos consultas a `bookings` repartidas por la API. Una regla
-- escrita cuatro veces es una regla que se olvida la quinta vez que alguien
-- añade un camino. Aquí es una, y no se puede esquivar.
--
-- Y NO REVIENTA: baja el estado a `pending_payment` en vez de lanzar un
-- error. El revisor tiene que poder recorrer el producto entero; lo que no
-- puede es acabar sentado en una mesa. Un 500 en mitad de la revisión de
-- Apple es peor que una reserva que se queda esperando.

alter table profiles
  add column if not exists es_prueba boolean not null default false;

comment on column profiles.es_prueba is
  'Cuenta creada por un guion de pruebas o para la revision de Apple. No '
  'entra al reparto ni ocupa asiento en una fecha real. El panel SI la ve: '
  'esconderla de quien la creo seria esconder la basura en vez de barrerla.';

-- Las que existen hoy: la del revisor de Apple y las de los guiones. El
-- dominio `prueba.aro.club` es nuestro y no tiene buzon; ya lo trata como
-- dominio de prueba el remitente de correo.
update profiles
set es_prueba = true
where email = 'revision.appstore@aro.club'
   or email like '%@prueba.aro.club';

-- --- el candado -------------------------------------------------------

create or replace function prueba_sin_asiento() returns trigger
language plpgsql as $$
declare
  v_es_prueba boolean;
  v_evento_de_prueba boolean;
begin
  if new.status is distinct from 'confirmed' then
    return new;
  end if;

  select p.es_prueba into v_es_prueba from profiles p where p.id = new.profile_id;
  if not coalesce(v_es_prueba, false) then
    return new;
  end if;

  select e.es_prueba into v_evento_de_prueba from events e where e.id = new.event_id;

  -- En una fecha de prueba se les deja confirmar: para eso existen esas
  -- fechas, y la del revisor de Apple es una de ellas.
  if coalesce(v_evento_de_prueba, false) then
    return new;
  end if;

  new.status := 'pending_payment';
  new.confirmed_at := null;
  return new;
end $$;

drop trigger if exists trg_prueba_sin_asiento on bookings;
create trigger trg_prueba_sin_asiento
before insert or update of status on bookings
for each row execute function prueba_sin_asiento();

comment on function prueba_sin_asiento is
  'Una cuenta de prueba no se confirma en una fecha real. Baja el estado en '
  'vez de fallar: el revisor de Apple tiene que poder recorrer el producto.';

-- --- y fuera del reparto, por si alguna quedo confirmada antes ----------

create or replace view v_matching_pool as
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
join events e on e.id = b.event_id
where b.status = 'confirmed'
  and p.status = 'active'
  and p.deleted_at is null
  -- Las de prueba solo se reparten en fechas de prueba. Es la misma regla
  -- que el trigger, por si una fila se confirmo antes de que existiera.
  and (not coalesce(p.es_prueba, false) or coalesce(e.es_prueba, false))
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);

alter view v_matching_pool set (security_invoker = on);

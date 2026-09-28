-- Cada ciudad dice en qué hora habla.
--
-- Hasta hoy la zona era una constante del producto —`America/Caracas`, en
-- `reglas.js` y de ahí en `fechas.ts`— y eso es correcto mientras solo haya
-- una ciudad. Deja de serlo en la primera que se abra fuera de ese huso, y el
-- fallo no se ve: una cena de las ocho de la noche se cuenta en otra hora y
-- la fecha se va un día, que es exactamente lo que ya pasó cuando el servidor
-- contaba en UTC —el panel y las fechas de borrado decían un día de más—.
--
-- El nombre IANA, no un desfase. Un `-4` se rompe el día que se abra una
-- ciudad con horario de verano: Madrid es +1 en invierno y +2 en verano, y
-- una constante numérica no lo sabe.
--
-- Se valida contra `pg_timezone_names`, que es la lista que la propia base
-- reconoce: así un error de tecleo —`America/Caraca`— no llega a producción.
-- Sin la validación, `Intl` se lo traga y formatea en UTC sin avisar.
--
-- Va en un DISPARADOR y no en un `check` porque un `check` no admite
-- subconsultas: `pg_timezone_names` es una tabla. El disparador hace lo mismo
-- —no deja entrar un valor que la base no conoce— y además dice cuál era.
--
-- Las siete ciudades venezolanas comparten huso, así que el valor de partida
-- es correcto para todas.

alter table cities
  add column if not exists timezone text not null default 'America/Caracas';

create or replace function cities_timezone_valida() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'La zona horaria "%" no existe. Usa un nombre IANA, como America/Caracas o Europe/Madrid.', new.timezone;
  end if;
  return new;
end $$;

drop trigger if exists cities_timezone_valida_t on cities;

create trigger cities_timezone_valida_t
  before insert or update of timezone on cities
  for each row execute function cities_timezone_valida();

comment on column cities.timezone is
  'Zona horaria IANA de la ciudad. Viaja junto a cada fecha como `zonaHoraria` '
  'en /mi-cuenta, /mi-mesa y /proxima: una persona puede tener fechas en dos '
  'ciudades, asi que no vale una zona en la raiz de la respuesta.';

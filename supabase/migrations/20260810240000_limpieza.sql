-- Limpieza: duplicados y muertos.
--
-- Nada de lo que se toca aquí lo lee una línea de código. Se comprobó uno
-- por uno antes de escribir esto, y lo que estaba en duda se queda.

-- ---------------------------------------------------------------------
-- 1 · Dos tablas para los métodos de pago
-- ---------------------------------------------------------------------
-- `payment_accounts` es del esquema inicial; `payment_methods` llegó con la
-- entrega 9 y es la que usa la aplicación. Cero referencias a la primera en
-- todo `src/`, y sin embargo ahí seguía —con los mismos datos falsos de
-- Banesco dentro— y salió en la lista de filtraciones al cerrar la lectura
-- pública. Dos sitios donde poner una cuenta bancaria es uno de más, y el
-- de más es justo el que nadie mira.
drop table if exists payment_accounts;

-- ---------------------------------------------------------------------
-- 2 · `payments.method` mentía
-- ---------------------------------------------------------------------
-- La ruta escribía `method: 'pago_movil'` FIJO en cada pago, fuera el método
-- que fuera: un Bizum quedaba registrado como pago móvil. El método real
-- vive en `metodo`, que apunta a `payment_methods` y es lo que lee la
-- conciliación. El enum, además, ni siquiera tiene 'bizum'.
--
-- No se corrige el valor: se quita la columna. Mantener un enum en paralelo
-- a una tabla de métodos es la misma duplicación de arriba, y esta ya había
-- divergido de la realidad en el 100% de las filas.
update payments set metodo = 'pago_movil' where metodo is null;
alter table payments drop column if exists method;

comment on column payments.metodo is
  'El metodo, por su id en `payment_methods`. Unica fuente: el enum `method` '
  'se quito porque se escribia fijo y mentia en todas las filas.';

-- ---------------------------------------------------------------------
-- 3 · La ciudad, dos veces
-- ---------------------------------------------------------------------
-- La migración de ciudades añadió `city_slug` y dejó `city` con el mismo
-- dato en texto libre. Ya divergían en mayúsculas: "Caracas" contra
-- "caracas". El slug tiene clave foránea contra `cities`; el texto no tiene
-- nada que lo sujete.
alter table events drop column if exists city;

-- Dos vistas leian `waitlist.city`, asi que se recrean sobre el slug ANTES
-- de tirar la columna. `v_city_demand` ya unia por `w.city = c.slug` —usaba
-- el texto libre como si fuera una clave foranea, que es exactamente el
-- riesgo de tener las dos—.
create or replace view v_lead_progreso as
select w.email,
       w.city_slug                                          as city,
       w.quiz_completed_at is not null                      as quiz_hecho,
       w.profile_completed_at is not null                   as cuestionario_hecho,
       w.base_completed_at is not null                      as datos_base_hechos,
       (select count(*) from jsonb_object_keys(w.profile_answers))::int as respuestas,
       w.questionnaire_screen,
       w.converted_profile_id is not null                   as tiene_cuenta
from waitlist w;

create or replace view v_city_demand as
select c.slug,
       c.name,
       c.is_open,
       count(w.id)::int as leads,
       count(w.id) filter (where w.quiz_completed_at is not null)::int as con_quiz,
       count(w.id) filter (where w.created_at > now() - interval '7 days')::int as ultimos_7d,
       max(w.created_at) as ultimo_lead
from cities c
left join waitlist w on w.city_slug = c.slug
group by c.slug, c.name, c.is_open, c.sort_order
order by count(w.id) desc, c.sort_order;

alter table waitlist drop column if exists city;

-- ---------------------------------------------------------------------
-- 4 · Tablas que nunca se usaron
-- ---------------------------------------------------------------------
-- Cero filas y cero referencias. `memberships` era para un modelo de
-- suscripción que no existe —se cobra por cena— y `products` sí se usa, así
-- que se queda.
drop table if exists memberships;

-- `ops_audit_log` está vacía y sin usar, PERO no se borra: operación aprueba
-- cédulas, expulsa gente y desactiva locales, y eso hay que poder auditarlo.
-- Que esté vacía no es que sobre: es que falta escribirla.
comment on table ops_audit_log is
  'VACIA Y SIN USAR, y eso es una carencia, no un sobrante: aprobar una '
  'cedula, expulsar a alguien o dejar de ofrecer un local deberian dejar '
  'rastro aqui.';

-- ---------------------------------------------------------------------
-- 5 · Columnas muertas de `restaurants`
-- ---------------------------------------------------------------------
-- `commission_per_head` convive con `commission_pct`: dos modelos de
-- comisión, cero usos del primero. Se deja el porcentaje, que es el que la
-- ficha sabe editar.
alter table restaurants drop column if exists commission_per_head;

-- `avg_rating` guardaba a mano una media que ya se deriva de las mesas.
alter table restaurants drop column if exists avg_rating;

-- `safety_notes` e `is_after_venue` se quedan: la primera es informacion de
-- seguridad que un dia habra que escribir, y la segunda es el "segundo acto"
-- que el producto contempla. Cero usos hoy no es lo mismo que sobrar.

-- ---------------------------------------------------------------------
-- 6 · Corridas de reparto
-- ---------------------------------------------------------------------
-- 44 corridas para dos fechas: cada "volver a repartir" deja una. Nadie las
-- poda y contienen el reparto entero con nombres. Se queda la ultima de cada
-- fecha y la publicada, si la hay.
delete from matching_runs mr
where not mr.is_published
  and mr.id <> (
    select id from matching_runs x
    where x.event_id = mr.event_id
    order by x.created_at desc
    limit 1
  );

-- Lo que un local necesita saber, y de dónde sale cada cosa.
--
-- La regla de fondo: **lo que solo sabe quien estuvo ahí, lo dice quien
-- estuvo ahí.** El ruido y el gasto los declaraba operación al dar de alta el
-- sitio, que es una suposición; ahora se declaran igual —hay que abrir el
-- local con algo— pero se contrastan con lo que reportan las que cenaron.
-- Cuando no coinciden, eso es la señal útil.

-- 1 · Cómo se llega. Michael pidió los dos.
alter table restaurants
  add column if not exists metro_nearby     text,
  add column if not exists metro_minutes    int check (metro_minutes between 0 and 60);

comment on column restaurants.metro_nearby is
  'Estacion de metro mas cercana. En Caracas decide si alguien acepta una zona.';

-- `has_parking` ya existia: no se duplica, solo se hace editable en la ficha.

-- 2 · Lo que decide si una mesa de seis desconocidos funciona.
alter table restaurants
  -- Un sitio cerrado los jueves no puede recibir la cena del jueves, y hasta
  -- ahora nada lo impedia. 0 = domingo, como getDay().
  add column if not exists open_days        int[] not null default '{0,1,2,3,4,5,6}',
  -- En una mesa larga de seis, los dos extremos no se oyen. Para un producto
  -- que vende conversacion esto pesa mas que el ruido.
  add column if not exists table_shape      text check (table_shape in ('redonda', 'larga', 'ambas')),
  -- El problema practico numero uno de seis desconocidos.
  add column if not exists splits_bill      boolean,
  add column if not exists last_seating     time,
  add column if not exists is_accessible    boolean,
  add column if not exists has_terrace      boolean;

comment on column restaurants.splits_bill is
  'Si dividen la cuenta. Un sitio que no divide arruina el final de la noche.';

-- 3 · Declarado frente a real.
--
-- `noise_level` y `avg_check_usd` se quedan como lo DECLARADO al abrir el
-- local. Lo reportado por quien ceno se deriva de `venue_feedback`, no se
-- guarda aqui: un numero derivado en una columna es un numero que alguien
-- tiene que acordarse de recalcular.
comment on column restaurants.noise_level is
  '1 = se puede conversar · 2 = suena · 3 = suena alto. Es lo DECLARADO al '
  'abrir el local; lo medido sale de `venue_feedback`. NUNCA se enseña el '
  'numero: siempre su etiqueta.';

comment on column restaurants.avg_check_usd is
  'Gasto por persona DECLARADO. El real sale de lo que reportan las que '
  'cenaron, en `venue_feedback.spent_usd`.';

-- `avg_rating` era una columna para mantener a mano una media que ya se
-- deriva. Se marca muerta antes de que alguien la rellene y diverja.
comment on column restaurants.avg_rating is
  'SIN USO. La nota del local se deriva de `venue_feedback`.';

-- 4 · La valoracion del local: la que faltaba.
--
-- Separada de `table_feedback` a proposito. Esa responde «¿volverias a esa
-- mesa?» —sobre la gente— y usarla como nota del sitio penalizaba a un
-- restaurante impecable porque a alguien le toco una mesa aburrida.
create table if not exists venue_feedback (
  table_id      uuid not null references dinner_tables(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  -- Que tal el sitio. Misma escala de cinco que la mesa, para poder mirarlas
  -- juntas sin traducir.
  rating        int not null check (rating between 1 and 5),

  -- Cuanto gasto, por persona. OPCIONAL: es una pregunta sobre el dinero de
  -- alguien, y solo se pide diciendo para que sirve.
  spent_usd     numeric(8,2) check (spent_usd >= 0),

  -- El ruido medido, en la misma escala que el declarado.
  noise_level   int check (noise_level between 1 and 3),

  created_at    timestamptz not null default now(),
  primary key (table_id, profile_id)
);

create index if not exists venue_feedback_por_local
  on venue_feedback (restaurant_id, created_at desc);

alter table venue_feedback enable row level security;

comment on table venue_feedback is
  'La valoracion del LOCAL, que la da quien ceno ahi. Distinta de '
  '`table_feedback`, que valora la mesa.';

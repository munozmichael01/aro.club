-- «Si quieren seguir»: los sitios de al lado que elige operación.
--
-- Entrega 20 de Design, última fila del paso a paso: cuando la mesa termina y
-- hay ganas de seguir, en vez de dejarlo en «busquen un sitio cerca» se
-- ofrecen hasta tres sitios concretos, con los minutos a pie.
--
-- Una tabla de relación y no una columna con una lista dentro: son sitios del
-- catálogo —ya tienen nombre, dirección y mapa— y lo que hay que guardar es
-- cuáles van con cuál y a cuántos minutos. Con un array de ids en
-- `restaurants` no habría forma de guardar los minutos ni de que el borrado
-- de un sitio limpiara las referencias.
create table if not exists restaurant_after_venues (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  after_id uuid not null references restaurants(id) on delete cascade,
  -- Opcional: Design dice que sin minutos esa línea no se enseña.
  minutos_a_pie int check (minutos_a_pie is null or (minutos_a_pie > 0 and minutos_a_pie <= 60)),
  -- El orden lo decide operación: el primero es el que recomendaría.
  orden int not null default 0,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, after_id),
  -- Un sitio no se sigue a sí mismo.
  constraint no_es_el_mismo check (restaurant_id <> after_id)
);

create index if not exists after_venues_por_local on restaurant_after_venues (restaurant_id, orden);

-- RLS: denegar por defecto, como todo lo demás. Lo lee el servidor con la
-- llave de servicio —para Mi mesa y los correos— y lo escribe el panel.
alter table restaurant_after_venues enable row level security;

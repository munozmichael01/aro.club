-- =====================================================================
-- El sitio de Google Places, no solo su URL.
--
-- `maps_url` sola no basta. Con `place_id` el sitio queda identificado de
-- forma estable —cambia el nombre del restaurante y sigue siendo el mismo—
-- y con las coordenadas se arregla una grieta del boton «Como llegar»:
-- `google.com/maps/search/?api=1` abre la app en Android y en un iPhone que
-- tenga Google Maps, pero en un iPhone SIN Google Maps abre Safari en vez de
-- Apple Maps. Con lat y lng se puede dar `maps://?q=lat,lng` para ese caso.
--
-- Y de paso deja de hacer falta geocodificar la direccion, que es lo que no
-- funciona aqui: Nominatim no encuentra «Cardenal, Calle Madrid CON avenida
-- Principal, Las Mercedes» —lo probe— porque asi es como se escriben las
-- direcciones en Caracas. Places se busca por NOMBRE y devuelve el sitio
-- real con su ficha oficial.
--
-- `numeric(10,7)` y no `double precision`: siete decimales son un centimetro
-- y son exactos, y un importe o una coordenada nunca van en coma flotante.
-- =====================================================================

alter table restaurants add column if not exists place_id text;
alter table restaurants add column if not exists lat numeric(10, 7);
alter table restaurants add column if not exists lng numeric(10, 7);

comment on column restaurants.place_id is
  'El id de Google Places. Estable aunque el sitio cambie de nombre; es la '
  'forma de volver a pedir su ficha sin buscar otra vez por texto.';
comment on column restaurants.lat is
  'Para poder abrir Apple Maps con maps://?q=lat,lng en un iPhone sin Google '
  'Maps, donde el enlace normal cae en Safari.';

-- Un sitio no puede estar dado de alta dos veces. Sin esto, buscar «Cardenal»
-- dos dias distintos crea dos locales que son el mismo restaurante, y el
-- panel enseña dos filas que compiten por las mismas mesas.
create unique index if not exists restaurants_place_id_uq
  on restaurants (place_id) where place_id is not null;

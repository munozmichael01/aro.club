-- Entrega 8 · Locales.
--
-- El esquema ya tenia casi todo: nombre, zona, direccion, aforo (`max_tables`),
-- ruido, menu cerrado, gasto medio, comision, contacto, foto y `is_active`.
-- Solo faltan tres cosas, y ninguna es un campo paralelo de algo que ya exista.

-- 1 · Para que formatos sirve el sitio. Un local de solo drinks no puede
--     recibir una cena, y hoy nada lo impedia porque no se guardaba.
alter table restaurants
  add column if not exists formats event_format_t[] not null default '{dinner}';

comment on column restaurants.formats is
  'Formatos que admite. Filtra el reparto: un sitio de drinks no recibe cenas.';

-- 2 · Dejar de ofrecer un local es una decision de dinero, asi que se firma.
alter table restaurants
  add column if not exists deactivated_by uuid references profiles(id),
  add column if not exists deactivated_at timestamptz;

comment on column restaurants.deactivated_by is
  'Quien dejo de ofrecerlo. Un local no se borra nunca: solo se desactiva, '
  'y su historico sobrevive porque es lo que decide si se renueva.';

-- 3 · La escala de ruido.
--
-- El contrato de Design la describe 0-2 y la base la tiene 1-3, con el mismo
-- significado desplazado en uno. NO se migra a 0-2: la columna ya tiene datos,
-- el CHECK la protege, y renumerar una escala para que cuadre con un documento
-- es cambiar el dato para que encaje con la etiqueta. Se traduce al enseñarla,
-- que es lo que el propio contrato exige —el ruido se muestra con su texto,
-- nunca con su numero— asi que el numero no sale a ninguna pantalla.
comment on column restaurants.noise_level is
  '1 = se puede conversar · 2 = suena · 3 = suena alto (no sirve para cenas). '
  'NUNCA se enseña el numero: siempre su etiqueta.';

-- Un local sin nadie a quien llamar no se puede ofrecer, pero SI se puede dar
-- de alta: el alta pide cinco cosas y el resto se rellena luego. Lo que no
-- puede es estar activo a medias, y eso lo decide la API, no un CHECK: un
-- CHECK aqui impediria guardar el alta incompleta, que es justo lo que
-- queremos permitir.

create index if not exists restaurants_activos_por_zona
  on restaurants (zone_slug, is_active) where is_active;

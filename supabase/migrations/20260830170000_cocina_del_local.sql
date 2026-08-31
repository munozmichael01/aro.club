-- La ficha del local ya dice qué se come.
--
-- Faltaba lo unico que permite cruzar la pregunta nueva —«elige tus 3 comidas
-- favoritas»— con el catalogo: sin esto la respuesta se guarda, se ve en el
-- perfil, y no sirve para elegir un sitio, que es para lo que se pregunto.
--
-- Los MISMOS codigos que las opciones de la pregunta. No una lista paralela:
-- dos catalogos de cocinas se desincronizan a su ritmo y el cruce empieza a
-- fallar en silencio, que es el fallo que este repositorio ya ha tenido con
-- las zonas y con las opciones del cuestionario.
--
-- Es una lista, no un valor: un sitio puede ser italiano y pizzeria a la vez, y
-- obligar a elegir uno deja fuera la mitad de lo que se busca.

alter table restaurants
  add column if not exists cuisines text[] not null default '{}';

comment on column restaurants.cuisines is
  'Que se come, con los mismos codigos que las opciones de la pregunta '
  '«comidas» del cuestionario. Lista porque un sitio puede ser varias cosas. '
  'Cruzar esto con profile_traits.cuisines es lo que dice que restaurante '
  'pide la bolsa de una fecha.';

create index if not exists restaurants_cuisines_idx on restaurants using gin (cuisines);

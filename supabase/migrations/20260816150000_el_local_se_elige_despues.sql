-- El local se elige después, no al abrir la fecha.
--
-- Abrir una fecha era elegir zona Y local en el mismo gesto, porque
-- `event_venues.restaurant_id` era obligatorio. Y elegir el local ahí es
-- elegirlo a ciegas: la decisión buena depende de cuánta gente se apunte
-- —cuántas mesas hace falta—, de cuántas aguanta cada sitio, y de cosas de
-- negocio que no se saben el lunes: comisión, valoración de las mesas que ya
-- fueron, si el sitio abre ese día.
--
-- El miembro no ve el sitio hasta la revelación, así que no hay ninguna razón
-- para congelarlo antes. Lo que congela es publicar.
--
-- Una zona puede llevar VARIOS locales en la misma fecha, y eso ya lo permitía
-- la clave única (es por evento+local, no por evento+zona): si una zona
-- necesita tres mesas y el sitio aguanta dos, se añade otro sitio de esa
-- zona. Lo que faltaba era poder abrir sin ninguno y añadirlos luego.
alter table event_venues
  alter column restaurant_id drop not null;

comment on column event_venues.restaurant_id is
  'El sitio de esa zona. Nulo mientras no se haya decidido: se elige antes de '
  'publicar, cuando ya se sabe cuántas mesas hacen falta. Publicar una mesa '
  'sin sitio manda seis correos sin dirección, así que eso se prohíbe arriba.';

-- Sin esto, abrir la misma zona dos veces sin local deja dos filas iguales:
-- la única existente no las ve, porque en Postgres dos nulos son distintos.
create unique index if not exists event_venues_zona_sin_sitio
  on event_venues (event_id, zone_slug)
  where restaurant_id is null;

-- Y el cupo del evento se va.
--
-- Lo metí porque el diseño lo pedía, y no encaja: apuntarse no tiene tope
-- —quien no entra se queda en la lista de espera— y limitar cuántas mesas se
-- sientan tampoco, porque el tope de verdad es de la actividad y se resuelve
-- consiguiendo más sitio, no sentando a menos gente. Un pádel con dos canchas
-- y cuatro apuntados no es un pádel de dos: son dos canchas más que buscar.
--
-- La columna se queda en la tabla —la define el esquema desde el primer día y
-- borrarla es irreversible— pero deja de leerla nadie.
comment on column events.max_seats is
  'SIN USO. Ningún tope bloquea: apuntarse está abierto y el aforo se resuelve '
  'consiguiendo más sitio. Se conserva la columna, no el comportamiento.';

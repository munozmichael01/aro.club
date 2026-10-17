-- =====================================================================
-- Y tambien por mesa.
--
-- Michael, 17-10, media hora despues de encender esto por fecha: «deja la
-- nota del correo y el popup por mesa, y que se informe al momento de armar
-- la mesa, puede ser un check de permisos de contenido, entonces las mesas
-- marcadas, se las enviamos. Podria estar a nivel de mesa y a nivel de
-- fecha».
--
-- Y es la forma correcta: no se graba una noche entera, se graba UNA mesa.
-- Preguntarle el permiso a las otras cuatro es pedirle algo a quien no le
-- vamos a apuntar con nada, y eso gasta justo la atencion que hace falta
-- para que la mesa a la que si vamos conteste.
--
-- Los dos niveles conviven y se suman: la fecha enciende todas las mesas de
-- esa noche —util el dia que se grabe el evento entero— y la mesa enciende
-- la suya. `events.grabacion or dinner_tables.grabacion` es lo que decide,
-- y se calcula en un solo sitio, `/api/mi-mesa`.
--
-- La respuesta sigue en `bookings.permiso_grabacion`, por persona y por
-- fecha: lo que se pregunta es si podemos grabar a ESA persona esa noche, y
-- eso no cambia porque la mesa se rehaga.
-- =====================================================================

alter table dinner_tables
  add column if not exists grabacion boolean not null default false;

comment on column dinner_tables.grabacion is
  'Grabamos contenido en ESTA mesa. Lo marca operacion al armarla. Se suma a '
  'events.grabacion: cualquiera de las dos enciende la pregunta de permiso en '
  'Mi mesa y la nota del correo de la revelacion.';

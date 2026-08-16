-- Entrega 14 · dos huecos de modelo que salieron al diseñar el panel entero.

-- 1 · La actividad.
--
-- Hasta ahora el evento decia DONDE —`event_venues.restaurant_id`, un sitio
-- con direccion— y nada mas. Para una cena eso basta: el sitio ES el plan.
-- Para una caminata no: el punto de encuentro es la entrada del parque y la
-- actividad es la ruta, los kilometros y el nivel. Sin esto, once formatos
-- comparten el modelo de uno solo, y los siete de movimiento salen a la calle
-- sin decir que se va a hacer.
alter table events
  add column if not exists activity jsonb;

comment on column events.activity is
  'Que se hace, para los formatos de movimiento: {ruta, km, minutos, nivel}. '
  'Nulo en cenas, drinks y coffee, donde el sitio ya es el plan.';

-- Obligatoria en movimiento, y solo ahi. `not valid` para no tropezar con
-- filas viejas: lo que importa es que ninguna nueva salga sin ella.
alter table events
  drop constraint if exists events_actividad_en_movimiento;

alter table events
  add constraint events_actividad_en_movimiento
  check (
    format not in ('walk', 'hike', 'run', 'padel', 'pilates', 'cycling')
    or activity is not null
  ) not valid;

-- 2 · El correo que faltaba: la cuenta lista.
--
-- Se manda en el momento en que alguien termina el perfil, y es el unico
-- correo que le dice con que direccion entra. No es la bienvenida —esa la
-- recibe quien deja el correo y se queda a medias— ni la de verificacion
-- —esa llega cuando una persona aprueba la cedula—: es el hueco de en medio,
-- perfil completo e identidad todavia en revision, que hasta ahora no
-- disparaba nada.
alter type email_kind_t add value if not exists 'cuenta_lista';

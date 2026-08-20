-- =====================================================================
-- Borrar una fecha deja rastro, la borre quien la borre.
--
-- Abrir una fecha se anota (`fecha_abierta`) y cancelarla también
-- (`fecha_cancelada`), porque las dos pasan por una ruta del panel. Borrarla
-- de verdad no pasa por ninguna: se hace con la clave de servicio —un guion
-- de siembra, una limpieza, una consola— y no queda registrado en ningún
-- sitio. Hoy desaparecieron dos fechas y la única forma de saber cuáles era
-- acordarse.
--
-- Por eso esto va en un DISPARADOR y no en una ruta: lo que hay que cazar es
-- justo lo que no pasa por la aplicación. Una anotación que solo cubre el
-- camino bonito no sirve para la pregunta que se hace después.
--
-- `actor_id` queda nulo cuando no hay sesión detrás, que es la verdad: fue
-- alguien con la llave de servicio. Lo que importa es qué fecha era, cuándo
-- y con qué gente dentro — eso último es lo que convierte «desapareció una
-- fecha» en «desapareció la del jueves 20, con siete apuntados».
-- =====================================================================

create or replace function anotar_fecha_borrada() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservas int;
begin
  select count(*) into v_reservas from bookings where event_id = old.id;

  insert into ops_audit_log (actor_id, action, entity, entity_id, payload)
  values (
    null,
    'fecha_borrada',
    'evento',
    old.id,
    jsonb_build_object(
      'empieza_en', old.starts_at,
      'formato',    old.format,
      'zona',       old.zone_slug,
      'ciudad',     old.city_slug,
      'estado',     old.status,
      'reservas',   v_reservas
    )
  );

  return old;
end $$;

drop trigger if exists trg_fecha_borrada on events;
create trigger trg_fecha_borrada
  before delete on events
  for each row execute function anotar_fecha_borrada();

comment on function anotar_fecha_borrada is
  'Deja constancia de una fecha borrada. Va en trigger y no en la ruta '
  'porque el borrado real se hace con la clave de servicio, que no pasa por '
  'ninguna ruta del panel.';

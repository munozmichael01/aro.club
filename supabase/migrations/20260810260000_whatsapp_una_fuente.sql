-- Acabo de crear el duplicado que llevo el dia entero quitando.
--
-- `whatsapp_opt_in` existia como booleano suelto y yo añadi
-- `notificaciones.whatsapp` en el JSON del contrato. Resultado inmediato:
-- los veinte perfiles dicen `whatsapp_opt_in = true` y a la vez
-- `notificaciones.whatsapp = false`. Ya discrepaban antes de que nadie los
-- tocara, porque el booleano venia con un default de cuando se creo la
-- tabla y nadie dio ese permiso jamas.
--
-- La fuente unica es el JSON, que es el contrato de Design y lo que la
-- pantalla edita. El booleano se va. La FECHA se queda —en su columna—
-- porque un consentimiento sin fecha no defiende nada, y un timestamp
-- dentro de un jsonb es un timestamp que nadie indexa ni consulta.

alter table profiles drop column if exists whatsapp_opt_in;

-- Y como nadie lo dio nunca, la fecha se queda en null y el permiso en
-- false, que es la verdad.
update profiles
set notificaciones = jsonb_set(notificaciones, '{whatsapp}', 'false'),
    whatsapp_opt_in_at = null;

comment on column profiles.notificaciones is
  'Cinco claves. `mesa_jueves` y `dia_cena` son fijas: sin ellas no sabe '
  'donde es la cena. `whatsapp` es un PERMISO, no una preferencia, y es la '
  'unica fuente: el booleano suelto que habia se quito porque discrepaba '
  'de este en los veinte perfiles. Su fecha esta en `whatsapp_opt_in_at`.';

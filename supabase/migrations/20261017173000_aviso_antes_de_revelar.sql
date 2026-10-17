-- =====================================================================
-- Marca de que ya avisamos antes de revelar.
--
-- El aviso sale diez minutos antes de cada revelacion y el cron pasa cada
-- cinco, asi que sin marca saldria dos veces, o mas si alguien despliega.
-- Se guarda en la propia fecha: es un hecho de la fecha, no una fila de
-- otra tabla que haya que cruzar para saberlo.
--
-- NOTA, para quien lea las migraciones de hoy: en
-- `20261017170000_revision_antes_de_revelar.sql` anadi el valor
-- `revision_previa` a `email_kind_t` para mandar esto por la cola de
-- correos. Estaba mal y se quedo sin usar: `src/lib/avisos-equipo.ts` dice,
-- escrito desde el primer dia, que los avisos internos NO pasan por
-- `scheduled_emails` ni por el catalogo de plantillas —meter uno ahi lo
-- pone en la lista de correos que un miembro puede recibir, y lo somete a
-- las bajas de correo, que son de los miembros y no nuestras—. Un valor de
-- enum no se puede quitar sin recrear el tipo, asi que se queda ahi,
-- muerto, y esto es el aviso de que no se use.
-- =====================================================================

alter table events
  add column if not exists aviso_previo_at timestamptz;

comment on column events.aviso_previo_at is
  'Cuando se le aviso a operacion de lo que quedaba sin cerrar, diez minutos '
  'antes de la revelacion. Null es que todavia no se ha avisado. Lo escribe '
  '/api/cron/antes-de-revelar y es lo que impide que el aviso se repita.';

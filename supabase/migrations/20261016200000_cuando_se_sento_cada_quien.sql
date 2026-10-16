-- Cuándo se sentó cada quien en su mesa.
--
-- `table_members` guardaba mesa, persona, reserva y número de asiento, y
-- nada más. Sin la hora no se puede distinguir a quien estaba desde el
-- reparto de quien entró después de la revelación, y eso es justo lo que
-- hace falta decir: el 16-10 se sumaron dos personas a dos mesas que ya
-- habían recibido su correo —«son cinco», con cuatro nombres— y los otros
-- diez abrieron la app y vieron una cara de más, sin explicación.
--
-- Michael: «antes un cambio así, aunque ya haya salido la nota de que son 5,
-- mostrar los 6 en la mesa, quizás con una nota de que se unió recientemente».
--
-- La columna nace nula para poder rellenar el pasado con criterio; al final
-- queda `not null` con `now()` por defecto, así que cualquier fila nueva
-- —el reparto, el relleno de un hueco, un asiento dado desde el panel—
-- apunta su hora sola, sin que nadie tenga que acordarse.
alter table table_members add column if not exists sentado_en timestamptz;

-- El pasado, con una regla y no con una lista de nombres.
--
-- La hora de la RESERVA es lo más cerca que tenemos de cuándo entró alguien
-- a esa mesa, pero quien reservó tres días antes no se sentó tres días
-- antes: se sentó cuando se repartió. Así que se toma la más tardía de las
-- dos —su reserva o un minuto antes de la revelación— y sale lo que
-- queremos en los dos casos:
--
--   · quien reservó antes de la revelación queda justo antes de ella, o sea
--     «estaba cuando se contó la mesa»;
--   · quien reservó después queda con su hora, o sea «se sumó después», que
--     es exactamente el caso de las dos personas de esta noche.
--
-- Sin `reveal_at` se usa la hora de la cena: una fecha sin revelación no
-- tiene momento en que se cuente la mesa, y la cena es el último instante
-- en que importa.
-- La reserva se busca con una subconsulta y no con un `join`: en un UPDATE
-- de Postgres, lo que va en el `from` no puede mirar a la tabla que se está
-- actualizando, y `b.id = tm.booking_id` ahí dentro es justo eso.
update table_members tm
set sentado_en = greatest(
  coalesce(
    (select b.created_at from bookings b where b.id = tm.booking_id),
    '-infinity'::timestamptz
  ),
  coalesce(e.reveal_at, e.starts_at) - interval '1 minute'
)
from dinner_tables dt
join events e on e.id = dt.event_id
where dt.id = tm.table_id
  and tm.sentado_en is null;

-- Por si alguna fila se quedó sin reserva que mirar.
update table_members set sentado_en = now() where sentado_en is null;

alter table table_members alter column sentado_en set default now();
alter table table_members alter column sentado_en set not null;

comment on column table_members.sentado_en is
  'Cuándo se sentó en esta mesa. Después de reveal_at = se sumó tarde, y la pantalla lo marca.';

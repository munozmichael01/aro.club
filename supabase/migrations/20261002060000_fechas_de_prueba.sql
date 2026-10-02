-- Una fecha de prueba tiene que ser invisible fuera de sus propias cuentas.
--
-- Lo levantó el agente de la app y era un escape mío: `cuenta-revision.mjs`
-- crea su fecha en `locked` —nunca `open`— porque `/api/proxima` filtra por
-- `open` y una fecha de pruebas abierta saldría contando atrás en la portada.
-- Pero `/api/mi-cuenta` lista TODAS las que no han pasado y no están
-- canceladas, a propósito: una fecha cerrada tiene que verse para que quien
-- llega sepa que el club está vivo. Así que la de pruebas aparecía en la
-- agenda de todo el mundo, en la web y en la app, como «Viernes 2 · 2:51 p.m.
-- · Zona por confirmar».
--
-- `locked` no servía para esto: dice «no admite gente nueva», que es una
-- decisión de operación sobre una fecha REAL. Esconder las de prueba detrás
-- de ese estado era pedirle a un estado que contara dos cosas distintas, y la
-- segunda se escapaba cada vez que alguien ampliaba una consulta con buen
-- criterio.
--
-- Por defecto `false`: lo de antes sigue valiendo y nada existente cambia.

alter table events
  add column if not exists es_prueba boolean not null default false;

comment on column events.es_prueba is
  'Fecha creada por un guion de pruebas. No sale en /api/mi-cuenta, /api/proxima ni en ningun recuento publico. El panel de operacion SI la ve: esconderla de quien la creo seria esconder la basura en vez de poder barrerla.';

-- Marcar las que ya existen y son de prueba: las que montó el guión del
-- revisor, por su restaurante.
update events
set es_prueba = true
where restaurant_id in (select id from restaurants where name = 'La Ventana');

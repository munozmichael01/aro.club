-- Cuando se creo cada pregunta.
--
-- Michael, 18-10, sobre el tope de tres del aviso de Mi cuenta: «ok, con
-- orden de creacion de las preguntas». Hasta ahora la tabla no sabia cuando
-- nacio ninguna: el unico orden era `screen`/`sort_order`, que es el orden en
-- que se PINTAN, y ese lo decide el diseño de la pantalla, no la antiguedad.
--
-- El relleno no es cosmetico. Sin el, las veinte preguntas tendrian la fecha
-- de esta migracion y «orden de creacion» no ordenaria nada: todas iguales.
-- Las dieciocho de siempre se fechan con la version del cuestionario, que es
-- cuando se escribieron de verdad; `copas` y `bebidas` se quedan con el
-- `now()` de hoy, que es cuando nacieron.
alter table questions
  add column if not exists created_at timestamptz not null default now();

update questions q
   set created_at = v.created_at
  from questionnaire_versions v
 where v.id = q.version_id
   and q.key not in ('copas', 'bebidas');

comment on column questions.created_at is
  'Cuando se añadio la pregunta al catalogo. Lo usa el aviso de preguntas '
  'sin contestar de Mi cuenta para decidir cuales de las que faltan enseña '
  'primero: las que llevan mas tiempo esperando.';

-- De qué landing vino el lead (entrega 11 §3).
--
-- Lo ÚNICO que se añade. El contrato de datos no cambia: mismo endpoint,
-- mismo payload, mismos códigos estables. Duplicar el esquema para una
-- segunda landing es lo que haría caro el experimento.
--
-- Sin lógica de reparto: cada página sabe cuál es y lo dice. La asignación
-- de tráfico, la cookie y las métricas se definen cuando se decida arrancar
-- el test; con este campo puesto, se enciende sin tocar el esquema ni
-- volver a desplegar las landings.
alter table waitlist
  add column if not exists variante text check (variante in ('v3', 'v4'));

comment on column waitlist.variante is
  'De que landing vino. Se escribe con el correo, en el PRIMER guardado: '
  'quien abandona en la pregunta 2 tambien queda atribuido. No se '
  'sobrescribe si vuelve por la otra: la atribucion es del primer contacto.';

create index if not exists waitlist_por_variante on waitlist (variante);

-- Los leads que ya existen son de la v3, que es la unica que ha visto
-- trafico. Ponerlos como v3 no es suponer: es donde estaban.
update waitlist set variante = 'v3' where variante is null;

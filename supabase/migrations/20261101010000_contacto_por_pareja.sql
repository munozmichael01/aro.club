-- Lo que se comparte, congelado POR PAREJA.
--
-- Hasta hoy lo que dejaba una persona vivía una sola vez por cena
-- (`contacto_datos`) y la otra persona lo leía en vivo. El agente de la app
-- vio el hueco el 31-10: quien ya se había cruzado con Andrea dando solo su
-- teléfono y después, en esa misma cena, añadía su Instagram para Luis, le
-- enseñaba ese Instagram también a Andrea, que nunca lo recibió. Michael:
-- garantía de que nunca se comparte nada sin que la persona diga QUÉ y CON
-- QUIÉN.
--
-- Ahora cada lado de la coincidencia guarda lo que dio a ESA persona, en el
-- momento de confirmar. `contacto_datos` se queda como «lo último que usó»,
-- para rellenar el formulario, y nada más.

alter table contacto_coincidencias
  add column if not exists datos_a jsonb,
  add column if not exists datos_b jsonb;

comment on column contacto_coincidencias.datos_a is
  'Lo que persona_a dejó a persona_b al confirmar: {telefono, instagram, tiktok}. '
  'Solo se le enseña a persona_b, y solo con el cruce.';
comment on column contacto_coincidencias.datos_b is
  'Lo que persona_b dejó a persona_a al confirmar. Ver datos_a.';

-- Lo ya confirmado, con lo que había: a día de hoy cada quien tiene una sola
-- coincidencia por cena, así que lo guardado es exactamente lo que dio.
update contacto_coincidencias c
   set datos_a = jsonb_build_object('telefono', d.telefono, 'instagram', d.instagram, 'tiktok', d.tiktok)
  from contacto_datos d
 where c.estado_a = 'confirmado' and c.datos_a is null
   and d.table_id = c.table_id and d.profile_id = c.persona_a;

update contacto_coincidencias c
   set datos_b = jsonb_build_object('telefono', d.telefono, 'instagram', d.instagram, 'tiktok', d.tiktok)
  from contacto_datos d
 where c.estado_b = 'confirmado' and c.datos_b is null
   and d.table_id = c.table_id and d.profile_id = c.persona_b;

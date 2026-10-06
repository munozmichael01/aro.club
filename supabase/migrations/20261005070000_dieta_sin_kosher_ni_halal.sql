-- Fuera «Kosher» y «Halal» de la pregunta de dieta.
--
-- Decisión de Michael, y el motivo no es de producto: las dos dicen la
-- religión de quien las marca, y Apple cuenta eso como «Sensitive Info» en
-- las etiquetas de privacidad de la ficha de la App Store. Recogerlas obliga
-- a declararlo, y lo que aportan al reparto —que el sitio tenga algo que esa
-- persona pueda comer— lo cubren las otras opciones.
--
-- **Los códigos de las demás NO se tocan.** El cuestionario guarda por
-- código, así que reordenar o renombrar aquí corrompería respuestas ya
-- guardadas en silencio. Esto solo QUITA dos elementos del array.
--
-- Comprobado antes de escribirlo: cero filas de `answers` usan `kosher` o
-- `halal`. No hay respuesta de nadie que se pierda, y por eso no hace falta
-- decidir a dónde se mueven.

update questions q
set options = (
  select jsonb_agg(o order by idx)
  from jsonb_array_elements(q.options) with ordinality as t(o, idx)
  where o->>'value' not in ('kosher', 'halal')
)
where q.key = 'dieta';

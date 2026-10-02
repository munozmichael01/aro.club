-- «Soy nueva o nuevo en la ciudad».
--
-- La opción `interior` decía «Llegué hace poco y no conozco a nadie», y quien
-- volvió de fuera no sabía cuál era la suya: «Me fui del país y volví»
-- también llegó hace poco y tampoco conoce a nadie. Las dos se leían igual y
-- con esto se decide su mesa.
--
-- **El código NO cambia.** Las respuestas guardadas apuntan a `interior` y
-- siguen valiendo tal cual. Cambia solo la etiqueta, y cambia aquí Y en
-- `public/reglas.js` a la vez: el comentario de ese fichero explica que esta
-- redacción está unificada entre la pantalla, el cuestionario y el catálogo
-- porque ya estuvieron separadas una vez.
--
-- El ORDEN tampoco se toca: el cuestionario guarda por código, pero reordenar
-- aquí mueve la lista que ve la gente sin motivo.

update questions q
set options = (
  select jsonb_agg(
    case
      when o->>'value' = 'interior'
        then jsonb_set(o, '{label}', '"Soy nueva o nuevo en la ciudad"')
      else o
    end
    order by idx
  )
  from jsonb_array_elements(q.options) with ordinality as t(o, idx)
)
where q.key = 'arraigo';

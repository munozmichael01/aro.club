-- «Café o desayuno de networking» se parte en Café y Brunch.
--
-- Michael, 13-10. La etiqueta juntaba tres cosas y dos de ellas no son lo
-- mismo: café no es desayuno. Y «networking» sobraba del todo, porque es el
-- POR QUÉ y eso ya se pregunta aparte, en `motivo` → «Red profesional». El
-- resto de la lista —cena, drinks, correr, senderismo— son todos el momento;
-- esta era la única que metía la intención, y por eso chirriaba.
--
-- A quien eligió `cafe` se le marca también `brunch`, y eso no es ponerle
-- nada que no aceptara: el texto que leyó decía «Café O DESAYUNO», así que el
-- desayuno estaba dentro de lo que marcó. 230 personas.
--
-- `cafe` NO se renombra. Es lo que está guardado en esas 230 respuestas y en
-- `profile_traits.formats`; cambiar el código las perdería todas. Lo que
-- cambia es la etiqueta y lo que se añade es un código nuevo al lado.
update questions
set options = jsonb_build_array(
  jsonb_build_object('label', 'Cena informal',      'value', 'cena'),
  jsonb_build_object('label', 'Cena gourmet',       'value', 'cena-gastronomica'),
  jsonb_build_object('label', 'Café',               'value', 'cafe'),
  jsonb_build_object('label', 'Brunch',             'value', 'brunch'),
  jsonb_build_object('label', 'Drinks / after office', 'value', 'drinks'),
  jsonb_build_object('label', 'Correr',             'value', 'correr'),
  jsonb_build_object('label', 'Senderismo',         'value', 'senderismo'),
  jsonb_build_object('label', 'Pádel o tenis',      'value', 'padel'),
  jsonb_build_object('label', 'Yoga o pilates',     'value', 'pilates'),
  jsonb_build_object('label', 'Ciclismo',           'value', 'ciclismo')
)
where key = 'planes';

-- Y el desayuno que ya habían aceptado, marcado.
--
-- El `where` mira que NO tenga ya `brunch`: correr esto dos veces no puede
-- dejar a nadie con el valor repetido. El trigger de `answers` refresca
-- `profile_traits` solo, así que los formatos se ponen al día sin tocar nada
-- más.
update answers
set value = value || '["brunch"]'::jsonb
where question_key = 'planes'
  and value @> '["cafe"]'::jsonb
  and not (value @> '["brunch"]'::jsonb);

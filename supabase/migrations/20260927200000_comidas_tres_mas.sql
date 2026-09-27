-- Las comidas: tres nuevas y dos etiquetas más precisas.
--
-- Decidido por Michael. NO se funde nada: `pizza` sigue siendo su propia
-- casilla aunque exista `italiana`, porque en Caracas una pizzería y un
-- italiano son sitios distintos y quien quiere lo uno no quiere lo otro.
-- Al no retirarse ningún código, ninguna respuesta guardada se toca.
--
-- Las tres nuevas:
--   tailandesa  y  india  salen de dentro de `asiatica`, que hasta hoy se
--     llamaba «China y asiática» y era un cajón donde no cabía pedir tailandés
--     sin pedir chino. Por eso `asiatica` pasa a llamarse «China»: ya no es el
--     cajón de todo lo asiático, es un país. El CÓDIGO se queda como está —
--     cambiarlo rompería las respuestas ya dadas—, así que aquí el código y la
--     etiqueta dejan de parecerse, y es a propósito.
--   autor  es el hueco que de verdad tenía la lista: la cocina de autor y la
--     fusión es justo lo que reserva un club de cenas curadas, y hasta hoy un
--     sitio así no encajaba en ninguna casilla.
--
-- Y dos etiquetas:
--   `mariscos`  «Mariscos» → «Pescados y mariscos». La anterior dejaba fuera
--     a quien quiere pescado, que no es lo mismo.
--   `mercado`   «De mercado y vegetales» → «De mercado y vegetariana».
--     «Vegetales» suena a guarnición y quien come vegetariano no se reconocía
--     ahí. Ojo: esto es GUSTO, no la restricción de `dieta`, que es aparte.
--
-- La lista vive además en `AroReglas.COCINAS`, que es la que usa la ficha del
-- local en el panel. Va en el mismo commit o se desincroniza mañana.

update questions
   set options = '[{"value": "venezolana", "label": "Venezolana"}, {"value": "parrilla", "label": "Parrilla y carnes"}, {"value": "italiana", "label": "Italiana"}, {"value": "pizza", "label": "Pizza"}, {"value": "japonesa", "label": "Japonesa"}, {"value": "asiatica", "label": "China"}, {"value": "tailandesa", "label": "Tailandesa"}, {"value": "india", "label": "India"}, {"value": "peruana", "label": "Peruana"}, {"value": "mexicana", "label": "Mexicana"}, {"value": "espanola", "label": "Española"}, {"value": "mediterranea", "label": "Mediterránea"}, {"value": "arabe", "label": "Árabe"}, {"value": "mariscos", "label": "Pescados y mariscos"}, {"value": "autor", "label": "De autor y fusión"}, {"value": "mercado", "label": "De mercado y vegetariana"}, {"value": "hamburguesas", "label": "Hamburguesas"}]'::jsonb
 where key = 'comidas';

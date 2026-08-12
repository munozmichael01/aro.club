-- «Las dos cosas por igual» pasa de segunda a tercera.
--
-- Puesta en medio se elige por estar en medio. Y esa es justo la respuesta
-- que menos ayuda a armar una mesa: no distingue a nadie. Al final la elige
-- quien de verdad no tiene preferencia.
--
-- Se puede reordenar sin tocar nada mas porque lo que se guarda es el codigo
-- estable, no la posicion: quien ya respondio 'ambas' sigue respondiendo
-- 'ambas'. Es exactamente para esto que los codigos no son indices.

update questions
   set options = '[{"value":"conversacion","label":"La conversación, el restaurante es la excusa"},{"value":"comida","label":"La comida, vengo por la experiencia gastronómica"},{"value":"ambas","label":"Las dos cosas por igual"}]'::jsonb
 where key = 'peso';

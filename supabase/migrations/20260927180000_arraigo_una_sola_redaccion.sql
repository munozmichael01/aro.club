-- El arraigo, una sola redacción.
--
-- Había tres: la de la puerta («Llegué y no conozco a nadie»), la del
-- cuestionario («Me mudé a Caracas desde el interior») y esta («Llegué de
-- otra ciudad y no conozco a nadie»). Las tres con los mismos códigos, así
-- que nada se corrompía al guardar — pero dos de ellas no querían decir lo
-- mismo, y con esta respuesta se decide con quién se sienta la persona.
--
-- El caso que lo enseña: alguien que acaba de mudarse a Caracas desde fuera
-- del país. Por la puerta encontraba «Llegué y no conozco a nadie» y marcaba
-- `interior`, que es lo correcto. Por el cuestionario leía «desde el
-- interior», no le cuadraba, y acababa en «Vivo en el exterior y estoy de
-- visita» — `visita`, que es quien está de paso y se va. El reparto los trata
-- distinto, y con razón.
--
-- La redacción del cuestionario era además la más vieja de las tres: de
-- ANTES de que la entrega 7 retirara `extranjero` y lo fusionara dentro de
-- `interior`. O sea que volvía a abrir el hueco que esa entrega cerró.
--
-- Por eso `interior` ya no dice de dónde se llega. El cajón es «acabo de
-- llegar y no conozco a nadie», se venga de Valencia o de Madrid. Y tampoco
-- nombra la ciudad, para que siga valiendo el día que se abra otra.
--
-- Los códigos NO cambian: ninguna respuesta guardada se toca. Cambia lo que
-- se lee, en los tres sitios a la vez.

update questions
   set options = '[{"value": "volvio", "label": "Me fui del país y volví"}, {"value": "se-quedo", "label": "Nunca me fui, pero casi todos sí"}, {"value": "interior", "label": "Llegué hace poco y no conozco a nadie"}, {"value": "visita", "label": "Estoy de paso"}, {"value": "mismos", "label": "Sigo con la gente de siempre"}, {"value": "remoto", "label": "Trabajo remoto y casi no veo gente"}]'::jsonb
 where key = 'arraigo';

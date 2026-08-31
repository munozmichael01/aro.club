-- Deshace 20260830120000. Fue un error mio y no lo pidio nadie.
--
-- Michael pidio abrir el 10 de septiembre para Chacao y Las Mercedes: eso son
-- las zonas de ESA FECHA, en `event_venues`. Yo apague once zonas en la tabla
-- `zones`, que es de donde el cuestionario saca su lista, y eso limita a quien
-- se da de alta: alguien de Altamira dejaba de poder decir que vive en
-- Altamira. Son dos cosas distintas y las confundi.
--
-- La lista del alta no se toca NUNCA. Que la gente diga donde puede ir es un
-- dato suyo, y sirve para decidir donde abrir la proxima fecha: recortarlo
-- para que cuadre con las fechas de esta semana es tirar la informacion que
-- dice donde hay demanda. Abrir o no una zona en una fecha concreta es otra
-- decision, y vive en la fecha.

update zones set is_active = true where city_slug = 'caracas';

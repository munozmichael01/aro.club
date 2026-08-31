-- Solo dos zonas abiertas para la primera campana: Las Mercedes y Chacao.
--
-- Estaban las trece activas y eso hace lo contrario de lo que hace falta
-- ahora. El cuestionario las saca de `/api/zonas`, que filtra por activas, asi
-- que trece casillas reparten a la gente en trece bolsas y el reparto no puede
-- juntarlas: quien marca solo una zona sin fecha abierta va a espera y le sale
-- «esta vez no entraste» sin haber hecho nada mal. El panel ya avisa de eso
-- —«no acepta ninguna de las zonas abiertas»— y con una campana detras se
-- vuelve la norma.
--
-- Las dos elegidas son ademas las dos mas aceptadas por quien ya contesto:
-- mercedes 17 y chacao 15, y la tercera baja a 4. No es una corazonada.
--
-- Esto NO borra nada. `is_active` es un interruptor: quien ya declaro Altamira
-- conserva su respuesta en `answers` y en `profile_traits`, y el dia que haya
-- local alli se vuelve a encender y su respuesta sigue valiendo. De los
-- perfiles con zonas declaradas, uno solo no acepta ninguna de las dos.
--
-- Y no toca el cuestionario ni sus posiciones: las opciones de zonas son
-- dinamicas, no estan escritas en la pantalla.

update zones set is_active = false
where city_slug = 'caracas' and slug not in ('mercedes', 'chacao');

update zones set is_active = true
where city_slug = 'caracas' and slug in ('mercedes', 'chacao');

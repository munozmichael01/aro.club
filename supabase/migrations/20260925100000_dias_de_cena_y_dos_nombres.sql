-- Los días que de verdad se ofrecen, y dos cenas con otro nombre.
--
-- ## Los días
--
-- Se retiran cuatro: `mar`, `mie`, `sab-md` y `dom-md`. Quedan cinco —jueves
-- noche, viernes noche, sábado mañana, sábado noche y domingo mañana—, que
-- son los que Aro va a abrir.
--
-- Es una decisión de producto de Michael, no una limpieza: martes y miércoles
-- no van a tener mesa, y preguntar por una disponibilidad que nunca se usa
-- ensucia el reparto —alguien que solo puede los martes sale contestado y
-- completo, y no hay mesa a la que pueda ir nunca—.
--
-- Se quitan del catálogo A LA VEZ que de las pantallas. Si se quitan solo de
-- la pantalla, el comprobador lo llama error y con razón: una opción que la
-- base conoce y nadie puede elegir es una opción muerta.
--
-- ## Lo ya contestado NO se toca
--
-- Once leads tienen alguno de los cuatro códigos entre sus días. No se
-- reescriben: es lo que esa persona contestó y borrarlo es inventar otra
-- respuesta. Un código retirado sencillamente no cruza con ninguna fecha, y
-- las pantallas lo ignoran al pintar. Todos menos dos —y los dos son
-- direcciones de prueba— conservan al menos un día vigente.
--
-- Mismo criterio que la entrega 7 con `extranjero`: se retira la opción, se
-- deja escrito el porqué, y lo guardado se queda como testimonio.
--
-- ## Y los dos nombres
--
-- «Cena en restaurante» pasa a «Cena informal» y «Cena con foco
-- gastronómico» a «Cena gourmet». Solo el texto: los códigos `cena` y
-- `cena-gastronomica` no se tocan, porque están en las respuestas de todo el
-- mundo y en `profile_traits.formats`.

update questions
set options = (
  select jsonb_agg(o order by n)
  from jsonb_array_elements(options) with ordinality as t(o, n)
  where o->>'value' not in ('mar', 'mie', 'sab-md', 'dom-md')
)
where key = 'dias'
  and version_id in (select id from questionnaire_versions where is_active);

update questions
set options = (
  select jsonb_agg(
    case o->>'value'
      when 'cena' then jsonb_set(o, '{label}', '"Cena informal"')
      when 'cena-gastronomica' then jsonb_set(o, '{label}', '"Cena gourmet"')
      else o
    end
    order by n)
  from jsonb_array_elements(options) with ordinality as t(o, n)
)
where key = 'planes'
  and version_id in (select id from questionnaire_versions where is_active);

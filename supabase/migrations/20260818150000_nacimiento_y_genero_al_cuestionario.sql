-- =====================================================================
-- El nacimiento y el género pasan a ser preguntas del cuestionario.
--
-- Son datos de EMPAREJAMIENTO, igual que las zonas o los temas: la edad
-- decide la horquilla de diez años y el género el equilibrio de la mesa. La
-- propia pantalla de datos ya lo explicaba así —«para que en tu mesa no haya
-- más de diez años de diferencia», «para que la mesa quede balanceada»— pero
-- se pedían al final, junto al nombre y el teléfono, que son identidad y
-- contacto. Cada dato va donde está su razón de ser.
--
-- SOBRE LA VERSIÓN. Van a v3, la activa, y no a una v4. `refrescar_rasgos`
-- lee las respuestas de la versión ACTIVA: activar una v4 dejaría las 102
-- respuestas existentes fuera de foco y los rasgos se vaciarían en el
-- siguiente refresco —el pool del reparto, vacío—. Una versión nueva es para
-- cuando cambia el significado de una respuesta; añadir dos preguntas no es
-- otro cuestionario, es el mismo con dos más, y «sin contestar» ya es un
-- estado que el sistema maneja.
--
-- SOBRE EL TIPO. `nacimiento` estrena `input_type = 'date'`. La columna es
-- texto libre y el comentario del esquema inicial ya reservaba ese nombre
-- —'single','multi','text','scale','date'—, así que no hay restricción que
-- levantar. Con `text` cualquiera podría mandar «hola» y ni el validador ni
-- el comprobador sabrían que eso era una fecha. El valor viaja como
-- `YYYY-MM-DD` y el servidor exige fecha real, 18 años cumplidos y menos de
-- 120.
--
-- DÓNDE ATERRIZAN, que es lo que no puede salir mal. En NINGÚN caso en el
-- jsonb: `nacimiento` va a `waitlist.birthdate` y `genero` a
-- `waitlist.gender` —columnas que ya existen— por el mismo mecanismo que ya
-- usan arraigo, zonas, días y temas. De ahí `convertir_lead` las lleva a
-- `profiles`, y `refrescar_rasgos` sigue derivando `profile_traits.age` y
-- `.gender` DESDE `profiles`, que es la fuente de siempre. Ni la vista
-- `v_matching_pool` ni el reparto se enteran de este cambio, que es
-- exactamente lo que se busca: una sola verdad, en la misma columna de antes.
--
-- El orden: el nacimiento es la PRIMERA pregunta de todas. Es la puerta de
-- los 18 años y no se puede rechazar a alguien después de diecisiete
-- preguntas.
-- =====================================================================

insert into questions
  (version_id, key, prompt, help_text, input_type, options,
   min_select, max_select, is_required, is_matching_input,
   exclusive_value, layout, autocomplete, screen, sort_order)
select v.id, x.*
from questionnaire_versions v,
(values
  ('nacimiento',
   '¿Cuándo naciste?',
   'Nadie ve tu edad exacta. La usamos para que en tu mesa no haya más de diez años de diferencia entre la persona más joven y la mayor: es lo que hace que la conversación fluya.',
   'date', null::jsonb, null::int, null::int, true, true, null::text, null::text, null::jsonb, 1, 2),

  ('genero',
   '¿Con qué género te identificas?',
   'No se muestra a nadie. Sirve para que la mesa quede balanceada y no acabes siendo la única persona de tu género en el grupo.',
   'single',
   -- Los cuatro de `gender_t`, con las etiquetas que ya usa la pantalla de
   -- datos: no se reescriben aquí para que no haya dos textos para lo mismo.
   '[{"value":"mujer","label":"Mujer"},
     {"value":"hombre","label":"Hombre"},
     {"value":"no-binario","label":"No binario"},
     {"value":"sin-decir","label":"Prefiero no decirlo"}]'::jsonb,
   null::int, null::int, true, true, null::text, null::text, null::jsonb, 1, 4)
) as x(key, prompt, help_text, input_type, options,
       min_select, max_select, is_required, is_matching_input,
       exclusive_value, layout, autocomplete, screen, sort_order)
where v.version = 'v3'
on conflict (version_id, key) do update set
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  input_type = excluded.input_type,
  options = excluded.options,
  is_required = excluded.is_required,
  is_matching_input = excluded.is_matching_input,
  screen = excluded.screen,
  sort_order = excluded.sort_order;

comment on column questions.input_type is
  'single, multi, text o date. `date` no lleva `options`: el valor es una '
  'fecha YYYY-MM-DD y lo valida el servidor —fecha real, 18 años cumplidos—. '
  'Lo estrenó `nacimiento` al pasar del formulario de datos al cuestionario.';

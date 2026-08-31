-- Una pregunta mas: las tres comidas favoritas.
--
-- Hasta ahora del apartado de comer solo se sabia el PRESUPUESTO —`gasto`, que
-- es lo que fija el techo del sitio— la RESTRICCION —`dieta`— y si viene por la
-- conversacion o por la comida —`peso`—. Nada sobre que le gusta comer, que es
-- justo lo que hace falta para elegir el restaurante de una fecha.
--
-- Tres, ni una ni siete. Con una se elige el sitio de una persona; con siete no
-- se descarta nada. Tres obliga a priorizar y deja una interseccion util
-- cuando se cruzan seis respuestas.
--
-- Y son cocinas de restaurante, no ingredientes: es lo que se puede buscar en
-- un mapa. Pizza va aparte de italiana a proposito —una pizzeria y una
-- trattoria son dos salidas distintas— y la parrilla aparte de las carnes por
-- lo mismo.
--
-- Va en la version 3, que es la activa. Una version nueva obligaria a que todo
-- el mundo volviera a contestar las diecinueve, y lo unico que cambia es que
-- hay una mas: quien ya termino la vera como pendiente en su perfil y la
-- contesta sola.
--
-- Se guarda con codigos estables, no por posicion. Reordenar la lista no puede
-- mover una respuesta de sitio.

insert into questions (
  version_id, key, prompt, help_text, input_type, options,
  min_select, max_select, is_required, is_matching_input, screen, sort_order, layout
) values (
  3,
  'comidas',
  'Elige tus 3 comidas favoritas',
  'Con esto elegimos el restaurante de tu fecha. No es una alergia: eso va en la última pregunta.',
  'multi',
  '[
    {"label":"Venezolana","value":"venezolana"},
    {"label":"Parrilla y carnes","value":"parrilla"},
    {"label":"Italiana","value":"italiana"},
    {"label":"Pizza","value":"pizza"},
    {"label":"Sushi y japonesa","value":"japonesa"},
    {"label":"Hamburguesas","value":"hamburguesas"},
    {"label":"Mediterránea","value":"mediterranea"},
    {"label":"Española","value":"espanola"},
    {"label":"Mexicana","value":"mexicana"},
    {"label":"Peruana","value":"peruana"},
    {"label":"China y asiática","value":"asiatica"},
    {"label":"Mariscos","value":"mariscos"},
    {"label":"Árabe","value":"arabe"},
    {"label":"De mercado y vegetales","value":"mercado"}
  ]'::jsonb,
  3, 3, true, true, 4, 125, null
)
on conflict do nothing;

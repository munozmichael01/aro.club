-- =====================================================================
-- Cuestionario v2 — el contrato de datos de la entrega de diseño.
--
-- GENERADO por scripts/generar-cuestionario.mjs. No editar a mano: se
-- regenera y se pierde. Cambia la definición del script y vuelve a correrlo.
--
-- Las claves de pregunta y los códigos de opción son los de las pantallas
-- entregadas. Reordenar opciones o reescribir una etiqueta NO cambia la
-- respuesta de nadie, porque nada se guarda por índice ni por texto.
--
-- La landing muestra 10 zonas y 10 temas; el cuestionario 13 y 18, y en
-- distinto orden. El código es lo único que las une.
-- =====================================================================

-- Columnas que la entrega necesita y el esquema no tenía.
alter table questions
  add column if not exists exclusive_value text,
  add column if not exists layout text,
  add column if not exists autocomplete jsonb;

comment on column questions.exclusive_value is
  'Codigo de la opcion que se excluye con el resto ("ninguno", "ninguna"): '
  'marcarla desmarca las demas y viceversa.';

-- Fuera el cuestionario anterior: sus claves y valores estaban en ingles y
-- no son los del contrato. No hay respuestas que preservar todavia.
delete from answers where version_id in (select id from questionnaire_versions);
delete from questions where version_id in (select id from questionnaire_versions);
update questionnaire_versions set is_active = false;

insert into questionnaire_versions (version, is_active, published_at)
values ('v2', true, now())
on conflict (version) do update set is_active = true, published_at = now();

insert into questions (
  version_id, key, prompt, help_text, input_type, options,
  min_select, max_select, is_required, is_matching_input,
  exclusive_value, layout, autocomplete, screen, sort_order
)
select v.id, x.* from questionnaire_versions v,
(values
  ('arraigo', '¿Cuál de estas se parece más a tu historia?', null, 'single', '[{"value":"volvio","label":"Me fui del país y volví"},{"value":"se-quedo","label":"Nunca me fui de Venezuela"},{"value":"interior","label":"Me mudé a Caracas desde el interior"},{"value":"extranjero","label":"Soy extranjero viviendo aquí"},{"value":"visita","label":"Vivo en el exterior y estoy de visita"}]'::jsonb, null, null, true, true, null, null, null, 1, 10),
  ('sector', '¿En qué sector trabajas?', null, 'single', '[{"value":"tecnologia","label":"Tecnología"},{"value":"finanzas","label":"Finanzas"},{"value":"salud","label":"Salud"},{"value":"educacion","label":"Educación"},{"value":"consultoria","label":"Consultoría"},{"value":"legal","label":"Legal"},{"value":"marketing","label":"Marketing"},{"value":"medios","label":"Medios"},{"value":"diseno","label":"Diseño"},{"value":"comercio","label":"Comercio"},{"value":"manufactura","label":"Manufactura"},{"value":"energia","label":"Energía"},{"value":"construccion","label":"Construcción"},{"value":"gastronomia","label":"Gastronomía"},{"value":"ong","label":"ONG"},{"value":"gobierno","label":"Gobierno"},{"value":"emprendo","label":"Emprendo por mi cuenta"},{"value":"estudio","label":"Estudio"},{"value":"entre-trabajos","label":"Entre trabajos"},{"value":"otro","label":"Otro"}]'::jsonb, null, null, true, true, null, 'compacta', null, 1, 20),
  ('empleador', '¿Dónde trabajas actualmente?', 'Solo lo usamos para intentar no sentarte con alguien de tu empresa. No se le muestra a nadie.', 'text', null, null, null, true, false, null, null, '["Banesco","Mercantil","BBVA Provincial","Polar","Farmatodo","Locatel","Movistar","Digitel","Ridery","Yummy","PDVSA","Deloitte","EY","KPMG","Universidad Metropolitana","Universidad Católica Andrés Bello"]'::jsonb, 1, 30),
  ('momento', '¿En qué momento estás?', null, 'single', '[{"value":"soltero-sin-hijos","label":"Soltero sin hijos"},{"value":"soltero-con-hijos","label":"Soltero con hijos"},{"value":"pareja-sin-hijos","label":"En pareja sin hijos"},{"value":"pareja-con-hijos","label":"En pareja con hijos"},{"value":"no-decir","label":"Prefiero no decirlo"}]'::jsonb, null, null, true, true, null, null, null, 1, 40),
  ('rol', 'En una mesa con gente que no conoces, ¿cómo eres?', null, 'single', '[{"value":"escucha","label":"Escucho más de lo que hablo"},{"value":"depende","label":"Depende del momento"},{"value":"lleva","label":"Suelo llevar la conversación"}]'::jsonb, null, null, true, true, null, null, null, 2, 50),
  ('motivo', '¿Qué te trae?', null, 'single', '[{"value":"ampliar","label":"Ampliar mi círculo"},{"value":"volver-a-salir","label":"Volver a salir después de un tiempo"},{"value":"fuera-del-trabajo","label":"Conocer gente fuera del trabajo"},{"value":"reconectar","label":"Reconectar con Caracas después de volver"},{"value":"red-profesional","label":"Red profesional"}]'::jsonb, null, null, true, true, null, null, null, 2, 60),
  ('romance', 'Aro no es una app de citas, pero a veces pasa. ¿Cómo lo ves?', 'Esta respuesta no se le muestra a nadie, nunca, en ninguna pantalla del producto. Solo la usa el algoritmo para no juntar expectativas opuestas.', 'single', '[{"value":"abierto","label":"Abierto, si surge algo bienvenido"},{"value":"indiferente","label":"Me da igual, vengo por la conversación"},{"value":"cerrado","label":"Prefiero una mesa sin esa energía"}]'::jsonb, null, null, false, false, null, null, null, 2, 70),
  ('actividades', 'Escoge lo que de verdad haces, no lo que te gustaría hacer', null, 'multi', '[{"value":"cocinar","label":"Cocinar"},{"value":"salir-a-comer","label":"Salir a comer"},{"value":"correr","label":"Correr"},{"value":"gimnasio","label":"Gimnasio"},{"value":"yoga","label":"Yoga o pilates"},{"value":"ciclismo","label":"Ciclismo"},{"value":"senderismo","label":"Senderismo"},{"value":"playa","label":"Playa"},{"value":"padel","label":"Pádel o tenis"},{"value":"futbol","label":"Fútbol"},{"value":"beisbol","label":"Béisbol"},{"value":"nadar","label":"Nadar"},{"value":"bailar","label":"Bailar"},{"value":"conciertos","label":"Conciertos"},{"value":"cine","label":"Cine"},{"value":"teatro","label":"Teatro"},{"value":"museos","label":"Museos"},{"value":"leer","label":"Leer"},{"value":"escribir","label":"Escribir"},{"value":"fotografia","label":"Fotografía"},{"value":"instrumento","label":"Tocar un instrumento"},{"value":"videojuegos","label":"Videojuegos"},{"value":"juegos-de-mesa","label":"Juegos de mesa"},{"value":"viajar","label":"Viajar"},{"value":"voluntariado","label":"Voluntariado"},{"value":"estudiar","label":"Estudiar algo por mi cuenta"},{"value":"plantas","label":"Cuidar plantas"}]'::jsonb, 3, 6, true, true, null, null, null, 2, 80),
  ('temas', '¿De qué podrías hablar dos horas seguidas?', null, 'multi', '[{"value":"cocina","label":"Cocina y restaurantes"},{"value":"viajes","label":"Viajes"},{"value":"cine","label":"Cine y series"},{"value":"musica","label":"Música"},{"value":"libros","label":"Libros"},{"value":"deporte","label":"Deporte"},{"value":"negocios","label":"Negocios y emprender"},{"value":"tecnologia","label":"Tecnología"},{"value":"arte","label":"Arte y diseño"},{"value":"arquitectura","label":"Arquitectura"},{"value":"ciencia","label":"Ciencia"},{"value":"historia","label":"Historia"},{"value":"psicologia","label":"Psicología"},{"value":"politica","label":"Política"},{"value":"economia","label":"Economía"},{"value":"crianza","label":"Crianza"},{"value":"salud","label":"Salud y bienestar"},{"value":"humor","label":"Humor y absurdos"}]'::jsonb, 2, 4, true, true, null, null, null, 3, 90),
  ('evitar', '¿Hay algún tema que prefieras que no salga?', 'Se lo decimos al anfitrión de la mesa, sin decir de quién viene.', 'multi', '[{"value":"politica","label":"Política y situación del país"},{"value":"religion","label":"Religión y fe"},{"value":"dinero","label":"Dinero, sueldos y precios"},{"value":"vida-amorosa","label":"Vida amorosa y relaciones"},{"value":"crianza","label":"Crianza e hijos"},{"value":"trabajo","label":"Trabajo, vengo a desconectarme"},{"value":"ninguno","label":"Ninguno, hablo de todo"}]'::jsonb, null, null, false, true, 'ninguno', null, null, 3, 100),
  ('planes', '¿Qué planes te interesan?', 'Hoy solo hay cenas. Lo demás lo abrimos según lo que pida la gente.', 'multi', '[{"value":"cena","label":"Cena en restaurante"},{"value":"cena-gastronomica","label":"Cena con foco gastronómico"},{"value":"cafe","label":"Café o desayuno de networking"},{"value":"drinks","label":"Drinks / after office"},{"value":"correr","label":"Correr"},{"value":"senderismo","label":"Senderismo"},{"value":"padel","label":"Pádel o tenis"},{"value":"pilates","label":"Yoga o pilates"},{"value":"ciclismo","label":"Ciclismo"}]'::jsonb, null, null, true, true, null, null, null, 4, 110),
  ('peso', 'En una cena, ¿qué pesa más para ti?', null, 'single', '[{"value":"conversacion","label":"La conversación, el restaurante es la excusa"},{"value":"ambas","label":"Las dos cosas por igual"},{"value":"comida","label":"La comida, vengo por la experiencia gastronómica"}]'::jsonb, null, null, true, true, null, null, null, 4, 120),
  ('gasto', '¿Cuánto piensas gastar en la cena, sin contar lo que pagas aquí?', 'Responde con honestidad: elegimos el restaurante con el número más bajo de la mesa, así que marcar de más solo hace que la noche te salga cara.', 'single', '[{"value":"hasta-20","label":"Hasta 20 USD"},{"value":"20-35","label":"20 a 35 USD"},{"value":"35-50","label":"35 a 50 USD"},{"value":"mas-50","label":"Más de 50 USD"}]'::jsonb, null, null, true, true, null, null, null, 4, 130),
  ('dieta', '¿Alguna restricción alimentaria?', null, 'multi', '[{"value":"ninguna","label":"Ninguna"},{"value":"vegetariano","label":"Vegetariano"},{"value":"vegano","label":"Vegano"},{"value":"pescetariano","label":"Pescetariano"},{"value":"sin-gluten","label":"Sin gluten"},{"value":"sin-lactosa","label":"Sin lactosa"},{"value":"kosher","label":"Kosher"},{"value":"halal","label":"Halal"},{"value":"sin-cerdo","label":"No como cerdo"},{"value":"sin-carnes-rojas","label":"No como carnes rojas"},{"value":"diabetico","label":"Diabético"},{"value":"alergias","label":"Alergias"}]'::jsonb, null, null, false, true, 'ninguna', null, null, 4, 140),
  ('zonas', '¿En qué zonas puedes asistir sin problema?', null, 'multi', '[{"value":"mercedes","label":"Las Mercedes"},{"value":"rosal","label":"El Rosal"},{"value":"bello-monte","label":"Bello Monte"},{"value":"chacao","label":"Chacao"},{"value":"altamira","label":"Altamira"},{"value":"castellana","label":"La Castellana"},{"value":"palos-grandes","label":"Los Palos Grandes"},{"value":"sebucan","label":"Sebucán y Los Dos Caminos"},{"value":"chuao","label":"Chuao"},{"value":"cafetal","label":"El Cafetal y Santa Paula"},{"value":"naranjos","label":"Los Naranjos y Cerro Verde"},{"value":"trinidad","label":"La Trinidad y La Tahona"},{"value":"hatillo","label":"El Hatillo"}]'::jsonb, 1, null, true, true, null, null, null, 5, 150),
  ('dias', '¿Qué días te sirven mejor?', null, 'multi', '[{"value":"mar","label":"Martes noche"},{"value":"mie","label":"Miércoles noche"},{"value":"jue","label":"Jueves noche"},{"value":"vie","label":"Viernes noche"},{"value":"sab","label":"Sábado noche"},{"value":"sab-md","label":"Sábado mediodía"},{"value":"dom-md","label":"Domingo mediodía"}]'::jsonb, 1, null, true, true, null, null, null, 5, 160),
  ('idiomas', '¿En qué idiomas conversas cómodo?', null, 'multi', '[{"value":"es","label":"Español"},{"value":"en","label":"Inglés"},{"value":"pt","label":"Portugués"},{"value":"it","label":"Italiano"},{"value":"fr","label":"Francés"},{"value":"de","label":"Alemán"},{"value":"ar","label":"Árabe"},{"value":"zh","label":"Chino"}]'::jsonb, 1, null, true, true, null, null, null, 5, 170)
) as x(key, prompt, help_text, input_type, options,
       min_select, max_select, is_required, is_matching_input,
       exclusive_value, layout, autocomplete, screen, sort_order)
where v.version = 'v2';

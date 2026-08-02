-- =====================================================================
-- ARO CLUB - Datos de referencia
-- Zonas, productos, cuestionario v1 (17 preguntas en 5 pantallas) y
-- cuentas de cobro con datos ficticios hasta que operaciones cargue los reales.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ZONAS
-- Solo este de Caracas. Se descartan a proposito Sabana Grande, La
-- Candelaria, El Paraiso y el Centro Historico: tienen densidad de locales,
-- pero son las zonas que el analisis de seguridad desaconseja de noche, y
-- este producto tiene gente saliendo sola a las 19:00. El criterio no es
-- densidad de restaurantes, es donde alguien va solo sin pensarlo dos veces.
-- ---------------------------------------------------------------------

insert into zones (slug, name, municipality, sort_order) values
  ('las_mercedes',     'Las Mercedes',                'Baruta',    10),
  ('el_rosal',         'El Rosal',                    'Chacao',    20),
  ('bello_monte',      'Bello Monte',                 'Baruta',    30),
  ('chacao',           'Chacao',                      'Chacao',    40),
  ('altamira',         'Altamira',                    'Chacao',    50),
  ('la_castellana',    'La Castellana',               'Chacao',    60),
  ('los_palos_grandes','Los Palos Grandes',           'Chacao',    70),
  ('sebucan',          'Sebucán y Los Dos Caminos',   'Sucre',     80),
  ('chuao',            'Chuao',                       'Baruta',    90),
  ('el_cafetal',       'El Cafetal y Santa Paula',    'Baruta',   100),
  ('los_naranjos',     'Los Naranjos y Cerro Verde',  'El Hatillo',110),
  ('la_trinidad',      'La Trinidad y La Tahona',     'Baruta',   120),
  ('el_hatillo',       'El Hatillo',                  'El Hatillo',130);


-- ---------------------------------------------------------------------
-- PRODUCTOS
-- Sin suscripcion: se descarto. Pago por evento + pack de 4.
-- El precio se anclo en el gasto discrecional caraqueno real: el consumo
-- del restaurante corre aparte (20-35 USD segun tramo), asi que un precio
-- alto aqui mata la densidad, que es el riesgo numero uno.
-- No mas barato de 5 porque sin dinero en juego el no-show se dispara.
-- ---------------------------------------------------------------------

insert into products (sku, name, kind, price_usd, credits_granted, sort_order) values
  ('founding',      'Miembro fundador',   'single',       5.00, null, 10),
  ('single_dinner', 'Cena suelta',        'single',       8.00, null, 20),
  ('pack_4',        'Pack 4 encuentros',  'credit_pack', 28.00,    4, 30);


-- ---------------------------------------------------------------------
-- CUENTAS DE COBRO - DATOS FICTICIOS
-- Operaciones los reemplaza desde el panel. Estan en tabla y no en
-- variables de entorno a proposito: cambiar un numero de cuenta no puede
-- exigir un despliegue.
-- ---------------------------------------------------------------------

insert into payment_accounts
  (method, label, bank_name, bank_code, phone_e164, document_id, account_number, account_holder, instructions, sort_order)
values
  ('pago_movil', 'Pago Móvil', 'Banesco', '0134', '+584125550134', 'J-000000000',
   null, 'Aro Club C.A.',
   'Paga el monto exacto, hasta los céntimos. Así identificamos tu pago sin que tengas que esperar.', 10),
  ('bank_transfer', 'Transferencia inmediata', 'Banesco', '0134', null, 'J-000000000',
   '01340000000000000000', 'Aro Club C.A.',
   'Paga el monto exacto, hasta los céntimos. Así identificamos tu pago sin que tengas que esperar.', 20);


-- ---------------------------------------------------------------------
-- CUESTIONARIO v1
-- 17 preguntas, 5 pantallas. Cada una alimenta el matcher o la operacion.
-- Ninguna esta por rellenar.
--
-- Pesos del score sobre mesas completas:
--   cohesion (interests)        0.30
--   diversidad de industria     0.25
--   mezcla de arraigo           0.20
--   balance de energia          0.15
--   novedad de red              0.10  (derivada de pair_encounters)
-- ---------------------------------------------------------------------

insert into questionnaire_versions (version, is_active, published_at)
values ('v1', true, now());

-- =========================== PANTALLA 1 ==============================
-- Tu contexto. El arraigo va de primero a proposito: es peso 0.20 y ademas
-- le dice al usuario de que va el producto en la primera pregunta.

insert into questions
  (version_id, key, prompt, help_text, input_type, options, min_select, max_select,
   is_required, is_matching_input, screen, sort_order)
values
(1, 'rootedness',
 '¿Cuál de estas se parece más a tu historia?', null, 'single',
 '[{"value":"returnee","label":"Me fui del país y volví"},
   {"value":"stayed","label":"Nunca me fui de Venezuela"},
   {"value":"relocated","label":"Me mudé a Caracas desde el interior"},
   {"value":"foreigner","label":"Soy extranjero viviendo aquí"},
   {"value":"visiting","label":"Vivo en el exterior y estoy de visita"}]'::jsonb,
 null, null, true, true, 1, 10),

(1, 'industry',
 '¿En qué sector trabajas?', null, 'single',
 '[{"value":"tech","label":"Tecnología"},
   {"value":"finance","label":"Finanzas y banca"},
   {"value":"health","label":"Salud"},
   {"value":"education","label":"Educación"},
   {"value":"consulting","label":"Consultoría"},
   {"value":"legal","label":"Legal"},
   {"value":"marketing","label":"Marketing y publicidad"},
   {"value":"media","label":"Medios y comunicación"},
   {"value":"design","label":"Diseño y creatividad"},
   {"value":"retail","label":"Comercio y retail"},
   {"value":"manufacturing","label":"Manufactura e industria"},
   {"value":"energy","label":"Energía y petróleo"},
   {"value":"construction","label":"Construcción e inmobiliaria"},
   {"value":"hospitality","label":"Gastronomía y hotelería"},
   {"value":"ngo","label":"ONG y sector social"},
   {"value":"government","label":"Gobierno"},
   {"value":"founder","label":"Emprendo por mi cuenta"},
   {"value":"student","label":"Estudio"},
   {"value":"between_jobs","label":"Entre trabajos"},
   {"value":"other","label":"Otro"}]'::jsonb,
 null, null, true, true, 1, 20),

(1, 'employer',
 '¿Dónde trabajas actualmente?',
 'Solo lo usamos para intentar no sentarte con alguien de tu empresa. No se le muestra a nadie.',
 'text', null, null, null, true, true, 1, 30),

(1, 'life_stage',
 '¿En qué momento estás?',
 'Nos ayuda a que la mesa tenga referencias parecidas. No se le muestra a nadie.',
 'single',
 '[{"value":"single_no_kids","label":"Soltero o soltera, sin hijos"},
   {"value":"single_kids","label":"Soltero o soltera, con hijos"},
   {"value":"partnered_no_kids","label":"En pareja, sin hijos"},
   {"value":"partnered_kids","label":"En pareja, con hijos"},
   {"value":"undisclosed","label":"Prefiero no decirlo"}]'::jsonb,
 null, null, true, true, 1, 40);


-- =========================== PANTALLA 2 ==============================
-- Como eres en la mesa.

insert into questions
  (version_id, key, prompt, help_text, input_type, options, min_select, max_select,
   is_required, is_matching_input, screen, sort_order)
values
(1, 'social_energy',
 'En una mesa con gente que no conoces, ¿cómo eres?', null, 'single',
 '[{"value":"listener","label":"Escucho más de lo que hablo"},
   {"value":"balanced","label":"Depende del momento"},
   {"value":"driver","label":"Suelo llevar la conversación"}]'::jsonb,
 null, null, true, true, 2, 10),

(1, 'intention',
 '¿Qué te trae?', null, 'single',
 '[{"value":"friends","label":"Ampliar mi círculo"},
   {"value":"back_out","label":"Volver a salir después de un tiempo"},
   {"value":"outside_work","label":"Conocer gente fuera del trabajo"},
   {"value":"reconnect","label":"Reconectar con Caracas después de volver"},
   {"value":"professional","label":"Red profesional"}]'::jsonb,
 null, null, true, true, 2, 20),

-- Si tres vienen a hacer amigos y tres vienen a ligar, los seis pasan mala
-- noche. Fingir que la dimension no existe no la elimina: se la esconde al
-- matcher. NO se usa para emparejar a nadie, solo para no sentar a quien
-- eligio 'closed' con cuatro que eligieron 'open'. NUNCA se muestra.
(1, 'romantic_openness',
 'Aro no es una app de citas, pero a veces pasa. ¿Cómo lo ves?',
 'Nadie ve tu respuesta. La usamos solo para que la mesa tenga expectativas parecidas.',
 'single',
 '[{"value":"open","label":"Abierto. Si surge algo, bienvenido"},
   {"value":"neutral","label":"Me da igual. Vengo por la conversación"},
   {"value":"closed","label":"Prefiero una mesa sin esa energía"}]'::jsonb,
 null, null, false, true, 2, 30),

-- Peso 0.30, el mas alto. El minimo son 3 porque con menos, "al menos 2
-- intereses compartidos por 4 de los 6" es matematicamente improbable.
(1, 'interests',
 'Escoge lo que de verdad haces, no lo que te gustaría hacer',
 'Elige entre 3 y 6.',
 'multi',
 '[{"value":"cooking","label":"Cocinar"},
   {"value":"running","label":"Correr"},
   {"value":"gym","label":"Gimnasio"},
   {"value":"padel","label":"Pádel o tenis"},
   {"value":"football","label":"Fútbol"},
   {"value":"baseball","label":"Béisbol"},
   {"value":"yoga","label":"Yoga o pilates"},
   {"value":"hiking","label":"Senderismo"},
   {"value":"beach","label":"Playa"},
   {"value":"travel","label":"Viajar"},
   {"value":"reading","label":"Leer"},
   {"value":"film","label":"Cine y series"},
   {"value":"live_music","label":"Música en vivo"},
   {"value":"instrument","label":"Tocar un instrumento"},
   {"value":"art","label":"Arte y museos"},
   {"value":"photography","label":"Fotografía"},
   {"value":"gaming","label":"Videojuegos"},
   {"value":"board_games","label":"Juegos de mesa"},
   {"value":"wine","label":"Vinos y coctelería"},
   {"value":"coffee","label":"Café de especialidad"},
   {"value":"startups","label":"Emprender"},
   {"value":"ai","label":"Tecnología e IA"},
   {"value":"investing","label":"Inversiones"},
   {"value":"current_affairs","label":"Actualidad"},
   {"value":"volunteering","label":"Voluntariado"},
   {"value":"pets","label":"Mascotas"},
   {"value":"dancing","label":"Bailar"},
   {"value":"cars","label":"Carros y motos"}]'::jsonb,
 3, 6, true, true, 2, 40);


-- =========================== PANTALLA 3 ==============================
-- De que hablas. conversation_topics hace doble trabajo: alimenta cohesion
-- y es el "dato de conversacion" que se muestra en la mesa el dia del evento.

insert into questions
  (version_id, key, prompt, help_text, input_type, options, min_select, max_select,
   is_required, is_matching_input, screen, sort_order)
values
(1, 'conversation_topics',
 '¿De qué podrías hablar dos horas seguidas?',
 'Elige entre 2 y 4.',
 'multi',
 '[{"value":"travel","label":"Viajes"},
   {"value":"food","label":"Comida y restaurantes"},
   {"value":"career","label":"Trabajo y carrera"},
   {"value":"entrepreneurship","label":"Emprendimiento"},
   {"value":"ai","label":"Tecnología e IA"},
   {"value":"film","label":"Cine y series"},
   {"value":"books","label":"Libros"},
   {"value":"music","label":"Música"},
   {"value":"sports","label":"Deportes"},
   {"value":"science","label":"Ciencia"},
   {"value":"history","label":"Historia"},
   {"value":"psychology","label":"Psicología y desarrollo personal"},
   {"value":"politics","label":"País y política"},
   {"value":"economy","label":"Economía e inversiones"},
   {"value":"parenting","label":"Crianza"},
   {"value":"art","label":"Arte y diseño"},
   {"value":"spirituality","label":"Espiritualidad y fe"},
   {"value":"fashion","label":"Moda y estilo"}]'::jsonb,
 2, 4, true, true, 3, 10),

-- Restriccion negativa: no sentar a alguien cuyo dealbreaker es X con tres
-- personas cuyo tema favorito es X. "none" es exclusiva en la interfaz.
(1, 'dealbreakers',
 '¿Hay algún tema que prefieras que no salga?',
 'Opcional.',
 'multi',
 '[{"value":"politics","label":"Política y situación del país"},
   {"value":"religion","label":"Religión y fe"},
   {"value":"money","label":"Dinero, sueldos y precios"},
   {"value":"romance","label":"Vida amorosa y relaciones"},
   {"value":"parenting","label":"Crianza e hijos"},
   {"value":"work","label":"Trabajo, vengo a desconectarme"},
   {"value":"none","label":"Ninguno, hablo de todo"}]'::jsonb,
 null, null, false, true, 3, 20);


-- =========================== PANTALLA 4 ==============================
-- Que buscas y cuanto.

insert into questions
  (version_id, key, prompt, help_text, input_type, options, min_select, max_select,
   is_required, is_matching_input, screen, sort_order)
values
-- El MVP solo opera cenas. Esto captura demanda futura: las actividades son
-- puertas de entrada paralelas, no una continuidad de la cena.
(1, 'formats',
 '¿Qué planes te interesan?',
 'Hoy solo hacemos cenas. Lo demás lo abrimos según lo que pida la gente.',
 'multi',
 '[{"value":"dinner","label":"Cena en restaurante"},
   {"value":"foodie_dinner","label":"Cena con foco gastronómico"},
   {"value":"coffee","label":"Café o desayuno de networking"},
   {"value":"drinks","label":"Drinks / after office"},
   {"value":"run","label":"Correr"},
   {"value":"hike","label":"Senderismo"},
   {"value":"padel","label":"Pádel o tenis"},
   {"value":"pilates","label":"Yoga o pilates"},
   {"value":"cycling","label":"Ciclismo"}]'::jsonb,
 1, null, true, true, 4, 10),

-- Ademas de segmentar foodies, determina a que restaurante va la mesa: los
-- mejores sitios gastronomicos suelen ser los mas ruidosos, y una mesa que
-- viene a conversar en un sitio de 85 decibelios es una mesa arruinada.
(1, 'dining_focus',
 'En una cena, ¿qué pesa más para ti?', null, 'single',
 '[{"value":"conversation","label":"La conversación. El restaurante es la excusa"},
   {"value":"both","label":"Las dos cosas por igual"},
   {"value":"food","label":"La comida. Vengo por la experiencia gastronómica"}]'::jsonb,
 null, null, true, true, 4, 20),

-- Restriccion dura: una mesa abarca como maximo dos tramos contiguos.
-- Nunca un tier 1 con un tier 3. Arregla la queja mas repetida del
-- referente: te mandan a un sitio mas caro del que elegiste.
(1, 'budget_tier',
 '¿Cuánto piensas gastar en la cena, sin contar lo que pagas aquí?',
 'No hay respuesta mejor que otra. Nos sirve para no mandarte a un sitio que no era.',
 'single',
 '[{"value":"1","label":"Hasta 20 USD","help":"Casual, sin complicaciones"},
   {"value":"2","label":"Entre 20 y 35 USD","help":"Un buen restaurante, sin excesos"},
   {"value":"3","label":"Entre 35 y 50 USD","help":"Me gusta comer bien"},
   {"value":"4","label":"Más de 50 USD","help":"El precio no es lo que decide"}]'::jsonb,
 null, null, true, true, 4, 30),

-- Operativa, no matching: alimenta la eleccion de restaurante.
(1, 'dietary',
 '¿Alguna restricción alimentaria?',
 'Opcional.',
 'multi',
 '[{"value":"none","label":"Ninguna"},
   {"value":"vegetarian","label":"Vegetariano"},
   {"value":"vegan","label":"Vegano"},
   {"value":"pescatarian","label":"Pescetariano"},
   {"value":"gluten_free","label":"Sin gluten (celiaquía)"},
   {"value":"lactose_free","label":"Sin lactosa"},
   {"value":"kosher","label":"Kosher"},
   {"value":"halal","label":"Halal"},
   {"value":"no_pork","label":"No como cerdo"},
   {"value":"no_red_meat","label":"No como carnes rojas"},
   {"value":"diabetic","label":"Diabético o bajo en azúcar"},
   {"value":"allergies","label":"Alergias (especificar)"}]'::jsonb,
 null, null, false, false, 4, 40);


-- =========================== PANTALLA 5 ==============================
-- Logistica. Se cierra con lo facil.

insert into questions
  (version_id, key, prompt, help_text, input_type, options, min_select, max_select,
   is_required, is_matching_input, screen, sort_order)
values
(1, 'zones',
 '¿En qué zonas puedes asistir sin problema?',
 'Mientras más marques, antes te toca mesa.',
 'multi',
 '[{"value":"las_mercedes","label":"Las Mercedes"},
   {"value":"el_rosal","label":"El Rosal"},
   {"value":"bello_monte","label":"Bello Monte"},
   {"value":"chacao","label":"Chacao"},
   {"value":"altamira","label":"Altamira"},
   {"value":"la_castellana","label":"La Castellana"},
   {"value":"los_palos_grandes","label":"Los Palos Grandes"},
   {"value":"sebucan","label":"Sebucán y Los Dos Caminos"},
   {"value":"chuao","label":"Chuao"},
   {"value":"el_cafetal","label":"El Cafetal y Santa Paula"},
   {"value":"los_naranjos","label":"Los Naranjos y Cerro Verde"},
   {"value":"la_trinidad","label":"La Trinidad y La Tahona"},
   {"value":"el_hatillo","label":"El Hatillo"}]'::jsonb,
 1, null, true, true, 5, 10),

-- Viernes y sabado noche son los unicos con segundo acto.
(1, 'availability',
 '¿Qué días te sirven mejor?', null, 'multi',
 '[{"value":"tue_pm","label":"Martes noche"},
   {"value":"wed_pm","label":"Miércoles noche"},
   {"value":"thu_pm","label":"Jueves noche"},
   {"value":"fri_pm","label":"Viernes noche"},
   {"value":"sat_pm","label":"Sábado noche"},
   {"value":"sat_am","label":"Sábado mediodía"},
   {"value":"sun_am","label":"Domingo mediodía"}]'::jsonb,
 1, null, true, true, 5, 20),

-- La mesa se arma sobre un idioma que compartan los seis. El arabe entra
-- por la comunidad libanesa y siria de Caracas, y conecta con halal.
(1, 'languages',
 '¿En qué idiomas conversas cómodo?', null, 'multi',
 '[{"value":"es","label":"Español"},
   {"value":"en","label":"Inglés"},
   {"value":"pt","label":"Portugués"},
   {"value":"it","label":"Italiano"},
   {"value":"fr","label":"Francés"},
   {"value":"de","label":"Alemán"},
   {"value":"ar","label":"Árabe"},
   {"value":"zh","label":"Chino"}]'::jsonb,
 1, null, true, true, 5, 30);

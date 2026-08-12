/**
 * Genera la migración del cuestionario v2 desde una definición única.
 *
 * Por qué existe: son 17 preguntas y 150+ opciones. Teclear ese JSON a mano
 * dentro de un .sql es la forma más fácil de desalinear un código de su
 * etiqueta, y ese error no falla: guarda la respuesta equivocada en silencio.
 *
 * Los códigos de arraigo, zonas, dias y temas vienen de HANDOFF.md §2.1 y no
 * se tocan. El resto se definen aquí y a partir de ahora son estables: se
 * puede reescribir la etiqueta visible, nunca el código.
 *
 *   node scripts/generar-cuestionario.mjs
 */
import { writeFileSync } from 'node:fs'

/** [código, etiqueta] */
const P = {
  // Seis, no cinco. `extranjero` se fusiono en `interior` —quien llego de
  // Bogota y quien llego de Maracaibo tienen el mismo problema: no conocen
  // a nadie aqui— y entran `mismos` y `remoto`, que no exigen haber
  // emigrado. Ese requisito sesgaba el producto hacia los treinta y muchos.
  //
  // Los dos nuevos van AL FINAL aunque en la landing salgan en otro orden:
  // el orden de este array no es el de pantalla, es el del contrato.
  arraigo: [
    ['volvio', 'Me fui del país y volví'],
    ['se-quedo', 'Nunca me fui de Venezuela'],
    ['interior', 'Llegué de otra ciudad y no conozco a nadie'],
    ['visita', 'Estoy de paso'],
    ['mismos', 'Sigo con la gente de siempre'],
    ['remoto', 'Trabajo remoto y casi no veo gente'],
  ],
  sector: [
    ['tecnologia', 'Tecnología'], ['finanzas', 'Finanzas'], ['salud', 'Salud'],
    ['educacion', 'Educación'], ['consultoria', 'Consultoría'], ['legal', 'Legal'],
    ['marketing', 'Marketing'], ['medios', 'Medios'], ['diseno', 'Diseño'],
    ['comercio', 'Comercio'], ['manufactura', 'Manufactura'], ['energia', 'Energía'],
    ['construccion', 'Construcción'], ['gastronomia', 'Gastronomía'], ['ong', 'ONG'],
    ['gobierno', 'Gobierno'], ['emprendo', 'Emprendo por mi cuenta'],
    ['estudio', 'Estudio'], ['entre-trabajos', 'Entre trabajos'], ['otro', 'Otro'],
  ],
  momento: [
    ['soltero-sin-hijos', 'Soltero sin hijos'],
    ['soltero-con-hijos', 'Soltero con hijos'],
    ['pareja-sin-hijos', 'En pareja sin hijos'],
    ['pareja-con-hijos', 'En pareja con hijos'],
    ['no-decir', 'Prefiero no decirlo'],
  ],
  rol: [
    ['escucha', 'Escucho más de lo que hablo'],
    ['depende', 'Depende del momento'],
    ['lleva', 'Suelo llevar la conversación'],
  ],
  motivo: [
    ['ampliar', 'Ampliar mi círculo'],
    ['volver-a-salir', 'Volver a salir después de un tiempo'],
    ['fuera-del-trabajo', 'Conocer gente fuera del trabajo'],
    ['reconectar', 'Reconectar con Caracas después de volver'],
    ['red-profesional', 'Red profesional'],
  ],
  romance: [
    ['abierto', 'Abierto, si surge algo bienvenido'],
    ['indiferente', 'Me da igual, vengo por la conversación'],
    ['cerrado', 'Prefiero una mesa sin esa energía'],
  ],
  actividades: [
    ['cocinar', 'Cocinar'], ['salir-a-comer', 'Salir a comer'], ['correr', 'Correr'],
    ['gimnasio', 'Gimnasio'], ['yoga', 'Yoga o pilates'], ['ciclismo', 'Ciclismo'],
    ['senderismo', 'Senderismo'], ['playa', 'Playa'], ['padel', 'Pádel o tenis'],
    ['futbol', 'Fútbol'], ['beisbol', 'Béisbol'], ['nadar', 'Nadar'],
    ['bailar', 'Bailar'], ['conciertos', 'Conciertos'], ['cine', 'Cine'],
    ['teatro', 'Teatro'], ['museos', 'Museos'], ['leer', 'Leer'],
    ['escribir', 'Escribir'], ['fotografia', 'Fotografía'],
    ['instrumento', 'Tocar un instrumento'], ['videojuegos', 'Videojuegos'],
    ['juegos-de-mesa', 'Juegos de mesa'], ['viajar', 'Viajar'],
    ['voluntariado', 'Voluntariado'], ['estudiar', 'Estudiar algo por mi cuenta'],
    ['plantas', 'Cuidar plantas'],
  ],
  temas: [
    ['cocina', 'Cocina y restaurantes'], ['viajes', 'Viajes'], ['cine', 'Cine y series'],
    ['musica', 'Música'], ['libros', 'Libros'], ['deporte', 'Deporte'],
    ['negocios', 'Negocios y emprender'], ['tecnologia', 'Tecnología'],
    ['arte', 'Arte y diseño'], ['arquitectura', 'Arquitectura'], ['ciencia', 'Ciencia'],
    ['historia', 'Historia'], ['psicologia', 'Psicología'], ['politica', 'Política'],
    ['economia', 'Economía'], ['crianza', 'Crianza'], ['salud', 'Salud y bienestar'],
    ['humor', 'Humor y absurdos'],
  ],
  evitar: [
    ['politica', 'Política y situación del país'], ['religion', 'Religión y fe'],
    ['dinero', 'Dinero, sueldos y precios'], ['vida-amorosa', 'Vida amorosa y relaciones'],
    ['crianza', 'Crianza e hijos'], ['trabajo', 'Trabajo, vengo a desconectarme'],
    ['ninguno', 'Ninguno, hablo de todo'],
  ],
  planes: [
    ['cena', 'Cena en restaurante'], ['cena-gastronomica', 'Cena con foco gastronómico'],
    ['cafe', 'Café o desayuno de networking'], ['drinks', 'Drinks / after office'],
    ['correr', 'Correr'], ['senderismo', 'Senderismo'], ['padel', 'Pádel o tenis'],
    ['pilates', 'Yoga o pilates'], ['ciclismo', 'Ciclismo'],
  ],
  peso: [
    ['conversacion', 'La conversación, el restaurante es la excusa'],
    ['comida', 'La comida, vengo por la experiencia gastronómica'],
    // La intermedia va al final: puesta en medio se elige por estar en
    // medio, y "las dos por igual" no distingue a nadie al armar la mesa.
    ['ambas', 'Las dos cosas por igual'],
  ],
  gasto: [
    ['hasta-20', 'Hasta 20 USD'], ['20-35', '20 a 35 USD'],
    ['35-50', '35 a 50 USD'], ['mas-50', 'Más de 50 USD'],
  ],
  dieta: [
    ['ninguna', 'Ninguna'], ['vegetariano', 'Vegetariano'], ['vegano', 'Vegano'],
    ['pescetariano', 'Pescetariano'], ['sin-gluten', 'Sin gluten'],
    ['sin-lactosa', 'Sin lactosa'], ['kosher', 'Kosher'], ['halal', 'Halal'],
    ['sin-cerdo', 'No como cerdo'], ['sin-carnes-rojas', 'No como carnes rojas'],
    ['diabetico', 'Diabético'], ['alergias', 'Alergias'],
  ],
  // 13 zonas, en el orden del cuestionario. La landing muestra 10 y en otro
  // orden: por eso el codigo es obligatorio.
  zonas: [
    ['mercedes', 'Las Mercedes'], ['rosal', 'El Rosal'], ['bello-monte', 'Bello Monte'],
    ['chacao', 'Chacao'], ['altamira', 'Altamira'], ['castellana', 'La Castellana'],
    ['palos-grandes', 'Los Palos Grandes'], ['sebucan', 'Sebucán y Los Dos Caminos'],
    ['chuao', 'Chuao'], ['cafetal', 'El Cafetal y Santa Paula'],
    ['naranjos', 'Los Naranjos y Cerro Verde'], ['trinidad', 'La Trinidad y La Tahona'],
    ['hatillo', 'El Hatillo'],
  ],
  dias: [
    ['mar', 'Martes noche'], ['mie', 'Miércoles noche'], ['jue', 'Jueves noche'],
    ['vie', 'Viernes noche'], ['sab', 'Sábado noche'], ['sab-md', 'Sábado mediodía'],
    ['dom-md', 'Domingo mediodía'],
  ],
  idiomas: [
    ['es', 'Español'], ['en', 'Inglés'], ['pt', 'Portugués'], ['it', 'Italiano'],
    ['fr', 'Francés'], ['de', 'Alemán'], ['ar', 'Árabe'], ['zh', 'Chino'],
  ],
}

const EMPRESAS = [
  'Banesco', 'Mercantil', 'BBVA Provincial', 'Polar', 'Farmatodo', 'Locatel',
  'Movistar', 'Digitel', 'Ridery', 'Yummy', 'PDVSA', 'Deloitte', 'EY', 'KPMG',
  'Universidad Metropolitana', 'Universidad Católica Andrés Bello',
]

const PANTALLAS = [
  {
    n: 1,
    titulo: 'Tu contexto',
    proposito: 'Con esto evitamos sentarte con alguien de tu misma empresa y armamos mesas donde las historias se entiendan entre sí.',
    preguntas: [
      { id: 'arraigo', tipo: 'single' },
      { id: 'sector', tipo: 'single', layout: 'compacta' },
      { id: 'empleador', tipo: 'text', ayuda: 'Solo lo usamos para intentar no sentarte con alguien de tu empresa. No se le muestra a nadie.', autocomplete: EMPRESAS },
    ],
  },
  {
    n: 2,
    titulo: 'Cómo eres en la mesa',
    proposito: 'Una mesa donde todos llevan la conversación no funciona, y una donde nadie la lleva tampoco.',
    preguntas: [
      { id: 'momento', tipo: 'single' },
      { id: 'rol', tipo: 'single' },
      { id: 'motivo', tipo: 'single' },
      { id: 'romance', tipo: 'single', opcional: true, ayuda: 'Esta respuesta no se le muestra a nadie, nunca, en ninguna pantalla del producto. Solo la usa el algoritmo para no juntar expectativas opuestas.' },
    ],
  },
  {
    n: 3,
    titulo: 'De qué hablas',
    proposito: 'Es lo que más pesa a la hora de armar el grupo: dos horas se sostienen con temas, no con datos.',
    preguntas: [
      { id: 'temas', tipo: 'multi', min: 2, max: 4 },
      { id: 'evitar', tipo: 'multi', opcional: true, exclusiva: 'ninguno', ayuda: 'Se lo decimos al anfitrión de la mesa, sin decir de quién viene.' },
      { id: 'actividades', tipo: 'multi', min: 3, max: 6 },
    ],
  },
  {
    n: 4,
    titulo: 'Qué buscas y cuánto',
    proposito: 'El rango que marques es el techo del sitio que elegimos. Nadie ve tu respuesta y no hay mesa mejor por gastar más.',
    preguntas: [
      { id: 'planes', tipo: 'multi', ayuda: 'Hoy solo hay cenas. Lo demás lo abrimos según lo que pida la gente.' },
      { id: 'peso', tipo: 'single' },
      { id: 'gasto', tipo: 'single', ayuda: 'Responde con honestidad: elegimos el restaurante con el número más bajo de la mesa, así que marcar de más solo hace que la noche te salga cara.' },
    ],
  },
  {
    n: 5,
    titulo: 'Logística',
    proposito: 'Lo último. Con esto sabemos a qué mesa puedes llegar de verdad.',
    preguntas: [
      { id: 'zonas', tipo: 'multi', min: 1 },
      { id: 'dias', tipo: 'multi', min: 1 },
      { id: 'idiomas', tipo: 'multi', min: 1 },
      { id: 'dieta', tipo: 'multi', opcional: true, exclusiva: 'ninguna' },
    ],
  },
]

const ENUNCIADOS = {
  arraigo: '¿Te suena alguna de estas?',
  sector: '¿En qué sector trabajas?',
  empleador: '¿Dónde trabajas actualmente?',
  momento: '¿En qué momento estás?',
  rol: 'En una mesa con gente que no conoces, ¿cómo eres?',
  motivo: '¿Qué te trae?',
  romance: 'Aro no es una app de citas, pero a veces pasa. ¿Cómo lo ves?',
  actividades: 'Escoge lo que de verdad haces, no lo que te gustaría hacer',
  temas: '¿De qué podrías hablar dos horas seguidas?',
  evitar: '¿Hay algún tema que prefieras que no salga?',
  planes: '¿Qué planes te interesan?',
  peso: 'En una cena, ¿qué pesa más para ti?',
  gasto: '¿Cuánto piensas gastar en la cena, sin contar lo que pagas aquí?',
  dieta: '¿Alguna restricción alimentaria?',
  zonas: '¿En qué zonas puedes asistir sin problema?',
  dias: '¿Qué días te sirven mejor?',
  idiomas: '¿En qué idiomas conversas cómodo?',
}

// --- comprobaciones antes de emitir nada -----------------------------------
const problemas = []
for (const [clave, opciones] of Object.entries(P)) {
  const codigos = opciones.map((o) => o[0])
  const repes = codigos.filter((c, i) => codigos.indexOf(c) !== i)
  if (repes.length) problemas.push(`${clave}: código repetido ${repes.join(', ')}`)
  for (const c of codigos) {
    if (!/^[a-z0-9-]+$/.test(c)) problemas.push(`${clave}: código inválido "${c}"`)
  }
}
const ids = PANTALLAS.flatMap((p) => p.preguntas.map((q) => q.id))
if (ids.length !== 17) problemas.push(`son ${ids.length} preguntas, deberían ser 17`)
// HANDOFF-3 §3 dice 4/4/3/3/3, pero los tres movimientos que describe dan
// 3/4/3/3/4, que es lo que trae el archivo entregado. Manda el archivo.
const reparto = PANTALLAS.map((p) => p.preguntas.length).join('/')
if (reparto !== '3/4/3/3/4') problemas.push(`el reparto es ${reparto}, debería ser 3/4/3/3/4`)
for (const q of PANTALLAS.flatMap((p) => p.preguntas)) {
  if (!ENUNCIADOS[q.id]) problemas.push(`${q.id}: sin enunciado`)
  if (q.tipo !== 'text' && !P[q.id]) problemas.push(`${q.id}: sin opciones`)
  if (q.exclusiva && !P[q.id].some((o) => o[0] === q.exclusiva)) {
    problemas.push(`${q.id}: la opción exclusiva "${q.exclusiva}" no existe`)
  }
}
if (problemas.length) {
  console.error('El catálogo no cuadra:\n  ' + problemas.join('\n  '))
  process.exit(1)
}

// --- emisión ---------------------------------------------------------------
const sql = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const filas = []
let orden = 0
for (const pant of PANTALLAS) {
  for (const q of pant.preguntas) {
    orden += 10
    const opciones = q.tipo === 'text'
      ? null
      : JSON.stringify(P[q.id].map(([value, label]) => ({ value, label })))
    filas.push([
      sql(q.id),
      sql(ENUNCIADOS[q.id]),
      sql(q.ayuda ?? null),
      sql(q.tipo),
      opciones ? `${sql(opciones)}::jsonb` : 'null',
      q.min ?? 'null',
      q.max ?? 'null',
      q.opcional ? 'false' : 'true',
      q.id === 'empleador' || q.id === 'romance' ? 'false' : 'true',
      sql(q.exclusiva ?? null),
      sql(q.layout ?? null),
      q.autocomplete ? `${sql(JSON.stringify(q.autocomplete))}::jsonb` : 'null',
      pant.n,
      orden,
    ].join(', '))
  }
}

const salida = `-- =====================================================================
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

-- El catalogo se ACTUALIZA, no se reconstruye.
--
-- La primera version borraba answers y questions enteras. Entonces no habia
-- nada que perder; ahora si: veinte personas con sus diecisiete respuestas.
-- Un generador que se ejecuta dos veces y borra los datos reales es una
-- bomba con temporizador, y el temporizador es la proxima vez que alguien
-- cambie una etiqueta.
--
-- Las respuestas viven por su clave de pregunta, asi que cambiar el enunciado o
-- las opciones de una pregunta no las invalida. Lo que si invalidaria seria
-- quitar un codigo, y eso se migra a mano antes (ver la migracion del
-- arraigo).
insert into questionnaire_versions (version, is_active, published_at)
values ('v3', true, now())
on conflict (version) do update set is_active = true, published_at = now();

insert into questions (
  version_id, key, prompt, help_text, input_type, options,
  min_select, max_select, is_required, is_matching_input,
  exclusive_value, layout, autocomplete, screen, sort_order
)
select v.id, x.* from questionnaire_versions v,
(values
  ${filas.map((f) => `(${f})`).join(',\n  ')}
) as x(key, prompt, help_text, input_type, options,
       min_select, max_select, is_required, is_matching_input,
       exclusive_value, layout, autocomplete, screen, sort_order)
where v.version = 'v3'
on conflict (version_id, key) do update set
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  input_type = excluded.input_type,
  options = excluded.options,
  min_select = excluded.min_select,
  max_select = excluded.max_select,
  is_required = excluded.is_required,
  is_matching_input = excluded.is_matching_input,
  exclusive_value = excluded.exclusive_value,
  layout = excluded.layout,
  autocomplete = excluded.autocomplete,
  screen = excluded.screen,
  sort_order = excluded.sort_order;

-- Y las preguntas que ya no estan en el catalogo se van, con sus
-- respuestas: si la pregunta no existe, la respuesta no significa nada.
delete from answers a
 using questionnaire_versions v
 where a.version_id = v.id and v.version = 'v3'
   and a.question_key not in (${filas.map((f) => f.split(',')[0].trim()).join(', ')});

delete from questions q
 using questionnaire_versions v
 where q.version_id = v.id and v.version = 'v3'
   and q.key not in (${filas.map((f) => f.split(',')[0].trim()).join(', ')});
`

const VERSION = 'v3'
const SELLO = '20260809190000'

// Cada tanda emite su PROPIA migracion. Sobrescribir la anterior no
// cambia nada en la base —ya se aplico— y deja el historial diciendo algo
// que no ocurrio. El nombre lleva la version para que se vea cual manda.
const destino = `supabase/migrations/${SELLO}_cuestionario_${VERSION}.sql`
writeFileSync(destino, salida)
console.log(`${destino}\nGenerado: 17 preguntas, ${Object.values(P).reduce((n, o) => n + o.length, 0)} opciones, 5 pantallas.`)

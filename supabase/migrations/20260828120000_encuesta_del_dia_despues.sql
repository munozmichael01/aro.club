-- =====================================================================
-- Entrega 16 · la encuesta del dia despues.
--
-- La pantalla existia y guardaba bien, y tiene cero respuestas: no habia
-- ningun correo que llevara a ella ni ruta que la sirviera. Al escribir el
-- correo se vio que lo que se preguntaba tampoco cuadraba con la base.
--
-- 1 · LA ESCALA IBA AL REVES
--
-- La pantalla manda el indice del boton: 0 es «Excelente» y 3 es «Mala». La
-- columna `conversation_rating` es 1..5 y mas es mejor. Guardar el indice tal
-- cual invierte la nota: la mesa perfecta entra como un 0 y la peor como un 3,
-- y el emparejamiento aprende justo lo contrario de lo que le dijeron.
--
-- La pantalla manda: cuatro grados. La columna pasa a 1..4 con mas = mejor
-- (Excelente=4, Bien=3, Regular=2, Mala=1). La conversion vive en UNA funcion
-- del servidor, `notaDesdeIndice` en src/lib/encuesta.ts, con el porque al
-- lado. La tabla esta vacia, asi que estrechar el CHECK no rompe nada.
--
-- `nps` no se toca. Nadie la pregunta todavia y no es esta encuesta.
--
-- 2 · LAS CUATRO NOTAS DEL SITIO NO CABIAN
--
-- Habia un unico `restaurant_rating`, y hacen falta cuatro: ambiente,
-- servicio, «se podia conversar» y comida. Se guardan por persona y por cena
-- —es lo unico que se puede preguntar— pero lo que miden es el LOCAL, no la
-- mesa, y esa diferencia era el fallo de la ficha de Locales: ensena
-- `notaDeLasMesas`, que sale de «¿volverias a esa mesa?» y mide a la gente.
-- Renovar o no a un proveedor con esa nota castiga a un restaurante impecable
-- porque a alguien le toco una mesa aburrida. La vista `v_nota_de_local` las
-- promedia por restaurante y es la que rellena el `valoracion: null` que la
-- ficha lleva esperando.
--
-- `restaurant_rating` se queda donde esta. Esta vacia y no estorba, y estas
-- cuatro son mas finas que ella, no otra cosa.
--
-- 3 · `would_repeat` CAMBIA DE SIGNIFICADO
--
-- Era «volveria a esa mesa». Esa mesa no se repite nunca —el veto de tres
-- meses lo impide— asi que no decidia nada. Ahora es «volveria a Aro Club»,
-- que es la pregunta que faltaba. La tabla esta vacia: el cambio es gratis y
-- queda escrito aqui para que nadie lea las filas viejas con el sentido nuevo,
-- porque no hay filas viejas.
--
-- 4 · LO QUE NO SE PREGUNTA
--
-- Ya no se pasa por las cinco personas una a una. Esa combinacion de seis no
-- se repite, asi que un «si repetiria con X» no se puede aplicar a nada. El
-- unico dato util es el negativo, y va como salida opcional al final, en
-- `exclusions`, donde ya vivia.
--
-- Y quien vino lo marca operacion, no la persona: `bookings.status` tiene el
-- valor 'attended' desde el principio y NADIE lo escribia en todo src/.
-- =====================================================================

-- --- 1. la escala de la mesa ----------------------------------------------
alter table table_feedback drop constraint if exists table_feedback_conversation_rating_check;
alter table table_feedback add constraint table_feedback_conversation_rating_check
  check (conversation_rating between 1 and 4);

comment on column table_feedback.conversation_rating is
  'Que tal la mesa que le armamos, el grupo entero y nunca persona a persona. '
  '4 Excelente, 3 Bien, 2 Regular, 1 Mala. La pantalla manda el indice al reves '
  '(0 es Excelente) y lo da la vuelta notaDesdeIndice en src/lib/encuesta.ts.';

-- --- 2. las cuatro del sitio ----------------------------------------------
alter table table_feedback
  add column if not exists sitio_ambiente   int check (sitio_ambiente   between 1 and 4),
  add column if not exists sitio_servicio   int check (sitio_servicio   between 1 and 4),
  add column if not exists sitio_conversar  int check (sitio_conversar  between 1 and 4),
  add column if not exists sitio_comida     int check (sitio_comida     between 1 and 4);

comment on column table_feedback.sitio_conversar is
  'Asi se pregunta el ruido: «se podia conversar». Cabe en la misma escala que '
  'las otras tres sin sonar raro. 4 es que se podia sin esfuerzo. Ojo: '
  'restaurants.noise_level va al reves (1 es lo bueno) y es de operacion, no de aqui.';

-- --- 3. would_repeat ------------------------------------------------------
comment on column table_feedback.would_repeat is
  'Si volveria a ARO CLUB, no a esa mesa. Cambio de significado en la entrega '
  '16 con la tabla vacia. La pregunta vieja no decidia nada: esa mesa no se '
  'repite nunca porque el veto de tres meses lo impide.';

-- --- la nota del local, por fin suya --------------------------------------
create or replace view v_nota_de_local as
select
  dt.restaurant_id,
  count(*)                                        as respuestas,
  round(avg(tf.sitio_ambiente)::numeric,  2)      as ambiente,
  round(avg(tf.sitio_servicio)::numeric,  2)      as servicio,
  round(avg(tf.sitio_conversar)::numeric, 2)      as conversar,
  round(avg(tf.sitio_comida)::numeric,    2)      as comida,
  -- La nota del sitio es la media de las cuatro, no de las cuatro medias:
  -- asi una fila que dejo tres en blanco pesa por lo que contesto y no por
  -- lo que se salto.
  round(avg((
    coalesce(tf.sitio_ambiente,0) + coalesce(tf.sitio_servicio,0)
    + coalesce(tf.sitio_conversar,0) + coalesce(tf.sitio_comida,0)
  )::numeric / nullif(
    (tf.sitio_ambiente is not null)::int + (tf.sitio_servicio is not null)::int
    + (tf.sitio_conversar is not null)::int + (tf.sitio_comida is not null)::int, 0
  )), 2) as valoracion
from table_feedback tf
join dinner_tables dt on dt.id = tf.table_id
where dt.restaurant_id is not null
  and (tf.sitio_ambiente is not null or tf.sitio_servicio is not null
       or tf.sitio_conversar is not null or tf.sitio_comida is not null)
group by dt.restaurant_id;

comment on view v_nota_de_local is
  'La nota del SITIO, de las cuatro preguntas que preguntan por el sitio. No '
  'confundir con notaDeLasMesas, que sale de la mesa y mide a la gente.';

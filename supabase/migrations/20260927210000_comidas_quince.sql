-- Las comidas, quince: se deshace la separacion de tailandesa e india.
--
-- Hace un rato se separaron de `asiatica` y se deshace el mismo dia, con el
-- motivo escrito para que no se repita.
--
-- LA RAZON NO ES QUE LA LISTA SEA LARGA DE LEER. Es que separar de mas rompe
-- el emparejamiento. La pregunta es «elige 3» y lo que hace util el dato es
-- que SEIS personas coincidan: si tres quieren asiatico y una marca china,
-- otra tailandesa y otra vietnamita, el reparto las ve en desacuerdo cuando
-- las tres cenarian felices en el mismo sitio. Con 14 opciones y 3 tiros dos
-- personas cualesquiera comparten algo el 64% de las veces; con 17 baja al
-- 53%, y eso se multiplica por seis.
--
-- Y el otro lado: una casilla solo sirve si existen locales que la lleven. Si
-- en Caracas hay dos tailandeses, quien marque «Tailandesa» gasta un tercio de
-- su eleccion en algo que casi nunca vamos a poder reservar.
--
-- LA REGLA, decidida por Michael: una cocina merece casilla propia cuando hay
-- al menos TRES locales en la ciudad que podamos reservar. Por debajo de eso
-- vive dentro de una mas ancha. Anadir es barato —los codigos no cambian—;
-- quitar es lo que cuesta.
--
-- `asiatica` vuelve a ser el cajon y se llama «Asiática»; lo que lleva dentro
-- —china, tailandesa, india, vietnamita— se dice en la AYUDA de la pregunta,
-- que estaba sin decirlo. Japonesa sigue aparte por el mismo criterio que
-- pizza: el sushi es una salida distinta de «pedir asiatico».
--
-- `tailandesa` e `india` no llegaron a estar en produccion mas que unos
-- minutos y nadie los respondio, asi que no hay ninguna respuesta que migrar.
-- Se comprueba abajo antes de nada.

do $$
declare n int;
begin
  select count(*) into n from answers
   where question_key = 'comidas'
     and (value ? 'tailandesa' or value ? 'india');
  if n > 0 then
    raise exception 'Hay % respuestas con tailandesa o india: hay que migrarlas antes.', n;
  end if;
end $$;

update questions
   set options = '[{"value": "venezolana", "label": "Venezolana"}, {"value": "parrilla", "label": "Parrilla y carnes"}, {"value": "italiana", "label": "Italiana"}, {"value": "pizza", "label": "Pizza"}, {"value": "japonesa", "label": "Japonesa"}, {"value": "asiatica", "label": "Asiática"}, {"value": "peruana", "label": "Peruana"}, {"value": "mexicana", "label": "Mexicana"}, {"value": "espanola", "label": "Española"}, {"value": "mediterranea", "label": "Mediterránea"}, {"value": "arabe", "label": "Árabe"}, {"value": "mariscos", "label": "Pescados y mariscos"}, {"value": "autor", "label": "De autor y fusión"}, {"value": "mercado", "label": "De mercado y vegetariana"}, {"value": "hamburguesas", "label": "Hamburguesas"}]'::jsonb,
       help_text = 'Con esto elegimos el restaurante de tu fecha. Asiática incluye china, tailandesa, india y vietnamita. No es una alergia: eso va en la última pregunta.'
 where key = 'comidas';

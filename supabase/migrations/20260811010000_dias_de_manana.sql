-- La entrega 7 §1.6 añadió dos opciones de día —sábado y domingo por la
-- mañana— y el catálogo nunca se actualizó: sigue con siete.
--
-- La landing v4 ofrece las nueve. Quien elegía una de las dos nuevas recibía
-- un 400 y **perdía el quiz entero**, porque `validarConjunto` rechaza el
-- conjunto completo cuando un código no existe. En silencio, además: la
-- pantalla se traga ese fallo porque el lead ya quedó capturado en el paso 1.
--
-- No es una opción nueva: es una que llevaba desde la entrega 7 sin existir
-- en la base.
update questions
set options = options || '[
  {"value": "sab-am", "label": "Sábado mañana"},
  {"value": "dom-am", "label": "Domingo mañana"}
]'::jsonb
where key = 'dias'
  and not options @> '[{"value":"sab-am"}]';

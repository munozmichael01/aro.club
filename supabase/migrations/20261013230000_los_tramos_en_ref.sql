-- Las etiquetas del presupuesto pasan de USD a ref.
--
-- Son las que lee la persona al contestar «¿cuánto piensas gastar en la
-- cena?», y tienen que decir la misma unidad que el resto del producto: en
-- Venezuela el precio se dice en ref, y Aro cobra a tasa euro del BCV.
--
-- Solo cambia la ETIQUETA. Los códigos —`20-35`, `35-50`, `mas-50`— no se
-- tocan: son lo que está guardado en las respuestas de 418 personas, y
-- cambiarlos las perdería todas. `hasta-20` sigue aquí, retirado de la
-- pantalla pero aceptado, como quedó el 13-10.
update questions
set options = jsonb_build_array(
  jsonb_build_object('label', 'Hasta 20 ref',  'value', 'hasta-20'),
  jsonb_build_object('label', '20 a 35 ref',   'value', '20-35'),
  jsonb_build_object('label', '35 a 50 ref',   'value', '35-50'),
  jsonb_build_object('label', 'Más de 50 ref', 'value', 'mas-50')
)
where key = 'gasto';

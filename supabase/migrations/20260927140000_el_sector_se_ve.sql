-- El sector se le enseña a los otros cinco, y la pregunta no lo decía.
--
-- De una persona, su mesa ve dos cosas: cómo quiere que la llamen y su
-- sector. Lo dice la pantalla del perfil —«de ti, los otros cinco solo ven tu
-- nombre y tu sector»— y lo dice la landing. Donde NO se decía era en el
-- único sitio donde importa: la pregunta, en el momento de contestarla.
--
-- `empleador`, la siguiente, sí lleva su ayuda («no se le muestra a nadie»),
-- así que quien llega a `sector` sin ayuda y a `empleador` con ella deduce lo
-- contrario de lo que pasa: que el sector tampoco se ve.
--
-- No se cambia el dato ni quién lo ve: se dice antes de pedirlo.

update questions
   set help_text = 'Es lo único que ven los otros cinco, junto con cómo te llamamos. Por eso no pedimos el cargo.'
 where key = 'sector'
   and help_text is null;

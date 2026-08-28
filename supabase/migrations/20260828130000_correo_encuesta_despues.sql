-- =====================================================================
-- Entrega 16 · el correo que lleva a la encuesta.
--
-- La pantalla del dia despues tiene cero respuestas y no es porque no
-- funcione: es que no habia ningun correo que llevara a ella. Sale la manana
-- siguiente a la cena y enlaza a /mi-mesa#pasada.
--
-- No entra en IMPRESCINDIBLES: quien se dio de baja no tiene que recibirlo.
-- Por eso la plantilla lleva `{{{ enlaceAjustes }}}`, que es la ruta de baja.
--
-- El enlace no dice de que cena habla. Con dos cenas pasadas la pantalla
-- elige sola —la ultima— y anadir el id al enlace obligaria a firmarlo para
-- que nadie leyera la cena de otro. La pantalla ya sabe quien mira.
--
-- Y de paso, una errata del comentario de 20260828120000: decia AROL CLUB.
-- =====================================================================

alter type email_kind_t add value if not exists 'encuesta_despues';

comment on column table_feedback.would_repeat is
  'Si volveria a ARO CLUB, no a esa mesa. Cambio de significado en la entrega '
  '16 con la tabla vacia. La pregunta vieja no decidia nada: esa mesa no se '
  'repite nunca porque el veto de tres meses lo impide.';

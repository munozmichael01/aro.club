-- La encuesta se queda hasta que la contesten O LA SALTEN.
--
-- Michael, 18-10: «que no deje de mostrarse a las 48 h, sino cuando la
-- persona la conteste o se la salte».
--
-- Hoy el «Ahora no» de Mi mesa no guarda nada: solo vuelve a Inicio, y la
-- encuesta sigue ahí hasta que caducan las 48 horas. Con la ventana fuera,
-- sin esta columna la encuesta se quedaria para siempre delante de quien ya
-- dijo que no quiere contestarla, que es la forma mas rapida de que deje de
-- leerla.
--
-- Vive en `table_feedback` y no en una tabla nueva porque es lo mismo que
-- valorar visto por el otro lado: la fila de esa persona para esa mesa. Una
-- fila con solo `saltada_at` es «no quiso contestar»; si despues contesta,
-- se limpia, porque entonces si hay valoracion y es lo que vale.
alter table table_feedback
  add column if not exists saltada_at timestamptz;

comment on column table_feedback.saltada_at is
  'Cuando dijo «Ahora no» a la encuesta de esa mesa. Una fila con esto y sin '
  'notas no es una valoracion: es la constancia de que no quiere contestar, '
  'y es lo que hace que la encuesta deje de salirle sin ponerle un plazo.';

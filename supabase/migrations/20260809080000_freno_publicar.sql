-- =====================================================================
-- Publicar con avisos: se para, y si se fuerza queda escrito.
--
-- El reparto ya apuntaba las roturas —"spread de 15 anios", "dos de
-- Banesco"— en la propuesta. Publicar no las miraba: creaba las mesas,
-- sentaba a la gente y encolaba los correos igual. Se publicaron cuatro
-- corridas asi sin que nadie dijera nada.
--
-- Con datos de prueba da igual. Con gente de verdad son seis personas que
-- se presentan el jueves a una mesa que el propio programa habia marcado
-- como mala.
--
-- No se prohibe: un jueves con catorce apuntados en el que la unica mesa
-- posible tiene once anios de diferencia puede seguir mereciendo la pena.
-- Esa decision es de quien lleva la operacion. Lo que no puede es
-- desaparecer.
-- =====================================================================

alter table matching_runs
  -- Las roturas que habia EN EL MOMENTO de publicar. No se recalculan
  -- despues: la pregunta al revisar una mesa que salio mal es que se sabia
  -- entonces, no que se sabe ahora.
  add column if not exists published_breaks jsonb,
  add column if not exists forced_by uuid references profiles(id),
  add column if not exists forced_at timestamptz;

comment on column matching_runs.published_breaks is
  'Roturas aceptadas al publicar. null = se publico limpio.';

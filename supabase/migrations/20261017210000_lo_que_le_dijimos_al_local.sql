-- =====================================================================
-- Qué le dijimos al restaurante, y cuándo.
--
-- Michael, 17-10, despues de un dia en el que a Pizza Tua le contamos
-- cuatro versiones: «primero le dije dos mesas de 6, despues una de 6 y una
-- de 5, luego solo una de 6 y ahora le digo que son 5?».
--
-- El panel no sabia nada de eso. Cada cambio en la mesa —una cancelacion,
-- alguien que se mueve— invita a volver a llamar, porque no hay forma de
-- saber si lo que el local tiene apuntado sigue siendo verdad. Y llamar
-- cuatro veces el mismo dia por una persona gasta credibilidad justo con
-- quien nos sienta a la gente.
--
-- Dos columnas y nada mas: cuantos le dijimos y cuando. Con eso la tarjeta
-- puede decir sola «le dijiste 6 a las 11:40, ahora son 5» y quien opera
-- decide si eso merece otra llamada. No se avisa al local desde aqui: esto
-- es el registro de una conversacion que ocurre por telefono.
-- =====================================================================

alter table dinner_tables
  add column if not exists avisado_local_at timestamptz,
  add column if not exists avisado_local_num int;

comment on column dinner_tables.avisado_local_at is
  'Cuando le dijimos al restaurante cuanta gente va. Lo marca operacion a '
  'mano, despues de llamar. Null es que todavia no se le ha dicho nada.';

comment on column dinner_tables.avisado_local_num is
  'Cuantos le dijimos que eran. Si hoy son otros, la tarjeta lo canta: es la '
  'diferencia entre lo que el local tiene apuntado y lo que hay.';

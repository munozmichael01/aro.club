-- =====================================================================
-- El relleno de esta mañana escribió dos cosas que no eran verdad.
--
-- `20261014120000` rellenó `nacimiento` y `genero` en `answers` desde
-- `profiles`, para los 373 perfiles a los que `convertir_lead` se los había
-- dejado fuera. Rellenó bien los datos y mal dos detalles, y los dos se ven
-- en el mismo sitio: el cron de empujones.
--
-- 1 · «SIN-DECIR» NO ES UNA RESPUESTA, ES LA FALTA DE UNA.
--
--     `profiles.gender` es `not null default 'sin-decir'`, así que TODO
--     perfil tiene género aunque nadie lo haya elegido. El relleno copió esa
--     columna tal cual y convirtió «no llegó a esa pregunta» en «contestó:
--     prefiero no decirlo» para treinta personas.
--
--     `embudo.ts` ya hacía esta distinción y lleva su comentario puesto:
--
--       if (dadas.genero == null && perfil?.gender && perfil.gender !== 'sin-decir')
--
--     O sea que la regla estaba escrita, en TypeScript, y la volví a escribir
--     en SQL sin ella. A esas treinta personas el cuestionario dejaría de
--     preguntarles su género: no se lo saltaron, se lo saltamos nosotros.
--
--     `convertir_lead` NO tiene este fallo: lee `waitlist.gender`, que sí
--     puede ser nulo, y el `where` lo descarta. Era solo del relleno.
--
-- 2 · Y EL RELOJ DE «TE QUEDASTE A MEDIAS».
--
--     `answered_at` se quedó con la hora del relleno. El cron de empujones
--     mide desde la última respuesta —a propósito: «quien ayer contestó cinco
--     y hoy tres está avanzando»— así que diez personas paradas de verdad
--     pasaron a parecer activas de hoy, y su empujón de las 24 horas no
--     salió. Cuatro llevaban entre 33 y 39 horas sin tocar nada.
--
--     Un relleno no es actividad de la persona. La hora honesta de un dato
--     que vino de su alta es la de su alta.
--
-- Las dos se arreglan sobre las filas del relleno, que se reconocen por su
-- `answered_at`: se escribieron todas en el mismo segundo.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. Fuera los «sin-decir» que nadie eligió.
--
-- Solo los del relleno. Quien eligió «Prefiero no decirlo» en el
-- cuestionario —que es una opción de verdad— tiene su fila con su hora, y
-- esa no se toca.
-- --------------------------------------------------------------------
delete from answers a
 where a.question_key = 'genero'
   and a.value = '"sin-decir"'::jsonb
   and a.answered_at >= timestamptz '2026-10-14 04:26:25+00'
   and a.answered_at <  timestamptz '2026-10-14 04:26:27+00';

-- --------------------------------------------------------------------
-- 2. Y la hora, la del alta de cada uno.
--
-- No la de hoy. Lo que se rellenó lo dijo la persona cuando se dio de alta;
-- fecharlo hoy la hace parecer activa y le quita el empujón que sí le toca.
-- --------------------------------------------------------------------
update answers a
   set answered_at = p.created_at
  from profiles p
 where p.id = a.profile_id
   and a.question_key in ('nacimiento', 'genero')
   and a.answered_at >= timestamptz '2026-10-14 04:26:25+00'
   and a.answered_at <  timestamptz '2026-10-14 04:26:27+00'
   and p.created_at < a.answered_at;

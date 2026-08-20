-- =====================================================================
-- El correo de quien pagó y no se sentó.
--
-- `publicar` encolaba los `mesa_asignada` de los sentados y del resto no
-- decía nada, mientras el panel prometía dos veces «se les avisa hoy».
-- Alguien pagó ocho dólares, se quedó fuera del reparto y se iba a enterar
-- el jueves a mediodía, al ver que no le llegaba nada.
--
-- El enum solo crece, como en las tres entregas anteriores que añadieron
-- tipos de correo: `sin_mesa` no sustituye a nada ni recupera nada retirado.
-- =====================================================================

alter type email_kind_t add value if not exists 'sin_mesa';

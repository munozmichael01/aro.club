-- =====================================================================
-- Un correo para cuando la mesa cambia despues de haberla contado.
--
-- `publicar` ya sabe a quien se le mando su mesa y ahora esta en otra: lo
-- devuelve por la respuesta y el panel lo dice en voz alta para que operacion
-- escriba a mano. Eso era el apano mientras no existiera este tipo.
--
-- No vale reenviar `mesa_asignada`. Esa plantilla dice «TU MESA · 04» como
-- novedad, y mandarla dos veces con contenido distinto y sin explicar que
-- cambio es peor que el silencio: quien la lea rapido se queda con la mesa
-- equivocada y no sabe cual de los dos correos vale.
--
-- El enum solo crece, igual que con `sin_mesa`.
-- =====================================================================

alter type email_kind_t add value if not exists 'mesa_cambiada';

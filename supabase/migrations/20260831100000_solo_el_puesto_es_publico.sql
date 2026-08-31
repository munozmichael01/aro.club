-- El unico producto publico es el puesto suelto.
--
-- La politica de lectura de `products` es `using (is_active)`, asi que lo
-- inactivo no sale con la llave publica: `pack_4` ya estaba apagado y no se
-- veia, comprobado consultando con la anon key.
--
-- Lo que SI se veia es `founding · Miembro fundador · 5 USD`, activo y publico,
-- y eso no lo vende nadie. Un producto vivo a 5 USD junto al puesto a 7 no es
-- un dato muerto: es un precio distinto publicado en el mismo sitio, y quien
-- lo lea no tiene forma de saber cual vale. Ademas ningun sitio del codigo lo
-- consulta.
--
-- Se apaga, no se borra. Si el dia de manana hay una tarifa de fundador, se
-- vuelve a encender con su historial; borrarla dejaria los pagos viejos
-- apuntando a un producto que no existe.

update products set is_active = false where sku = 'founding';

# Auditorías cruzadas · noche del 29 al 30-10

## 1. Mi auditoría del trabajo del agente web (27 al 29-10)

**Revisado:** sus 14 commits, de 3248273 a f8f4cf5. Una parte la revisé yo
(cambiar de fecha, Voy tarde, Mi mesa, los correos y el panel). El reparto y
las lecturas por tramos los revisó un revisor aparte, leyendo el código entero.

**Ejecutado en main, y pasa:** los cinco comprobadores del CI y el de pintado
(0 problemas). En la base, solo leyendo: ningún correo sin armar desde el 28,
y el correo de los hombres salió a 55 personas, todas con recibo.

### Antes de las cenas del 30 y el 31
1. **Cancelar se puede quedar a medias.** Si falla una lectura del reparto
   mientras alguien cancela, la reserva queda cancelada pero no le devuelve el
   crédito ni le manda el correo. Lo comprobé en el código.
2. **Rellenar un hueco no mira el veto de local:** puede sentar a alguien que
   cenó en ese sitio hace días.
3. **Dos reglas distintas de «no repetir local»** (42 días en un sitio, 30 en
   otro): el reparto puede elegir solo un local que después no deja publicar
   sin forzar.

### Importante, pero no para mañana
4. Las lecturas por tramos no van ordenadas: pueden saltarse o repetir filas.
5. Una consulta del historial de mesas puede romper con fechas muy grandes.
6. «Verificado» no significa lo mismo en el correo de los hombres y en el
   reparto.
7. **El correo «Cambiaste tu fecha» ya está vivo sin tu aprobación.** El botón
   de la web lo dispara. Dice «Mi cena» (la pantalla es Mi mesa), dice «cena»
   aunque sea brunch y escribe las 24 horas a mano.

### Menor
8. La cuenta de «2.ª cena» incluye mesas de prueba y fechas canceladas. Hoy no
   se ve en ninguna pantalla.
9. Cambiar de fecha no filtra por ciudad. Hoy no pasa: solo hay Caracas.

**Sin problema:** el veto de pareja, los permisos del panel, cambiar de fecha
(lo pagado viaja con la reserva y se deshace si el aviso no sale) y el Voy
tarde (la plantilla y sus datos cuadran).

Se lo pasé todo al agente con fichero y línea. **Arregló siete en `973bebf`**
(el 1, 2, 3, 4, 5, 7 y 8). Lo comprobé yo:
- el reparto que falla ya no se lleva la cancelación por delante;
- rellenar un hueco ya mira el local;
- los comprobadores del CI pasan sobre su arreglo;
- aro.club, Mi mesa y la próxima fecha responden bien en producción.

**Quedan dos sin arreglar, a propósito:**
- el 6 necesita medir a cuánta gente afecta, y te lo trae con el número;
- el 9 no pasa mientras solo haya Caracas.

En el 4 ordenó las lecturas de tablas grandes. Dejó para otro día unas
dieciséis pantallas del panel que solo leen.

## 2. La auditoría del agente sobre mi trabajo

**Su veredicto:** bien hecho. Ejecutó los tipos y las pruebas de la app (159
de 159, con el reloj de Madrid y el de UTC). Buscó lo que este repo ya ha
pagado: relojes locales, constantes copiadas y commits fuera de app-mobile. No
encontró nada.

**Dos hallazgos menores, ya corregidos** (ccde46e):
- La pantalla de cambiar de fecha no decía por qué cuando la mesa ya está
  revelada.
- El comentario de una prueba decía una hora de menos.

## 3. Lo que necesita tu decisión
- **El texto del correo «Cambiaste tu fecha».** Ya está corregido (dice
  Mi mesa, brunch o cena según toque, y las horas salen de la regla), pero
  sale a gente real desde el botón de la web y no lo has aprobado. El agente
  te lo pegó en su chat.
- **El 6:** si «verificado» en el correo de los hombres tiene que exigir cédula
  y selfie, como el reparto. El agente te trae cuántas personas cambia.

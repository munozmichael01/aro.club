# A Design · Dos correcciones y ya cierran los dos guiones

Verifiqué los dos. La mayor parte está bien y lo digo primero, porque lo que
falta es poco.

En la A, **las ocho etiquetas caen donde deben**: pinté tus coordenadas sobre
la fachada y cada una queda junto a su ventana encendida, ninguna sobre la
luz, ninguna pisando a otra, todas dentro de la zona segura. En la B, los
intervalos entre polaroids son exactamente lo pedido —0,55 · 0,53 · 0,50 ·
0,48 · 0,46 · 0,44 · 0,42 · 0,40 · 0,38— monótonos y sin bajar nunca del piso.
Comprobado uno a uno contra los segundos de tu tabla.

Quedan dos cosas, una en cada pieza.

---

# A · Te pasaste quitando, y el tercio de abajo quedó vacío

La regla era no entrar en el 12% de arriba ni en el 12% de abajo. Quitaste
cuatro etiquetas, pero **no reasignaste ninguna a la franja que va del 73% al
88%**, que está dentro de la zona segura y está libre.

Mira `docs/entrega/reels/_ver-A-ronda3.jpg`: pinté tus ocho posiciones con las
bandas marcadas. En rojo el 12% de arriba y el 12% de abajo, que no se tocan.
En amarillo la franja del 75% al 88%, que **sí se puede usar y está vacía**. Y
dentro de esa franja amarilla hay al menos una ventana encendida con una
figura caminando, sobre el 84% de altura.

El resultado es que las ocho etiquetas quedan apretadas entre el 17% y el 73%
y el cuarto de abajo del cuadro no dice nada. En una pieza sobre un edificio
lleno de gente sola, un tercio vacío se lee como que el edificio se está
quedando solo, que es justo lo contrario.

**Recupera una o dos de las que quitaste** y ponlas sobre las ventanas
encendidas de esa franja. «Viendo stories» y «Comiendo de pie» son las
candidatas naturales. Si solo cabe una bien, que sea una: el criterio sigue
siendo que cada etiqueta esté junto a su ventana, no llenar hueco.

Con nueve o diez etiquetas hay que repartir otra vez las entradas entre 0,60 y
10,50, manteniendo el acelerando.

**Un apunte que no es tuyo:** tu tabla dice que la sombra inferior va al 45%.
Code midió que al 45% el rótulo «EDIFICIO CARACAS» sigue leyéndose, y lo
arregló para que solo los últimos píxeles lleguen a sólido. Recoge eso en el
guion para que nadie lo devuelva al 45% en la siguiente vuelta. Y va a pasar
a negro, no verde: en el render quedaba una neblina verde subiendo por la
fachada.

---

# B · La frase desaparece a los 6,35 y no vuelve

En tu tabla, «La mejor manera», «de pertenecer», «a un grupo de amigos» y «es»
tienen **Hasta 6,35**. Solo «creándolo.» sigue, hasta 11,20. Y el cierre no la
recupera.

O sea que del segundo 6,35 al 11,20 —casi cinco segundos, justo mientras caen
las diez polaroids— en pantalla hay **una palabra suelta**: «creándolo.». Y la
pieza termina sin que la frase se haya vuelto a ver entera.

Esto viene de tu primera versión y yo no lo vi en las dos revisiones
anteriores, así que el fallo de revisión es mío tanto como tuyo.

Dos razones por las que hay que cambiarlo. La referencia 03 mantiene el
titular **fijo durante toda la pieza** y las fotos caen encima; ahí está toda
su fuerza, en que el texto no se mueve y la vida pasa por delante. Y la frase
es lo que Michael eligió y aprobó: es el mensaje, no un rótulo de entrada.

**La frase completa se queda en pantalla desde que termina de construirse
hasta el cierre.** Las polaroids caen encima, no en su lugar. Ajusta lo que
haga falta —posición del taco, tamaño de la frase— para que las dos cosas
convivan sin taparse.

Si hubo una intención detrás de dejar solo «creándolo.», dímela antes de
cambiarlo: puede que sea buena y no la esté viendo. Pero tal como está, se
pierde el copy.

---

Con eso los dos guiones quedan cerrados y Code monta. Devuelve la A con su
imagen de comprobación actualizada, como siempre.

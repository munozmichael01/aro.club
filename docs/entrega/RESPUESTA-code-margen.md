# A Code · Respuesta a la pieza A, y la decisión que pediste

Verifiqué lo tuyo antes de contestar. Los tres puntos en los que me
corregiste eran correctos y mi diagnóstico era peor que el tuyo:

**El aro.** Conté los puntos a 8 fps del vuelo al cierre: **seis en todos los
fotogramas**, hexágono completo, el naranja a las tres en punto. Y tenías
razón en las dos correcciones. No era un signo ni un índice, era que
`.punto.tu` corría cuatro animaciones y dos animaban `transform`, así que la
última pisaba el `translate`. Y el fallo llegaba a los 10,0 s con «Seis» ya
en pantalla, no se arreglaba en 9,6 s como yo dije.

**El titular.** También tenías razón: no se iba, se volvía invisible. Crema
sobre crema, y por eso lo único que sobrevivía era lo naranja. Que fuera
exactamente «quién» y «Tú no.» era la firma y no la supe leer.

**El comprobador.** Aquí es donde más me importaba comprobarte, porque
cambiar la métrica que juzga tu propio trabajo es la clase de cosa que hay
que verificar y no creer. Lo pasé por las seis piezas con tu versión nueva:
reel-01 sigue dando 6 tramos y 7,5 s, reel-02 nueve y 11 s, reel-03 ocho y
12 s, reel-04 nueve y 10 s. **Idénticos a lo que medía antes de que lo
tocaras.** `reel-01-ritmo` da 1 tramo de 0,5 s y `reel-05-ventanas` da cero,
código 0. No aflojaste el listón, y el razonamiento de Nyquist es correcto:
muestreando a 2 fps no se puede ver un corte de 0,30 s.

Y el error que te pillaste solo —abrir la ventana medio segundo más larga y
colar movimiento de al lado— vale más que el arreglo. Un desmentido
imposible que delata el método es exactamente lo que hay que buscar.

`comprobar-etiquetas.mjs` es la pieza que faltaba. Congela la animación, lee
la caja con la transformación aplicada y avisa. Eso no lo caza ninguna
métrica de fotogramas.

---

## La decisión: manda la zona segura

El margen del 6% no es una manía tipográfica y por eso no se acepta rebajarlo.
**El 12% de arriba y el 12% de abajo del cuadro es donde Instagram y TikTok
ponen su propio cromo:** la cabecera arriba; el pie de foto, el nombre de
cuenta y la música abajo. «Cancelando planes» a 26 px del borde superior no
queda apretada, queda **debajo de la interfaz de la app**. Y eso no se ve en
el MP4: se ve al publicar, que es tarde.

De tus tres salidas, **ninguna**, y la explico.

Mover las cuatro etiquetas hacia dentro no vale: tú mismo mediste que hay que
despegarlas entre 77 y 96 px de su ventana, y ahí se rompe lo único que
sostiene la pieza, que cada texto pertenece a una persona concreta. Bajar el
zoom tampoco, por lo que dices: sin alejamiento no hay concepto. Y aceptar un
margen menor es aceptar publicar con texto bajo la interfaz.

**La salida es la cuarta: se ajusta el número de etiquetas, no su posición.**
Ninguna puede quedar en el 12% superior ni en el 12% inferior, contando la
caja entera. Las ventanas que queden fuera de la zona segura no se usan, y
las etiquetas que sobren se caen. Prefiero nueve bien puestas que doce
flotando.

Eso lo recalcula Design, que es quien tiene las posiciones verificadas contra
la foto, y le pedí que devuelva la imagen de comprobación actualizada. **No
toques las coordenadas tú.** Cuando llegue el guion nuevo, remontas.

**Una excepción:** «Escribiéndole a la ex» se queda. Cruza por la izquierda a
35 px, y ese lado no lo tapa nada. El problema es arriba y abajo.

Y una nota que sale de esto: el margen del 12% debería ser un listón fijo de
`comprobar-etiquetas.mjs` para todas las piezas, no una comprobación que
hicimos una vez aquí.

## Dos cosas más sobre la pieza A

**El rótulo:** tenías razón en que el 45% no tapaba, y el arreglo es correcto.
Comprobado a 14,0 s, «EDIFICIO CARACAS» ya no se lee.

**Pero la banda quedó verde, no negra.** Se lee como una neblina verde
subiendo por la fachada en los últimos segundos, no como una sombra. Sobre
una foto nocturna una caída a negro es invisible como recurso; el verde se
nota y parece un fallo de color. Cámbiala a negro manteniendo el mismo perfil
de opacidad. Si prefieres el verde de marca, entonces que sea una banda
definida y opaca, un pie deliberado, no un degradado que parece niebla.

## Sobre `docs/entrega` y el `.gitignore`

Bien visto lo de ignorar `reel/*.mp4`, `reel/*.html` y `reel/fotogramas/`: son
regenerables y son 11 MB por render.

`docs/entrega` es otra cosa y no lo ignores en bloque. Ahí dentro hay dos
tipos de fichero. Los `.md` —pedidos, guiones, el documento de la mesa— son
pequeños, no se regeneran y son justo lo que hay que poder mirar dentro de
seis meses para saber por qué algo es como es: **esos entran**. Los binarios
pesados —los MP4 de referencia, los PNG de 10 MB, los fotogramas— son los que
hacen los 209 MB: **esos se ignoran**, y los originales viven donde están.

Lo único que quiero pensado antes de ignorarlos es que las imágenes
etalonadas de `polaroids/final-etalonadas/` **no son regenerables sin el
original**, así que si se ignoran hay que asegurarse de que los originales de
`final/` están respaldados en algún sitio que no sea solo el disco de Michael.
Dilo tú si ves un riesgo ahí; es su decisión, no la nuestra.

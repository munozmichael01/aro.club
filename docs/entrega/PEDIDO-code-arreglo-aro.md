# A Code · Dos fallos más en `reel-01-ritmo`, antes de la pieza A

Te dije que `reel-01-ritmo` quedaba aceptado. **Me equivoqué y lo retiro.**
Comprobé el titular arreglado y los números del comprobador, y no volví a
mirar la tira entera. Michael sí, y encontró el primero de estos dos. El
segundo salió al recorrer la apertura fotograma a fotograma, que es lo que
tenía que haber hecho desde el principio.

## El aro se forma con cinco puntos, no con seis

Entre **8,6 s y 9,5 s** —casi un segundo entero— el aro en formación tiene
**cinco puntos**: dos arriba, uno a la izquierda, dos abajo. El sexto está
**pegado a la esquina superior izquierda del lienzo, recortado por el
borde**, y nunca llega a su sitio.

Sácalo y míralo:

```
ffmpeg -ss 8.6 -t 1.0 -i reel/reel-01-ritmo.mp4 -vf "fps=10" fuera/%02d.jpg
```

A partir de 9,6 s el aro cerrado entra bien y el cierre está correcto. El
fallo está solo en la formación.

## Por qué importa más que otros fallos

Los seis puntos vienen de las seis viñetas de la lista —«Sin perfiles», «Sin
swipe», y las demás—, que se despegan y vuelan a formar el aro. Esa es la
mejor idea de la pieza: las seis razones se convierten en las seis personas
de la mesa. Con cinco puntos no se lee, y encima el número seis es literal en
el copy que entra dos segundos después: «Seis desconocidos. Una mesa.»

Es la marca formándose y no cuadra con lo que dice el texto.

## Dónde mirar

El destino de una de las seis trayectorias cae fuera del lienzo. Sospecho un
signo cambiado o un índice que empieza en 1 donde el cálculo del ángulo
espera 0, porque el punto perdido no está en una posición aleatoria: está en
la esquina, que es donde acaba un elemento cuyas coordenadas se salen por
arriba y por la izquierda a la vez.

Revisa las seis trayectorias, no solo la que falla. Que cinco lleguen bien no
dice que el cálculo esté bien.

## Criterio de aceptación

Los seis puntos visibles y dentro del lienzo **en todo momento** entre el
inicio del vuelo y el cierre del aro. Se comprueba sacando los fotogramas a
10 fps en esa ventana y contando puntos en cada uno. Seis, siempre.

Y esto vale para la pieza A también: la comprobación no es mirar el resultado
final, es recorrer la tira entera. El comprobador de fotogramas no caza ni
esto ni el solapamiento del titular, porque en los dos casos la imagen sí
cambia. Solo lo caza el ojo.

---

# 2 · El parpadeo de la apertura no es un parpadeo

Recorrí los primeros 4,6 s a 10 fotogramas por segundo. Los fotogramas crema
están en **2,0 s · 2,2 s · 3,1 s**. Tres, sueltos, con huecos de 0,2 s y de
0,9 s entre ellos. Todo lo demás es la misma foto de fondo quieta.

Eso no es la referencia. En `docs/referencias-reels/02-cortes-en-crema/`
está medido: el fondo alterna **cada 8 a 10 fotogramas a 30 fps** —o sea cada
0,27 a 0,33 s— de forma **continua durante todo el tramo**, sin huecos. Tres
destellos aislados en cuatro segundos y medio no se leen como un ritmo, se
leen como un fallo de reproducción.

## Y en los crema desaparece el titular

En el fotograma de 2,0 s solo queda «quién». En los de 2,2 y 3,1 quedan
«quién» y «Tú no.». El resto del titular se va y vuelve.

En la referencia pasa justo lo contrario: **el texto se queda quieto y solo
cambia el fondo**. Por eso allí se lee como una pieza continua con el fondo
latiendo, y aquí se lee como un corte a otra tarjeta y vuelta.

## Lo que hay que hacer

Que el fondo alterne entre la foto y el crema de forma continua durante el
tramo de apertura, cada 0,27 a 0,33 s, con salto seco y sin fundido. Y que
**el titular no se toque**: entra por palabras como ahora y se queda donde
está mientras el fondo alterna debajo. El color del texto sí tiene que
cambiar para que se lea sobre el crema; la posición y el contenido no.

## Una cosa incómoda que conviene decir

Esos tres destellos son, en la práctica, lo que hace que el comprobador dé
casi cero tramos quietos en la apertura. El fondo está congelado cuatro
segundos y medio, y los tres saltos bastan para que la métrica no lo cace.

No digo que lo hicieras a propósito. Lo digo porque tu propio comentario en
`comprobar-repetidos.mjs` avisa de esto mejor que yo: «¿cambió algo?» no es
la pregunta, la pregunta es cuánto. Un tramo puede pasar la medida y seguir
sintiéndose muerto. Con el parpadeo continuo el problema desaparece de
verdad, no solo en la métrica.

---

## Orden

Los dos primero, que son cortos y están en el mismo fichero. La pieza A
después, con el pedido que ya tienes.

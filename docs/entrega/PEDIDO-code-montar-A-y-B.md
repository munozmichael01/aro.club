# A Code · Los dos guiones están cerrados. Monta A y B

Design entregó y verifiqué las dos. **Adelante con las dos piezas.**

## Lo que comprobé antes de darte luz verde

**Pieza A.** Pinté las nueve posiciones nuevas sobre la fachada con las bandas
del 12% marcadas: nada en rojo, nada pisando a nadie, cada etiqueta junto a su
ventana, y el tercio de abajo ya no está vacío. «Viendo stories» quedó justo
encima de la ventana de la figura caminando, que es la que tu cálculo decía que
cabía con 52 px de sobra. La comprobación está en
`docs/entrega/reels/_ver-A-ronda4.jpg`.

Los intervalos de entrada bajan 1,50 · 1,40 · 1,30 · 1,20 · 1,10 · 1,00 ·
0,90 · 0,80: acelerando limpio con nueve.

**Pieza B.** La frase ya no desaparece. Se queda fija de 6,10 a 14,00, sube a
una franja superior y reduce tamaño para dejar el centro a las polaroids, y
vuelve a centrarse a los 12,00. Los intervalos entre polaroids bajan de 0,55 a
0,38 sin pasarse del piso, comprobados uno a uno contra los segundos.

---

## 1 · Remontar la pieza A

`reel-05-ventanas` con el guion nuevo. Nueve etiquetas, no ocho. Los criterios
de aceptación son los mismos de antes y ya los pasaste todos: mantenlos.

La sombra ya está como debe. No la toques.

## 2 · Montar la pieza B · `reel-06-pertenecer`

Nueva, 15,0 s. Fichero nuevo siguiendo la convención, sin tocar nada existente.

**Las imágenes** están en `docs/entrega/polaroids/final-etalonadas/`, con
nombres de contenido —`llegada.jpg`, `cenital.jpg`, `brindis.jpg`— y el orden
lo da la tabla del guion, no el nombre. Ya vienen etalonadas: no les apliques
ningún filtro encima.

**El marco de polaroid lo pones tú en CSS**, y por eso las imágenes vienen sin
él: marco blanco, borde inferior más ancho que los otros tres, sombra suave.
Así las diez tienen el canto idéntico y limpio; si el marco viniera pintado en
la imagen, cada una tendría un blanco distinto y bordes con grano.

**Los giros** están en la tabla, de −8° a 8°, y el orden de entrada y salida
también: a partir de la cuarta, cada polaroid que entra empuja fuera a la que
entró tres turnos antes.

### Criterios de aceptación

1. `comprobar-repetidos` con código 0. El grano de fondo late todo el rato, no
   debería haber ni un tramo quieto.
2. `comprobar-etiquetas` sobre la frase y el bloque de cierre: nada en el 12%
   de arriba ni de abajo.
3. **La frase completa se lee de 6,10 a 14,00.** Sácala en fotogramas y
   compruébalo, que es la corrección que motivó esta vuelta.
4. Las diez polaroids aparecen, en el orden de la tabla y con sus giros.
5. Los tiempos son los de la tabla, comprobados sobre el vídeo.

### Una cosa que quiero que mires y me digas

Entre **13,00 y 14,00** conviven en pantalla la frase completa ya recentrada y
a tamaño grande, el aro, y «Seis desconocidos. Una mesa. El jueves.». Sobre el
papel eso es mucho a la vez y puede que se pisen.

No lo arregles por tu cuenta. Móntalo como dice el guion, mira ese segundo, y
si se pisan **dímelo con el fotograma** y lo decidimos. Si se ve bien, mejor y
seguimos.

---

Cuando estén las dos, sácalas en fotogramas y recórrelas enteras antes de
darlas por buenas. Las dos cosas que se nos han escapado en esta pieza —el
titular solapado y el aro de cinco puntos— no las cazó ninguna métrica: se
vieron mirando.

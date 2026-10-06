# Aro Club · la marca

Veinticuatro archivos. El isologo es geometría pura, así que escala sin pérdida a cualquier tamaño.

**Geometría (desde el 05-10-2026):** cuadrícula de 240, anillo de radio 86 con trazo 24, seis puntos de radio 25 sobre el anillo. Antes era trazo 17 y puntos 19. Es una sola geometría para todos los tamaños, del favicon a una valla: no hay versión fina ni versión gruesa.

## Qué hay

| Archivo | Cuándo se usa |
|---|---|
| `isologo-principal` | Sobre crema, en cualquiera de sus tres tonos. El uso por defecto. |
| `isologo-sobre-verde` | Sobre verde profundo o cualquier fondo oscuro. |
| `isologo-mono-oscuro` | Un solo color, cuando el acento no se puede usar. |
| `isologo-mono-claro` | Sobre foto o color saturado. |
| `isologo-mono-negro` | Imprenta a una tinta. |
| `favicon` | Pestaña del navegador. **Es el isologo, no otro símbolo**: el SVG se adapta solo a las pestañas claras y oscuras. |
| `favicon-180-ios` | Pantalla de inicio de iOS, que sí exige fondo opaco. |
| `perfil-redes` | **Foto de perfil en redes.** Verde profundo, 1080×1080. |
| `perfil-redes-crema` | La alternativa clara, para cuando el feed alrededor sea oscuro. |
| `cabecera-redes` | Cabecera 1500×500. El aro a la derecha y el texto desde el tercio central: en X la foto de perfil se solapa abajo a la izquierda, y ese cuadrante queda libre. |
| `logo-horizontal` · `-sobre-verde` · `-mono-negro` | Cabeceras, firmas de correo, documentos. |
| `logo-vertical` · `-sobre-verde` | Perfiles de redes, sellos, portadas. |
| `wordmark` · `-sobre-verde` | Cuando el aro ya está en la pieza y repetirlo resta. |

Cada uno en **SVG y PNG**. El SVG para web, imprenta y cualquier tamaño; el PNG para donde no se acepte vectorial.

## SVG o PNG

**El isologo y el favicon están listos tal cual** en las dos formas: no llevan texto, así que no dependen de nada externo.

## El favicon

Es el isologo, sin contenedor: la pestaña ya lo enmarca. Sirve el **SVG** —los navegadores lo escalan a 16, 32 o 64 según la pantalla, y lleva dentro una media query que lo pasa a crema en las pestañas oscuras—. El PNG queda de respaldo para navegadores viejos.

```html
<link rel="icon" href="/marca/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/marca/favicon.png" sizes="64x64" />
<link rel="apple-touch-icon" href="/marca/favicon-180-ios.png" />
```

**Un símbolo, no dos.** Si a 16 px los puntos llegaran a pegarse al aro, se sube el tamaño del favicon antes que simplificar el dibujo: cambiar el símbolo cuesta más reconocimiento del que gana en nitidez.

**Los que llevan el nombre tienen un matiz.** Young Serif no va incrustada en el SVG: se referencia por nombre, así que un ordenador sin la fuente la sustituye por Georgia. Tres salidas:

- **Web:** sirve la `@font-face` que ya usa la landing y el SVG queda perfecto.
- **Imprenta o terceros:** convierte el texto a curvas una vez, y el archivo deja de depender de nada.
- **Rápido:** usa el PNG. Los de esta carpeta están capturados con la fuente real a 3×, así que el nombre sale correcto.

## La foto de perfil

**Va el isologo sobre verde profundo, nunca el nombre.** A 32 px —que es como se ve en el feed, y donde ocurre casi todo el reconocimiento— cualquier palabra desaparece. El isologo a ese tamaño mantiene el aro y el punto de acento distinguibles.

Y el verde profundo funciona mejor que el crema por una razón de contexto: el feed de Instagram y de X es blanco, así que un círculo oscuro se separa del fondo. `perfil-redes-crema` queda para cuando el entorno sea oscuro.

**El isologo ocupa el 80% del cuadro, más de lo habitual.** Un perfil ya es un recorte circular y la plataforma no recorta más allá del círculo inscrito, así que el aire de seguridad del cuadrado no aplica: dejarlo al 62% hacía que a 32 px el aro quedara en nada.

## Cuatro reglas

**Aire alrededor: el radio del aro.** Ningún elemento entra en ese margen, ni el borde de la pieza. Los archivos ya lo traen incorporado.

**Mínimo 24 px de alto.** Por debajo, el aro y los puntos se pegan; ahí va el favicon.

**El punto de acento no se mueve.** Siempre el de la derecha, en la posición de las tres. Es lo que hace reconocible el símbolo de un vistazo.

**En redes no se repite dentro de la lámina**: el perfil ya lleva nombre e isologo encima de la publicación.

## Lo que no se hace

- No estirarlo ni inclinarlo. La proporción es cuadrada; se escala en bloque.
- No ponerlo verde sobre naranja: da 2,6:1. Sobre color saturado va la versión crema.
- No cambiarle los colores. Cinco variantes cubren todos los fondos del sistema; si ninguna sirve, va la monocroma.

## Color

| | | Dónde |
|---|---|---|
| `#1B5138` | verde | anillo y puntos, versión principal |
| `#C0662F` | naranja | el punto de acento sobre crema |
| `#FAF3E4` | crema | anillo y puntos sobre fondo oscuro |
| `#E39C63` | melocotón | el acento sobre fondo oscuro |
| `#14342A` | verde profundo | el nombre sobre crema, y la mono oscura |

Los mismos tokens del sistema, sin excepciones para la marca.

---

`Aro Club - Marca.html` es la hoja de especificación: enseña las piezas con su uso, las reglas y los tres usos incorrectos.

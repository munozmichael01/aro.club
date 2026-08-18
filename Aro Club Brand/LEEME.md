# Aro Club · la marca

Veinte archivos. El isologo es geometría pura, así que escala sin pérdida a cualquier tamaño.

## Qué hay

| Archivo | Cuándo se usa |
|---|---|
| `isologo-principal` | Sobre crema, en cualquiera de sus tres tonos. El uso por defecto. |
| `isologo-sobre-verde` | Sobre verde profundo o cualquier fondo oscuro. |
| `isologo-mono-oscuro` | Un solo color, cuando el acento no se puede usar. |
| `isologo-mono-claro` | Sobre foto o color saturado. |
| `isologo-mono-negro` | Imprenta a una tinta. |
| `favicon` | 16 y 32 px. **Va sin puntos a propósito**: a ese tamaño se pegan al aro. |
| `logo-horizontal` · `-sobre-verde` · `-mono-negro` | Cabeceras, firmas de correo, documentos. |
| `logo-vertical` · `-sobre-verde` | Perfiles de redes, sellos, portadas. |
| `wordmark` · `-sobre-verde` | Cuando el aro ya está en la pieza y repetirlo resta. |

Cada uno en **SVG y PNG**. El SVG para web, imprenta y cualquier tamaño; el PNG para donde no se acepte vectorial.

## SVG o PNG

**El isologo y el favicon están listos tal cual** en las dos formas: no llevan texto, así que no dependen de nada externo.

**Los que llevan el nombre tienen un matiz.** Young Serif no va incrustada en el SVG: se referencia por nombre, así que un ordenador sin la fuente la sustituye por Georgia. Tres salidas:

- **Web:** sirve la `@font-face` que ya usa la landing y el SVG queda perfecto.
- **Imprenta o terceros:** convierte el texto a curvas una vez, y el archivo deja de depender de nada.
- **Rápido:** usa el PNG. Los de esta carpeta están capturados con la fuente real a 3×, así que el nombre sale correcto.

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

`Aro Club - Marca.html` es la hoja de especificación: enseña las veinte piezas con su uso, las reglas y los tres usos incorrectos.

# Las fotos de la app

Son DERIVADAS, no originales. La regla de las fotos (`public/fotos/CREDITOS.md`)
es guardarlas al natural y que el filtro de marca lo aplique quien las pinta.
React Native no tiene filtros CSS fiables en iOS y Android, así que la app
entra en la misma excepción que el correo: el filtro va cocido en el fichero.

| Fichero | Sale de | Filtro |
|---|---|---|
| `portada.jpg` | `public/fotos/cenas.jpg` | el del hero de la portada web |

Se generan con `python3 scripts/cocer-foto.py`. No se editan a mano: si cambia
el filtro o la foto natural, se vuelve a correr el script.

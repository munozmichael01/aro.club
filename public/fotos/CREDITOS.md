# Las fotos

## El tratamiento no va en el fichero

El sistema lo define como **token de marca**, no como un ajuste suelto:

```
filter: grayscale(.24) contrast(1.16) saturate(.74) brightness(.9)
```

Así que **las fotos se guardan en natural** y el filtro lo aplica la página.
Cocerlo en el fichero sería tener dos fuentes de verdad, y el día que el token
cambie las fotos viejas se quedarían con el tratamiento antiguo.

**La excepción es el correo.** Gmail y compañía quitan los filtros CSS, así
que ahí el token va cocido en el fichero. Por eso hay dos versiones de la
misma foto:

| | |
|---|---|
| `public/fotos/mesa-de-seis.jpg` | natural, 1200 px · la web le pone el filtro |
| `public/correo/mesa-de-seis.jpg` | con el token ya aplicado, 1000 px |

Si el token cambia, la del correo hay que volver a generarla. La de la web no.

## De dónde salen

| Fichero | Origen |
|---|---|
| `mesa-de-seis.jpg` | La aportó Michael (`docs/Dinner_with_friends.jpg`) |
| las demás | vinieron con las entregas de Design |

De la original solo se corrigió la saturación: venía en 164 y las demás están
en 100 de media, y con el token encima habría quedado chillona.

## Lo que queda

En la landing v4 hay **una foto que todavía viene de Wikimedia** —la de
«estás unos días y no quieres pasarlos en casa»—, cargada en caliente desde
un tercero. Necesita una propia.

# Para Code · logo unificado

**Qué cambia:** solo el grosor del isologo. Los colores, las variantes y los nombres de archivo siguen igual.

- Antes: anillo r=86 con trazo **17**, puntos de radio **19**.
- Ahora: anillo r=86 con trazo **24**, puntos de radio **25**. Misma cuadrícula de 240 y mismas posiciones.

Es una sola geometría para todos los tamaños. No hay versión fina para tamaños grandes.

## Archivos

`marca/` está entera en esta carpeta, con los SVG y PNG ya regenerados. Reemplaza tu copia completa: los nombres no cambian.

La hoja `Aro Club - Logo unificado.dc.html` es la referencia visual.

## Dónde aplicarlo

1. **Web** (landing, cuenta, entrar, operación…): cualquier `<circle r="86" … stroke-width="17">` pasa a 24, y los `r="19"` de los seis puntos pasan a 25. Busca por `stroke-width="17"` y por `r="19"` dentro de los SVG del logo.
2. **Favicon y apple-touch-icon:** sirve los nuevos `favicon.svg`, `favicon.png` y `favicon-180-ios.png`.
3. **Correos:** las 16 plantillas llevan el isologo. Cambia trazo y radio de puntos igual que en la web. Si alguna lo embebe como PNG, usa los de `marca/`.
4. **App:** el icono de `app-mobile/Design/icono/` ya tenía esta geometría, así que no cambia. Sí cambian el splash y cualquier isologo dibujado dentro de la app.

## Colores (sin cambios, para que no haya dudas)

- **Principal, sobre crema:** anillo y puntos `#1B5138`, punto de acento `#C0662F`.
- **Invertida, sobre verde profundo `#14342A`:** anillo y puntos `#FAF3E4`, punto de acento `#E39C63`. Se usa en el icono de la app y el splash.
- El punto de acento siempre es el de la derecha.

## Comprobación

A 16 px (favicon) y a 29 px (ajustes de iOS), el anillo y los seis puntos tienen que seguir distinguiéndose.

"""
Cuece el filtro de marca en una foto, para la app.

La regla de las fotos (public/fotos/CREDITOS.md) es guardarlas al natural y
que el filtro lo aplique quien las pinta. React Native no tiene filtros CSS
fiables en iOS y Android, así que la app entra en la misma excepción que el
correo: una versión DERIVADA, generada desde la natural. No se edita a mano:
si cambia el token, se vuelve a correr esto.

Las matrices son las de la especificación de CSS Filter Effects, aplicadas en
el mismo orden que el `filter:` de la web, sobre sRGB como hacen los
navegadores con las funciones abreviadas.

    python3 scripts/cocer-foto.py
"""
import numpy as np
from PIL import Image

# El hero de la portada web (Landing v4): su filtro exacto.
HERO = [("grayscale", 0.3), ("contrast", 1.14), ("saturate", 0.62), ("brightness", 0.66)]


def matriz(nombre, v):
    if nombre == "grayscale":
        a = 1 - v
        return np.array([
            [0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a],
            [0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a],
            [0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a],
        ]), 0.0
    if nombre == "saturate":
        s = v
        return np.array([
            [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
            [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
            [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
        ]), 0.0
    if nombre == "contrast":
        return np.eye(3) * v, 0.5 - 0.5 * v
    if nombre == "brightness":
        return np.eye(3) * v, 0.0
    raise ValueError(nombre)


def cocer(origen, destino, filtro, ancho=1200):
    im = Image.open(origen).convert("RGB")
    if im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    px = np.asarray(im, dtype=np.float64) / 255.0
    for nombre, v in filtro:
        m, desplazamiento = matriz(nombre, v)
        px = np.clip(px @ m.T + desplazamiento, 0.0, 1.0)
    Image.fromarray((px * 255 + 0.5).astype(np.uint8)).save(destino, quality=84, optimize=True, progressive=True)


if __name__ == "__main__":
    cocer("../public/fotos/cenas.jpg", "assets/fotos/portada.jpg", HERO)
    print("assets/fotos/portada.jpg")

"""
La imagen del splash (1a de «Bienvenida app.dc.html»): el isologo en crema
—el punto «tuyo» en melocotón— y «Aro Club» debajo, en Young Serif. Fondo
transparente: el verde profundo lo pone la config de expo-splash-screen.

Geometría del SVG de Design (viewBox 240, pintado a 112 px): anillo r86 con
trazo 17, seis puntos r19; 22 px de hueco y el nombre a 34 px. Se dibuja a
cuatro veces el tamaño final y se reduce, para que los bordes salgan suaves.

    python3 scripts/splash.py
"""
import math
from PIL import Image, ImageDraw, ImageFont

CREMA = (250, 243, 228, 255)
MELOCOTON = (227, 156, 99, 255)
ESCALA = 3          # la imagen final, a 3x del tamaño de Design
SUPER = 4           # supermuestreo

def px(v):
    return round(v * ESCALA * SUPER)

ICONO = 112
HUECO = 22
LETRA = 34
fuente = ImageFont.truetype("assets/fuentes/YoungSerif-Regular.ttf", px(LETRA))
caja = fuente.getbbox("Aro Club")
ancho_txt = caja[2] - caja[0]
alto_txt = caja[3] - caja[1]
ancho = max(px(ICONO), ancho_txt) + px(8)
alto = px(ICONO) + px(HUECO) + alto_txt + px(8)

img = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
k = px(ICONO) / 240                    # del viewBox a píxeles
cx0 = (ancho - px(ICONO)) / 2
cy0 = px(4)
def c(x, y):
    return cx0 + x * k, cy0 + y * k

# Anillo
x, y = c(120, 120)
r, t = 86 * k, 17 * k
d.ellipse([x - r - t / 2, y - r - t / 2, x + r + t / 2, y + r + t / 2], outline=CREMA, width=round(t))
# Los seis puestos: el de la derecha es el tuyo
for i, (px_, py_) in enumerate([(206, 120), (163, 194.5), (77, 194.5), (34, 120), (77, 45.5), (163, 45.5)]):
    x, y = c(px_, py_)
    rr = 19 * k
    d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=MELOCOTON if i == 0 else CREMA)
# El nombre
tx = (ancho - ancho_txt) / 2 - caja[0]
ty = cy0 + px(ICONO) + px(HUECO) - caja[1]
d.text((tx, ty), "Aro Club", font=fuente, fill=CREMA)

final = img.resize((ancho // SUPER, alto // SUPER), Image.LANCZOS)
final.save("assets/splash.png")
print("assets/splash.png", final.size)

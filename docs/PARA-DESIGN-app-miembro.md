# Para Design · La app de Aro, para miembros

Diseña la app completa del miembro. **Solo miembro**: operación se queda en
web y no entra aquí ni como acceso escondido.

Lee `HANDOFF.md` §2.1 y el `HANDOFF-7.md` §5 antes de empezar. Los códigos de
zonas, temas, sectores, arraigo, días y formatos son los del contrato y no se
reescriben. El sistema visual es el mismo: esto no es un producto hermano, es
el mismo producto en otro sitio.

---

## 1 · Lo primero: qué deja de tener sentido en un teléfono

La web se diseñó para un navegador que puede estar en un portátil. La app
sabe tres cosas que la web no sabe, y eso cambia pantallas enteras.

**a) El traspaso por QR desaparece.**
En web, quien verifica desde el escritorio no tiene cámara útil, así que
montamos un código QR para seguir en el teléfono. En la app **eso sobra**: la
cámara está ahí. Se cae una pantalla entera y el flujo de verificación pasa
de cinco pasos a dos fotos.

**b) La revelación deja de ser un correo.**
El jueves a las doce se abre todo: el sitio, la dirección, la mesa y los
cinco nombres. En web eso llega por correo. En la app **llega por
notificación**, y esa notificación es el momento más importante del producto.

No es un aviso de sistema. Es la escena: el teléfono suena a mediodía y
dentro está su mesa. Diseña qué dice esa notificación, qué se ve al abrirla,
y qué pasa si la abre a las 12:00:03 frente a si la abre a las nueve de la
noche camino del restaurante.

**c) Hay estados sin conexión.**
Alguien llegando a un restaurante en Caracas puede no tener datos. La
pantalla que más falta hace —dirección, mesa, cómo llegar— es justo la que
más probable es que se abra sin señal. Dinos qué se ve.

---

## 2 · Tres decisiones que necesito de ti, no de mí

**1 · El modelo de navegación.**
La web es una sucesión de pantallas con un "atrás". Una app no. ¿Pestañas
abajo? ¿Una sola pantalla que cambia de estado, como Mi cuenta hoy? Aro
tiene poco que hacer entre cena y cena, y una barra de cinco pestañas medio
vacías miente sobre lo que hay dentro. Tú decides, pero decídelo explícito.

**2 · Cuándo se piden los permisos.**
Cámara, notificaciones y quizá ubicación. Pedirlos todos al abrir es la forma
más rápida de que los niegue. Di en qué pantalla se pide cada uno y con qué
frase, y qué pasa si dice que no — sobre todo con las notificaciones, porque
sin ellas se pierde la revelación.

**3 · El alta.**
Hoy en web la cuenta se crea al terminar el cuestionario, con contraseña,
Apple o Google. En iOS, si ofreces Google **estás obligado a ofrecer Sign in
with Apple**: es requisito de la tienda, no opinión. Diseña las tres, con
Apple primero en iOS.

---

## 3 · Lo que hay, pantalla por pantalla

Todo esto ya existe en web y funciona con datos reales. No lo rediseñes desde
cero: tradúcelo. Donde digo "igual", quiero decir que el contenido no cambia
aunque la forma sí.

**Entrada y alta.** La landing no se traduce: quien descarga la app ya
decidió. Lo que hace falta es un arranque corto que lleve al cuestionario, y
la pantalla de entrar para quien ya tiene cuenta.

**Cuestionario.** Diecisiete preguntas en cinco pantallas, guardado por
pregunta. Catorce obligatorias. En un teléfono, cinco pantallas con seis
opciones cada una es mucho pulgar: mira si el reparto por pantallas sigue
teniendo sentido o si en app conviene otro ritmo.

**Datos base.** Cuatro datos: nombre, cómo le llaman en la mesa, nacimiento,
género y teléfono. En app el teléfono puede prellenarse.

**Verificación.** Dos fotos con la cámara. Sin QR. Y los mismos estados de
después: en revisión, aprobada, rechazada con motivo.

**Mi cuenta.** Es la pantalla que más se abre y la que decide qué toca. Siete
estados encadenados, cada uno con un solo paso siguiente: falta perfil,
faltan datos base, falta verificar, en revisión, reservar, reservada, mesa
abierta.

**Apuntarse a una fecha.** Elige fecha, no zona: las zonas ya las dio en el
cuestionario y nosotros decidimos dónde se sienta. Ve cuánta gente hay
apuntada, no cuántos puestos quedan.

**Pago.** Ocho dólares cobrados en bolívares a la tasa del día. **Ojo aquí**:
el pago es por Pago Móvil o transferencia, o sea que sale de la app, va a su
banco y vuelve con una referencia. Eso es un viaje de ida y vuelta fuera del
producto y hay que diseñarlo como tal, no como un formulario.

(Para tu tranquilidad: una cena es un servicio presencial, así que Apple no
obliga a cobrarla por compra dentro de la app. Se puede cobrar fuera.)

**Mi mesa.** Tres fases: cerrada con cuenta atrás, abierta con todo, y
pasada. Es la pantalla donde el producto se cumple.

**Después de la cena.** Valorar, bloquear y reportar, como tres caminos
independientes. Bloquear va al lado de valorar, sin ceremonia. Reportar es
otro camino y lo lee una persona.

**Cancelar.** Más de 24 horas devuelve el crédito entero; menos, se pierde.

**Mi perfil.** Sus respuestas, sus créditos, su verificación. Y **solo el
número de cenas**, sin detalle de con quién ni cuándo: Aro no es una agenda
de contactos.

---

## 4 · Lo que no puede pasar

- **Nada dice "algo salió mal".**
- **Ninguna cifra derivable escrita a mano.** Si sale de un dato, se calcula.
  Ya nos ha mordido tres veces.
- **Ningún control por debajo de 44px** (48 en Android).
- **Nada simulado ni cromo de maqueta**: ni botones DEMO, ni conmutadores de
  dispositivo, ni atajos que salten a un estado que no existe.
- **La revelación no se adelanta.** Ni un minuto, ni "ya casi", ni un aviso
  previo que diga con quién. Es la única regla del producto que no admite un
  fallo.
- **No hay fotos de perfil.** En ninguna pantalla, tampoco aquí.

---

## 5 · Lo que necesito en el handoff

Lo mismo que la §5 de la entrega 7, y funcionó: por cada pantalla, de dónde
se llega, qué guarda y cuándo, y qué viene premarcado.

Y tres cosas más, propias de app:

1. **Qué notificaciones existen**, qué dice cada una y a qué pantalla abre.
2. **Qué se ve sin conexión** en las pantallas que puedan abrirse en la calle.
3. **Dónde y cómo se piden los permisos**, y el camino de quien los niega.

---

## 6 · Una advertencia honesta

En web hemos hecho las cosas en un orden que nos ha costado caro: pantallas
diseñadas antes de que el modelo estuviera cerrado, y luego un documento tuyo
—el Journey— que se quedó viejo en cuatro puntos.

Dos partes de esto no están cerradas del todo: **el pago** —falta el dato
real de Pago Móvil y cómo se concilia— y **el post-cena**, que en web todavía
no está cableado.

Diséñalas igual, pero sabiendo que son las dos que más pueden moverse. Si en
alguna prefieres esperar, dilo y las dejamos para una segunda tanda.

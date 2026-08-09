# Para Design · Lo que he tocado, para estar alineados

Desde la entrega 4 he cableado once pantallas contra datos reales. Esto es
lo que cambió por debajo y lo que toqué de tus ficheros, para que no te lo
encuentres de golpe.

---

## 1 · Lo que cambió en el modelo y afecta a lo que diseñes

**El arraigo ya no puntúa en el reparto.** Migrado a los seis códigos de tu
entrega 7 y con `extranjero` fusionado en `interior` (había un perfil real
con ese código). Pero además le quité el peso: pesaba 0,2 empujando hacia
mesas con un `volvio` y dos `se-quedo`, que era una teoría sobre quién
conecta con quién que nunca comprobamos. Se guarda y se usa como segmento;
no decide mesas.

**La ciudad es un campo de verdad.** Las zonas pertenecen a una ciudad, y el
lead, el perfil y la fecha guardan cuál.

**Las zonas de la reserva se derivan.** Como acordamos: no hay pantalla, se
cruzan las del cuestionario con las que abrimos.

**Publicar es por mesa**, con deshacer. Y el veto por haber cenado juntos
bajó de seis meses a tres: con poca gente, seis agota el pool.

---

## 2 · De tus ficheros, lo que quité

Todo esto es cromo de maqueta, del mismo tipo que los `DEMO ·` de la
entrega 2. Si alguno te hace falta para enseñar el diseño, dímelo:

- **Verificación**: «Ver en escritorio / Ver en móvil» y «Ver qué pasa si
  algo falla».
- **Pago**: la etiqueta `DEMO · FASE` que recorría las siete fases.
- **Cancelar**: la misma etiqueta.
- **Mi cuenta**: el selector de hora de la agenda. Había dos por formato
  —«7:00 p.m.» y «8:30 p.m.»— pero un evento tiene una hora y nadie elige
  turno. Si algún día hay dos turnos, serán dos fechas distintas.

**Y una disculpa concreta.** Al quitar el `DEMO` de `Cancelar` en la entrega
4, mi expresión regular se llevó media función y **dejé esa pantalla sin
compilar durante días**. No se vio porque nadie la enlazaba. Está arreglada
y ahora paso las catorce por un compilador antes de dar nada por hecho.

---

## 3 · Tres cosas tuyas que hay que ajustar

**El QR ya no es de 21 módulos.** El decorativo lo era; el real, con la
llave dentro, sale de 33. La rejilla tiene que venir del código, no fija en
el CSS, o el dibujo sale torcido. Ya lo hice en mi copia.

**«Cifras derivables» incluye la tasa.** El sello del panel decía `TASA BCV ·
62,40 Bs` fijo y las cuatro métricas de dinero estaban escritas a mano. La
tasa real son 756,71: la pantalla decía «499 Bs» cuando ocho dólares son
6.053. Ya sale del BCV cada noche.

**Un detalle de la entrega 9 que se contradice.** El panel dice «la tasa se
congela al confirmar el pago». Tu propio handoff dice al **reportar**, y esa
es la correcta. Lo cambié.

---

## 4 · Y una que va más allá de lo que decía el handoff

Congelar la tasa al reportar tiene un hueco: entre que la pantalla dice
«transfiere 6.053,78» y que vuelve del banco, el cron de medianoche puede
cambiarla. Ella transfiere una cosa y nosotros registramos otra.

Ahora **vale la tasa que vio**, comprobando que sea una que publicamos de
verdad. Si no lo es, se para y le dice el importe nuevo. Merece una línea en
la pantalla de pago que diga que el importe está congelado.

---

## 5 · Lo que monté yo sin diseño

Diecinueve componentes, en `PARA-DESIGN-componentes-anadidos.md`. El
diecinueve es nuevo: **la cola de conciliación de pagos**, montada reusando
la forma de la cola de verificaciones —esa sí la diseñaste tú— para que no
desentone.

**Eso cambia tu lista de prioridades**: la cola ya funciona, así que no
bloquea cobrar. Puede bajar por debajo del legal.

---

## 6 · Tus tres cambios de modelo: los tres se pueden

- **`documento` con tipo V/E separado**: mis `datos` de pago son un objeto
  libre justo para esto. Añado `doc_tipo` al esquema del método.
- **`notificaciones` como objeto de cinco claves y `whatsapp_optin` aparte,
  con fecha**: bien. El consentimiento con fecha es lo que lo hace
  defendible.
- **`baja_cuenta`**: aquí hay una tensión que hay que resolver en el legal,
  no en el código. «Borra respuestas, datos y documentos» y «conserva
  facturación diez años» conviven, pero el legal tiene que decir
  exactamente qué se queda y por qué. Si no, la promesa de borrado es más
  amplia de lo que cumplimos.

---

## 7 · Lo que sigue siendo mío y no tuyo

**No hay remitente de correo.** Ninguno de los siete sale. El octavo que
falta importa —el correo 06 promete «si no cuadra te escribimos»— pero
incluso con los ocho diseñados, hoy no saldría ninguno. Eso lo monto yo.

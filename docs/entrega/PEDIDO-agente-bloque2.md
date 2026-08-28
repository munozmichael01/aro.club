# Bloque 2 · la red de recuperación, y la entrega 16

Anunciaste este bloque al cerrar el bloque 1 y no llegó ningún commit. Lo
retomas desde `main`, que ya trae dos arreglos míos de anoche.

**Reparto, para no pisarnos.** Yo estoy en `public/Aro Club - Datos base.dc.html`,
`public/Aro Club - Landing v4.dc.html` y `scripts/`. **No los toques.** Tú
tienes migraciones, `src/lib/correos.ts`, los crons, `/api/salud`, la pantalla
nueva de la encuesta y `next.config.ts`.

---

## Contexto: por qué esto es urgente y no cosmético

Michael se registró anoche como un desconocido cualquiera y **no había forma de
recuperarlo**. Cuatro puertas, las cuatro contra la pared:

| puerta | qué pasaba |
|---|---|
| enlace del correo | faltaba `&correo=` — arreglado, `72b5709` |
| «Todavía no tengo cuenta» | reinicia y borra todo |
| «Entrar» | login con una contraseña que nunca creó |
| volver con su correo | detecta «repetido» y lo manda al mismo login |

De eso salen tus tres encargos. El primero es el que más pesa.

---

## 1 · El empujón nunca ha salido, ni una vez

`cron/empujon` encola con `kind: 'bienvenida'`. Y existe
`scheduled_emails_bienvenida_unica`: índice único sobre `(email)` donde
`kind='bienvenida'`. **Uno por correo, para siempre.**

Como la bienvenida sale en el mismo segundo en que alguien deja su dirección,
el empujón siempre choca con el índice. `encolar` trata el `23505` como
respuesta normal —lo es, para una bienvenida repetida— y lo traga en silencio.

La base lo confirma: 38 correos, 9 tipos, **cero empujones**.

- Tipo propio para el empujón, separado de `bienvenida`, con su propia regla de
  «uno por persona» (que sí queremos: insistir es spam).
- Ojo con la otra rama: el empujón de verificación encola con `{ perfil: id }`,
  que deja `email` nulo y **esquiva** el índice parcial. Comprueba si esa vía
  puede repetirse cada hora, y si puede, ciérrala.
- La plantilla ya sabe pintar los dos estados (`falta: 'perfil'` /
  `'verificacion'`); no hace falta diseño nuevo, sí un `kind` nuevo.

**Aceptación:** siembra un lead parado hace más de una hora, corre el cron, y
enséñame la fila encolada. Hoy no aparece ninguna.

## 2 · `sent_at` no distingue enviado de tirado a la basura

En `correos.ts`, tres desenlaces escriben la misma marca:

- se envió de verdad (línea ~247)
- **no se pudo armar** (línea ~192): un `console.error` y se cierra la fila
- estaba dado de baja (línea ~208)

Solo «sin remitente» no la escribe. Anoche perdí un buen rato creyendo que un
correo no había salido porque la fila decía «enviado» — y sí había salido. Al
revés es peor: un correo que nunca se armó queda idéntico a uno entregado.

- Estado explícito y motivo. Que se pueda preguntar «¿cuántos no salieron y por
  qué?» sin leer logs de Vercel.
- `/api/salud` hoy mira tres variables y dice `ok` con el correo entero muerto.
  Que vigile el remitente y la cola.

**Aceptación:** una consulta que separe los tres, y `/api/salud` en rojo si
falta `RESEND_API_KEY`.

## 3 · Entrega 16, entera

`/api/despues` ya existe —F11, con valorar, bloquear y reportar— pero **no hay
pantalla ni ruta**: hoy no puede llegar nadie. Falta:

- la pantalla de la encuesta y su ruta en `next.config.ts`
- el correo 16 que lleva a ella (`src/lib/correos-plantillas/`, y su caso en
  `correos-datos.ts`)
- el interruptor de asistencia en Histórico: **hoy `attended` tiene cero
  escrituras en todo `src/`**

Recuerda la regla: **quién vino lo marca operación, no el usuario**, y la
encuesta no clasifica persona por persona — el veto es de tres meses, así que
un «sí repetiría con X» no se puede usar. El único dato aplicable es el
negativo, y va como salida opcional.

---

## Cómo quiero el resultado

Igual que el bloque 1, que estuvo bien: **rompe a propósito lo que arreglas y
enséñame que salta.** Lo que más valoró Michael de tu entrega anterior fue que
te pillaste tú mismo el comprobador que escondía el fallo.

Y no des nada por hecho sin ejecutarlo. Tres de los cuatro fallos de anoche
eran invisibles leyendo el código y evidentes usándolo.

`npx tsc --noEmit && node scripts/comprobar-cuestionario.mjs && node scripts/comprobar-pantallas.mjs`
antes de cada push. Commit y push juntos.

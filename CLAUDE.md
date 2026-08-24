# Aro Club

Seis desconocidos verificados, una cena curada por semana en Caracas, 8 USD
pagados en bolívares. Next.js 15 App Router · TypeScript strict · Supabase ·
Vercel Pro.

Las pantallas son ficheros estáticos `.dc.html` en `public/`, servidos por
rutas limpias en `next.config.ts`, con el runtime DCLogic de `public/support.js`
(`<x-dc>`, `<sc-for>`, `<sc-if>`). Las reglas compartidas viven en
`public/reglas.js` y las consume el navegador **y** el servidor vía
`src/lib/reglas.ts`. Design entrega pantallas en `docs/entrega/entrega N/`.

---

## Antes de cada push

```bash
npx tsc --noEmit && node scripts/comprobar-cuestionario.mjs
```

El primero porque el CI lo exige y el dev server no caza errores de tipos. El
segundo porque compara las opciones del cuestionario con el catálogo de la
base, y ese descuadre no falla nada visible: la respuesta se pierde al guardar
y la persona sigue adelante creyendo que quedó.

**No** correr `npm run build` con el dev server vivo: corrompe `.next` y
produce un 500 fantasma.

### Nunca un bucle esperando a un comando que puede pedir login

Prohibido `until … npx vercel …; do sleep …; done` y cualquier variante. Ha
pasado **dos veces**, desde dos sesiones distintas: la sesión del CLI caduca,
`vercel ls` deja de listar y pide autorización de dispositivo, y el bucle la
vuelve a pedir cada diez segundos. La primera vez fueron cuarenta y cinco
horas y unas dieciséis mil peticiones; la segunda, veinte pestañas abiertas en
el navegador de Michael.

Un `until` sin tope convierte un fallo de sesión en una inundación. Si hace
falta esperar a un despliegue: una comprobación, y si no está lista, decirlo y
seguir. Nunca un bucle sin número máximo de vueltas.

Y **nunca `vercel login`**. Es lo que borra `auth.json` cuando el flujo no se
completa, y a partir de ahí todo vuelve a pedir autorización. El token vive en
`VERCEL_TOKEN` en el `~/.zshrc` de Michael y el CLI lo lee solo. Si un comando
falla por sesión: se dice y se para.

---

## Antes de tocar un enum, una constante o un esquema

Esto no es higiene, es la causa del último fallo grave. Se añadió `extranjero`
al enum `rootedness_t` porque la pantalla lo mandaba y la columna lo rechazaba
— cuando la entrega 7 lo había **retirado a propósito**, dejando escrito el
motivo en su propia migración. La pantalla era lo que estaba viejo.

```bash
git log -S'<el valor>' -- supabase/migrations/   # ¿quién lo puso y por qué?
```

1. **Leer la migración que creó lo que vas a cambiar.** El porqué está escrito
   ahí. Un valor retirado a propósito parece un valor que falta.
2. **Añadir un valor a un enum no es aditivo si alguien lo quitó antes.** Es
   deshacer una decisión.
3. Cuando la pantalla y la base no concuerdan, **la vieja suele ser la
   pantalla**, no el esquema.

---

## El cuestionario guarda por posición

En `public/Aro Club - Cuestionario.dc.html`, `OPC` tiene las opciones como
pares `[texto, código]` en **una sola lista**, y `COD` se deriva. Antes eran
dos listas emparejadas solo por el índice, y reordenar una guardaba la
respuesta equivocada —«Depende del momento» archivado como «lleva la
conversación»— sin error, sin validación fallida y sin verse en ninguna
pantalla.

**Nunca separarlas otra vez.** Un código `null` es una opción que a propósito
no es respuesta (hoy solo «Cualquier zona de la ciudad», que marca las demás).
El catálogo autoritativo está en la tabla `questions`; el comprobador vigila
que no se separen.

---

## Base de datos

- **El proyecto es `qdydmklrbsdemzvjsldo`.** Las herramientas MCP de Supabase
  apuntan a otro proyecto (`nrcqljqsbagdvjtbwysa`) y **no se usan nunca**.
  Todo va por la CLI (`npx supabase db push`) o REST con la llave de servicio.
- **No hay staging.** Ese Supabase es producción y `push` a `main` despliega a
  Vercel. La contraseña de la base no se pega en el chat.
- RLS por defecto deniega. `SUPABASE_SERVICE_ROLE_KEY` nunca llega al
  navegador. La única puerta pública es la vista `v_fechas_publicas`.
- Recon antes de escribir: `grep` en `scripts/`, `supabase/migrations/`,
  `docs/handoff/`. Nunca inventar datos de referencia ni esquemas paralelos, y
  preservar los IDs canónicos.

---

## Cómo se verifica

**En el navegador, con una cuenta desechable, no leyendo el código.** Los
fallos que han importado —el borrado en Storage, los crons parados, los correos
con el logo roto, la aprobación que no aprobaba— eran invisibles en el código y
evidentes al usarlo.

- Panel de operación: `somos.aroclub+demo@gmail.com` / `AroDemo-2608`
  (`node scripts/cuenta-demo.mjs` la repone).
- `scripts/banco-pruebas.mjs` crea una cuenta con el estado que se le pida.
- Nunca dar algo por cerrado sin haberlo ejecutado. Si algo no se pudo probar,
  decirlo.

---

## Producto: lo que no se negocia

- **No se limitan las reservas.** Se apunta quien quiera; el reparto sienta por
  afinidad y quien no entra va a la lista de espera. El cupo del local no
  restringe la distribución: el local es una elección estratégica y se cambia.
- **Sin verificar no hay puesto.** El candado va en `/api/reservar` **y** en
  `/api/pago`: reportar el pago es lo que aparta el puesto. Es la regla que
  sostiene que cinco desconocidos se sienten con alguien.
- **Las mesas se cuentan sobre verificados**, nunca sobre el total filtrado. Y
  cuando total y verificados difieren, se dice.
- La validación de la IA se le pide al dueño del dato, no a operación.
- Nunca quitar funcionalidad, ni del diseño ni del código: el resultado es un
  superset. Componentizar en vez de duplicar markup.
- Implementar los `.dc.html` de Design **fielmente** —pasos, estados, copy—, y
  contrastar cada pantalla con su maqueta antes de darla por hecha. Sin emojis
  genéricos: iconos SVG del sistema.

---

## Correo

Resend (región EU) desde `hola@aro.club`, plantillas en
`src/lib/correos-plantillas/`. El asunto sale del `<title>`. La envoltura del
correo va del **mismo color** que la tarjeta: dos cremas distintos se ven como
un marco blanco.

`encolar()` manda al momento además de dejarlo en la cola; el cron recoge lo
programado y lo que falle. Un acuse que contesta a algo que la persona acaba de
hacer no puede tardar un cuarto de hora — no se lee como una cola, se lee como
que no funcionó.

---

## Al trabajar

- Responder y alinear **antes** de implementar. No editar un entregable en
  medio de un intercambio, solo al cerrar todos los puntos.
- Verificar los criterios de aceptación **paso a paso**, nunca de corrido.
- Desplegar lo cerrado y verificado sin volver a pedir permiso.
- Commit y push juntos.
- No ser complaciente: vigilar el secuenciado, no solo la solución.
- Correo, cuentas, Google y Apple van al **final**.

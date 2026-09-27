@AGENTS.md

# La app de Aro Club

El encargo está en `PEDIDO-app-movil.md` y las decisiones en
`PROPUESTA-app-movil.md`. Las reglas de producto son las del `CLAUDE.md` de la
raíz: valen aquí igual.

## La sesión

- **El SDK de Supabase es su único dueño.** Se guarda en el llavero
  (`src/sesion/almacen.ts`), nunca en un almacén en claro.
- **Toda llamada a `aro.club/api` pasa por `api` de `src/sesion`.** Nada de
  `fetch` suelto: es lo que arma la cookie, refresca a tiempo y reintenta.
- **El refresh token no sale nunca del celular.** La cookie lo lleva vacío a
  propósito (`cookie.ts` explica por qué). Quitar eso hace que el servidor lo
  rote a escondidas y la persona acabe fuera sin motivo visible.

## Antes de cada push

```bash
npm run tipos && npm test
```

`npm test` corre dos veces, con el reloj de Madrid y con el de UTC: las
fechas se dicen en la zona de la ciudad, esté donde esté el celular. Y
incluye la prueba de que ningún día ni hora está escrito a mano fuera de
`src/texto/fechas.ts`.

Si tocaste la entrada o los datos personales, contra la API real (escribe una fila de `waitlist`
con un correo desechable y la borra):

```bash
npm run prueba:entrada
npm run prueba:datos
```

Y si tocaste `src/sesion/`, también contra la API real, con la cuenta
desechable del banco:

```bash
node ../scripts/banco-pruebas.mjs && npm run prueba:api; node ../scripts/banco-pruebas.mjs borrar
```

Instalar siempre con `npx expo install`, que elige las versiones compatibles
con el SDK. Las pruebas usan los tipos de Node y la app no: por eso tienen su
propio `tsconfig`. Un `Buffer` en `src/` compila en las pruebas y revienta en
Hermes.

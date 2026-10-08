import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El runtime de Design y las once copias que trae cada entrega. No es
    // nuestro código y no lo vamos a arreglar: con él dentro, `npm run lint`
    // devolvía 111 problemas de los que 22 eran errores suyos, y un lint que
    // nadie lee es un lint que no existe.
    "docs/entrega/**",
    "public/support.js",
    // React, ReactDOM y Babel, tal cual vienen de su publicacion. Son suyos,
    // no se tocan, y revisarlos aqui son 129 errores que no significan nada.
    "public/vendor/**",
    // La carpeta de marca de Design, que trae OTRA copia de su runtime. Es la
    // misma decisión que `public/support.js` y por el mismo motivo, pero se
    // escapó cuando la carpeta llegó: el CI lleva en rojo desde el 6 de
    // octubre por dos errores de `marca/support.js` —`react/no-deprecated` y
    // `no-assign-module-variable`— que no son código nuestro y que no vamos a
    // arreglar.
    "marca/**",
    // GSAP, tal cual viene de su publicación, para los reels. Mismo caso que
    // los de arriba: ocho errores suyos que no vamos a arreglar nunca. Y
    // aquí importa más de lo que parece, porque el fichero no está
    // versionado: el día que alguien lo suba, el CI se pone rojo por una
    // librería de terceros.
    "reel/lib/**",
    // La app. Es un proyecto aparte, con su propio tooling: el lint de la web
    // no tiene nada que decir sobre ella, y si lo intenta el CI se pone rojo
    // por un fichero que no es suyo.
    //
    // Se llama `app-mobile/` y no `App/` a propósito: en un Mac el sistema de
    // ficheros no distingue mayúsculas, `App/` ES `app/`, Next la toma por su
    // carpeta de rutas, encuentra una sin rutas y todo da 404 en local.
    "app-mobile/**",
  ]),
]);

export default eslintConfig;

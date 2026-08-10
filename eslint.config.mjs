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
  ]),
]);

export default eslintConfig;

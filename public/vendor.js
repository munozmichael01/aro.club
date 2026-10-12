/**
 * React, ReactDOM y Babel desde aro.club, no desde unpkg.com.
 *
 * ## Qué se rompe sin esto
 *
 * `support.js` los pide a unpkg y, si no llegan, la pantalla se queda EN
 * BLANCO: sin runtime no se resuelve ni un `{{ }}`. Un tercero caído, un
 * bloqueo de operadora o una conexión mala en Caracas y quien llega desde un
 * post no ve nada. Está registrado dos veces —`/` en un iPhone y
 * `/privacidad` en un Android viejo— y son los dos únicos errores nuestros
 * que dejan la página muerta del todo.
 *
 * ## Por qué aquí y no en `support.js`, que es donde están las URL
 *
 * Porque ya se arregló ahí y se perdió. El 13-08 se cambiaron las tres por
 * `/vendor/...` («El runtime deja de venir de unpkg.com»); el 26-09, al
 * reconstruir el runtime, volvieron a unpkg sin que nadie lo notara.
 * `support.js` lo dice en su primera línea: es GENERADO y no se edita.
 *
 * `cdnScriptFor` del propio runtime mira `window.__resources` antes de pedir
 * nada, así que esto es su mecanismo, no un parche: es un dato, no código
 * generado, y una reconstrucción no se lo puede llevar por delante.
 *
 * ## Va ANTES que `support.js`
 *
 * Como `errores.js`, y por lo mismo: el runtime lee este mapa en cuanto
 * arranca. Después no sirve de nada.
 *
 * ## Si se sube la versión de React
 *
 * Las claves son las URL EXACTAS que pide `support.js`. Si una
 * reconstrucción trae otra versión, la clave deja de coincidir y vuelve a
 * unpkg en silencio, que es el fallo de arriba otra vez. Lo vigila
 * `comprobar-cuestionario.mjs`: compara estas claves con las URL del runtime
 * y falla si se separan. Al subir versión: bajar el fichero a
 * `public/vendor/`, comprobar su SRI contra el del runtime, y cambiar la
 * clave aquí.
 */
window.__resources = Object.assign({}, window.__resources, {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js':
    '/vendor/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js':
    '/vendor/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js':
    '/vendor/babel.min.js',
});

/**
 * Google Tag Manager, en su propio fichero.
 *
 * Va SEPARADO de `errores.js` a propósito, y no por orden: son dos cosas con
 * prioridades opuestas. El capturador de errores tiene que cargar el primero
 * y no fallar nunca —es lo que avisa cuando una pantalla revienta—; la
 * analítica es «si carga, bien». Juntándolos, un fallo en cualquiera de los
 * dos se lleva los dos, y el que importa es el otro.
 *
 * Aquí vive el CONTENIDO una sola vez. Cada pantalla lleva su `<script src>`,
 * y de que esa línea no falte se encarga `scripts/comprobar-pantallas.mjs`:
 * el ×19 que duele es copiar el fragmento, no la referencia.
 *
 * ## El `<noscript>` de Google no está, y es a propósito
 *
 * El fragmento oficial trae un iframe para quien navega sin JavaScript. Ese
 * píxel mediría a gente que no puede usar el sitio: nuestras propias
 * pantallas le dicen «Aro Club no funciona con JavaScript desactivado». Sería
 * contar a quien está mirando ese cartel.
 *
 * Y ese iframe es lo único que no se puede cargar desde aquí —por definición—
 * así que mantenerlo significaría volver a copiar algo en diecinueve sitios.
 */
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-M3RMGKVK');

/**
 * Las rutas de aro.club que abren la app, en un solo sitio del lado web.
 *
 * LA MISMA LISTA ESTÁ EN TRES SITIOS Y NO SE PUEDE JUNTAR MÁS: aquí, en
 * `app-mobile/src/enlaces.ts` (que es quien decide a qué pantalla va cada una)
 * y en `app-mobile/app.json` (que es lo que se compila dentro de la app). Las
 * dos primeras las cruza `scripts/comprobar-cuestionario.mjs`; la tercera la
 * lleva el agente de la app.
 *
 * Si una ruta se añade aquí y no allí, el teléfono abre la app y la app no
 * sabe qué enseñar. Si se añade allí y no aquí, el enlace abre el navegador y
 * nadie se entera de que debía abrir la app: no falla nada, simplemente no
 * ocurre. Por eso se vigila.
 *
 * SOLO EL ÁREA DE MIEMBRO. La landing, lo legal, `/clave` y `/baja` se quedan
 * en el navegador a propósito: llevan un token de un solo uso que la web
 * canjea, y mandarlo a la app es perderlo.
 */
export const RUTAS_QUE_ABREN_LA_APP = [
  '/cuenta',
  '/perfil',
  '/mesa',
  '/mi-mesa',
  '/pago',
  '/cancelar',
  '/verificacion',
  '/datos',
  '/cuestionario',
] as const

/** El identificador de la app en Apple: equipo + bundle. */
export const APP_ID_APPLE = '696DAG5UG5.club.aro.app'

/** El paquete de la app en Android. */
export const PAQUETE_ANDROID = 'club.aro.app'

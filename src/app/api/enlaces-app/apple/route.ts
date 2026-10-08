import { NextResponse } from 'next/server'

import { APP_ID_APPLE, RUTAS_QUE_ABREN_LA_APP } from '@/lib/enlaces-app'

/**
 * `/.well-known/apple-app-site-association`.
 *
 * Es el fichero con el que aro.club confirma que la app puede abrir sus
 * enlaces. Sin él, un enlace de un correo abre Safari aunque la app esté
 * instalada y aunque la app reclame el dominio: la confirmación la da el
 * dominio, no la app, que es justo lo que impide que cualquiera reclame
 * enlaces ajenos.
 *
 * TRES COSAS QUE APPLE EXIGE Y QUE SE ROMPEN SOLAS:
 *
 *  1. **Sin extensión.** La ruta es exactamente
 *     `/.well-known/apple-app-site-association`, sin `.json`.
 *  2. **`application/json`.** Un fichero sin extensión en `public/` sale como
 *     `application/octet-stream` y Apple lo descarta. Por eso es una ruta y
 *     no un fichero suelto: aquí la cabecera se escribe a mano.
 *  3. **Sin redirección.** Apple no sigue redirecciones al buscarlo. Llega
 *     por una REESCRITURA de `next.config.ts` —que no cambia la URL— y no por
 *     un `redirects()`, que devolvería un 308 y lo tiraría todo abajo.
 *
 * El formato es el de `components`, el actual. `paths` es el de iOS 12 y no
 * se pone: con los dos, el que manda es `components`, y tener dos listas que
 * decir lo mismo es la forma de que una se quede atrás.
 *
 * Una ruta SIN `?` declarado casa con cualquier query, que es lo que hace
 * falta: los enlaces de los correos llevan `?evento=…` y el del cuestionario
 * lleva su token.
 */
export const dynamic = 'force-static'

export async function GET() {
  const cuerpo = {
    applinks: {
      details: [
        {
          appIDs: [APP_ID_APPLE],
          components: RUTAS_QUE_ABREN_LA_APP.map((ruta) => ({ '/': ruta })),
        },
      ],
    },
  }

  return new NextResponse(JSON.stringify(cuerpo, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      // Un día. Apple lo cachea en su CDN de todas formas, pero esto evita
      // que una ruta nueva tarde una semana en llegar a los teléfonos.
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

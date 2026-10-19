import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Todo salvo archivos estáticos. El manifest y los iconos quedan fuera a
     * propósito: la PWA tiene que poder instalarse sin sesión.
     *
     * Y desde el 19-10, también los `.js`, `.css` y demás ficheros sueltos,
     * que es de donde venía el 504.
     *
     * El middleware llama a `getUser()` en TODO lo que entra aquí, y eso es
     * una ida y vuelta al servidor de auth de Supabase por petición. Una
     * visita a la portada pedía `gtm.js`, `vendor.js`, `support.js`,
     * `reglas.js`, `errores.js` y los dos de React: siete ficheros que no
     * saben lo que es una sesión y que costaban siete consultas de auth.
     *
     * Michael vio un `504 MIDDLEWARE_INVOCATION_TIMEOUT` desde el celular y
     * la web lenta. El agente de la app lo ató a esto y es correcto: con auth
     * lento un rato, cualquier página revienta aunque no necesite sesión,
     * porque el middleware se queda esperando delante de un `.js`.
     *
     * Las páginas sí siguen pasando: se sirven desde rutas limpias
     * —`/cuenta`, no `/… .dc.html`— y ahí la sesión hay que refrescarla.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|mjs|css|map|woff|woff2|ttf|txt|xml|html)$).*)',
  ],
}

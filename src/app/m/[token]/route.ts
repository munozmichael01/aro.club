import { COOKIE_MAS_UNO, leerInvitacion } from '@/lib/mas-uno'
import { MAS_UNO } from '@/lib/reglas'
import { SITIO } from '@/lib/remitente'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El enlace de «+1 acompañante»: aro.club/m/<token>.
 *
 * Dos cosas, y por eso no es una redirección a secas:
 *
 *  · La VISTA PREVIA del enlace en WhatsApp (3B de la entrega mas-uno):
 *    «Ana te invita a una cena de Aro Club» con el isotipo. WhatsApp lee
 *    las etiquetas de la página que recibe, no de la que haya detrás de una
 *    redirección, y las pantallas `.dc.html` son ficheros estáticos que no
 *    saben quién invita. Así que esta ruta contesta una página mínima con
 *    las etiquetas y un salto inmediato a la invitación.
 *  · Guardar el token para quien todavía no tiene sesión: lo recoge
 *    `loQueTraia` al entrar o al darse de alta. Una semana, que es lo más
 *    que dura una fecha abierta.
 *
 * Nada se decide aquí: si el enlace ya no vale, lo dice la invitación.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: crudo } = await params
  const token = String(crudo ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  if (!token) return Response.redirect(new URL('/', request.url), 302)

  const destino = `/acompanante?t=${token}`
  const inv = await leerInvitacion(createAdminClient(), token, null).catch(() => null)
  const titulo = MAS_UNO.tituloDelEnlace(inv?.invita ?? null)
  const descripcion = 'Una cena de dúos: tu puesto ya está pagado. Regístrate y verifícate para sentarte.'

  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titulo)}</title>
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:image" content="${SITIO}/icono-512.png">
<meta property="og:url" content="${SITIO}/m/${token}">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url=${destino}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head><body style="margin:0;background:#FAF3E4;font:400 16px/1.5 system-ui,sans-serif;color:#14342A">
<p style="max-width:30rem;margin:20vh auto;padding:0 24px"><a href="${destino}" style="color:#1B5138">Abrir la invitación</a></p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body></html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': [
        `${COOKIE_MAS_UNO}=${token}`,
        'Path=/',
        `Max-Age=${7 * 24 * 3600}`,
        'SameSite=Lax',
        'HttpOnly',
        new URL(request.url).protocol === 'https:' ? 'Secure' : '',
      ].filter(Boolean).join('; '),
    },
  })
}

import { NextResponse } from 'next/server'

/**
 * La ruta corta del QR.
 *
 * El nombre real de la pantalla es "Aro Club - Verificacion.dc.html", que
 * con los espacios codificados y el código detrás daba una URL de 90 y
 * pico caracteres: un QR de 41 módulos que a 180px de ancho son cuatro
 * píxeles por módulo. Escaneable en teoría y desesperante en un pasillo con
 * mala luz. Con /v/<codigo> baja a 33.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const destino = new URL('/Aro Club - Verificacion.dc.html', _request.url)
  destino.searchParams.set('t', token)
  return NextResponse.redirect(destino, 302)
}

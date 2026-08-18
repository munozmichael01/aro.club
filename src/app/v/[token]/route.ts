import { NextResponse } from 'next/server'

/**
 * La ruta corta del QR.
 *
 * Nació porque la pantalla se servía por el nombre del fichero —"Aro Club -
 * Verificacion.dc.html"—, que con los espacios codificados y el código detrás
 * daba una URL de 90 y pico caracteres: un QR de 41 módulos que a 180px de
 * ancho son cuatro píxeles por módulo. Escaneable en teoría y desesperante en
 * un pasillo con mala luz. Con /v/<codigo> baja a 33.
 *
 * Sigue valiendo la pena aunque desde el 18 de agosto la pantalla tenga ruta
 * limpia: `/verificacion?t=<codigo>` es corta, pero `/v/<codigo>` lo es más, y
 * los QR ya impresos apuntan aquí.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const destino = new URL('/verificacion', _request.url)
  destino.searchParams.set('t', token)
  return NextResponse.redirect(destino, 302)
}

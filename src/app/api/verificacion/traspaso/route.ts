import QRCode from 'qrcode'
import { NextResponse } from 'next/server'

import { crearTraspaso, MINUTOS } from '@/lib/traspaso'
import { createClient } from '@/lib/supabase/server'

/**
 * El QR de escritorio.
 *
 * Devuelve la matriz, no una imagen: la pantalla de Design ya dibuja el
 * código celda a celda con su propio color y su propio radio. Mandar un PNG
 * obligaría a meter una imagen ajena al sistema visual en mitad de la
 * pantalla, y encima a servirla desde algún sitio.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const traspaso = await crearTraspaso(user.id)
  if (!traspaso) {
    return NextResponse.json({ error: 'No pudimos preparar el traspaso.' }, { status: 500 })
  }

  // El origen sale de la propia petición: en producción es el dominio real
  // y en local es la máquina desde la que se abrió, que es la única que el
  // teléfono podría alcanzar. Una variable de entorno fija apuntaría a
  // producción incluso mientras se prueba en local.
  // Ruta corta a proposito: el nombre real de la pantalla lleva espacios y
  // dejaba una URL de noventa y pico caracteres, o sea un QR de 41 modulos
  // que a 180px son cuatro pixeles por modulo. /v/<codigo> baja a 33.
  const origen = new URL('/v/' + traspaso.token, new URL(request.url).origin)

  const qr = QRCode.create(origen.toString(), { errorCorrectionLevel: 'M' })
  const lado = qr.modules.size
  const celdas: boolean[] = []
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) celdas.push(qr.modules.get(x, y) === 1)
  }

  return NextResponse.json({
    lado,
    celdas,
    // No se devuelve el token suelto: quien mira esta respuesta ya lo tiene
    // dentro del QR, y tenerlo dos veces solo multiplica dónde se filtra.
    caducaEn: traspaso.expira,
    minutos: MINUTOS,
  })
}

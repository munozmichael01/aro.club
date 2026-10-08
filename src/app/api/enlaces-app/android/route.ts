import { NextResponse } from 'next/server'

import { PAQUETE_ANDROID } from '@/lib/enlaces-app'

/**
 * `/.well-known/assetlinks.json`.
 *
 * Lo mismo que el de Apple, para Android: sin este fichero el enlace de un
 * correo abre Chrome aunque la app esté instalada.
 *
 * LA HUELLA NO ESTÁ ESCRITA AQUÍ. Es el SHA-256 del certificado con el que
 * Play firma la app, y lo copia Michael de Play Console (Integridad de la app
 * → Firma de apps). Va en `ANDROID_SHA256`, en Vercel.
 *
 * Suelen ser DOS: el de firma de la app, que es con el que Play firma lo que
 * se instala, y el de subida, que es con el que se firma lo que sube quien
 * publica. Se admiten varias separadas por coma: con solo la de subida, los
 * enlaces funcionan en una compilación local y no en la de la tienda, que es
 * el fallo que se descubre tarde y en el teléfono de otro.
 *
 * SIN LA VARIABLE, 404 Y NO UN FICHERO VACÍO. Un `assetlinks.json` con una
 * huella que no es la buena es peor que no tenerlo: Google lo cachea, da la
 * verificación por fallida y deja de reintentar. Un 404 se reintenta.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const huellas = (process.env.ANDROID_SHA256 ?? '')
    .split(',')
    .map((h) => h.trim().toUpperCase())
    .filter(Boolean)

  if (!huellas.length) {
    console.error('[enlaces-app] falta ANDROID_SHA256: los enlaces no abrirán la app en Android')
    return new NextResponse(null, { status: 404 })
  }

  const cuerpo = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PAQUETE_ANDROID,
        sha256_cert_fingerprints: huellas,
      },
    },
  ]

  return new NextResponse(JSON.stringify(cuerpo, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

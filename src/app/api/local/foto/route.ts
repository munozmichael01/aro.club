import { NextResponse } from 'next/server'
import sharp from 'sharp'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La foto de la entrada de un local, servida por nosotros.
 *
 * La entrega 20 la pone en Mi mesa —«AL LLEGAR · BUSCA ESTA ENTRADA»— y en
 * los correos de la mesa. Las tres superficies necesitan la MISMA dirección,
 * y eso es justo lo que el bucket no puede dar: `locales` es privado, y una
 * URL firmada caduca. El panel las firma a 300 segundos, que está bien para
 * una ficha abierta en pantalla y no vale para nada que se guarde: un correo
 * se abre tres días después, o se reenvía, y ahí la foto ya no carga.
 *
 * Así que la dirección es nuestra y no cambia nunca. Lleva el id del local,
 * no la ruta del fichero: con la ruta, cualquiera podría pedir lo que
 * quisiera del bucket, que es donde también viven las cédulas.
 *
 * SIN SESIÓN, a propósito: la mira un cliente de correo, que no tiene
 * ninguna. Lo que enseña es la fachada de un restaurante abierto al público
 * —lo que ve quien pasa por la calle—, y hace falta su id para pedirla.
 *
 * Y se encoge aquí. Las que hay pesan entre 400 KB y 1,8 MB, que en el
 * teléfono de alguien con datos es una foto que no termina de cargar justo
 * cuando va llegando al sitio. 1200 px de ancho es el doble de lo que ocupa
 * en pantalla, para que se vea bien en retina.
 */

export const dynamic = 'force-dynamic'

/** Lo que pidió el agente de la app: ~1200 px de ancho, JPG. */
const ANCHO = 1200

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const id = params.get('id')

  // La versión es solo para la caché: cambia cuando se sube otra foto, y así
  // la nueva se ve sin esperar a que caduque nada. Aquí no se mira.
  const versionada = !!params.get('v')

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse(null, { status: 404 })
  }

  const admin = createAdminClient()

  const { data: local } = await admin
    .from('restaurants')
    .select('facade_photo_path')
    .eq('id', id)
    .maybeSingle()

  if (!local?.facade_photo_path) return new NextResponse(null, { status: 404 })

  const { data: fichero, error } = await admin.storage
    .from('locales')
    .download(local.facade_photo_path)

  if (error || !fichero) {
    console.error('[local/foto] no se pudo leer', local.facade_photo_path, error)
    return new NextResponse(null, { status: 404 })
  }

  /**
   * `rotate()` sin argumentos aplica la orientación del EXIF.
   *
   * Sin eso, una foto hecha con el teléfono de lado sale girada: el dato está
   * en la cabecera y al reescribir el fichero se pierde si no se usa.
   */
  const encogida = await sharp(Buffer.from(await fichero.arrayBuffer()))
    .rotate()
    .resize({ width: ANCHO, withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true })
    .toBuffer()

  return new NextResponse(new Uint8Array(encogida), {
    headers: {
      'Content-Type': 'image/jpeg',
      // Con versión, para siempre: esa URL ya no puede querer decir otra
      // cosa. Sin versión, un día, que es lo que tarda en verse un cambio
      // hecho desde el panel.
      'Cache-Control': versionada
        ? 'public, max-age=31536000, s-maxage=31536000, immutable'
        : 'public, max-age=86400, s-maxage=86400',
    },
  })
}

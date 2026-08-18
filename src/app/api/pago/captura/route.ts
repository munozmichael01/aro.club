import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * La captura del pago, subida de verdad.
 *
 * El botón «Adjuntar captura» de la pantalla de pago no abría ningún
 * selector: invertía un booleano. La pantalla decía «Captura adjunta ✓» sin
 * que se hubiera subido nada, y encima ese booleano viajaba dentro de `datos`
 * —que el servidor valida como `Record<string, string>`—, así que tocarlo
 * hacía que reportar el pago devolviera 400 y no había forma de salir de ahí
 * sin recargar. El botón que el producto ofrece para mandar el comprobante
 * impedía pagar.
 *
 * Lo que faltaba era esto y solo esto: el bucket `comprobantes` existe desde
 * la entrega 9, `payments.captura_path` también, y la cola de conciliación ya
 * firma esa ruta para enseñarla. Estaba todo hecho menos la puerta de entrada.
 *
 * Se sube ANTES de reportar y devuelve la ruta; el reporte la manda como un
 * campo propio y no dentro de `datos`, que es del método y son textos que
 * escribió la persona.
 */

/** Lo que acepta el bucket, y el mismo tope de 8 MB que declara. */
const TIPOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}
const TOPE = 8 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const formulario = await request.formData().catch(() => null)
  const archivo = formulario?.get('archivo')

  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: 'No llegó ninguna imagen.' }, { status: 400 })
  }
  if (archivo.size > TOPE) {
    return NextResponse.json(
      { error: 'La imagen pesa más de 8 MB. Haz una captura en vez de mandar la foto original.' },
      { status: 413 },
    )
  }

  const ext = TIPOS[archivo.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Tiene que ser una imagen o un PDF.' },
      { status: 415 },
    )
  }

  // La ruta la decide el servidor y empieza por el id de quien sube, que es
  // lo que permite comprobar después que nadie adjunta la captura de otro.
  const ruta = `${user.id}/${Date.now()}.${ext}`

  const { error } = await createAdminClient().storage
    .from('comprobantes')
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false })

  if (error) {
    console.error('[pago/captura] no se subió', error)
    return NextResponse.json({ error: 'No pudimos guardar la captura.' }, { status: 500 })
  }

  // Solo la ruta. La URL para verla la firma la cola de conciliación cuando
  // toca mirarla, cinco minutos cada vez.
  return NextResponse.json({ ruta })
}

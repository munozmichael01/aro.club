import { NextResponse } from 'next/server'

import { diaCompleto } from '@/lib/fechas'
import { cerrarTraspasos, perfilDeTraspaso } from '@/lib/traspaso'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * F4 · Verificación de identidad.
 *
 * La pantalla le promete a quien sube su cédula cuatro cosas concretas, y
 * las cuatro se deciden aquí:
 *
 *   - "cifrado en nuestros servidores": bucket privado, sin política de
 *     lectura. Ni siquiera su dueño lo vuelve a ver.
 *   - "una persona de operación": la única lectura es una URL firmada que
 *     caduca, y la pide una ruta con rol ops.
 *   - la ruta del fichero la elige el servidor. Si la eligiera el
 *     navegador, se podría escribir sobre la cédula de otra persona.
 *   - "se borra a los 90 días": purgar_documentos_verificacion().
 */

const TIPOS = { cedula: 'id_document', selfie: 'selfie' } as const
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
/**
 * Cuatro megas, por debajo del limite de la plataforma.
 *
 * Estaba en ocho, y el cuerpo de una peticion no puede pasar de 4,5 MB en
 * produccion: una foto de iPhone pasaba nuestra comprobacion y moria fuera,
 * asi que la pantalla ensenaba un fallo generico despues de un minuto de
 * "Subiendo". Ahora el limite es nuestro y el mensaje tambien.
 *
 * La pantalla ademas encoge la foto antes de mandarla, asi que llegar aqui
 * con mas de cuatro megas ya solo pasa si el navegador no supo decodificarla.
 */
const MAXIMO = 4 * 1024 * 1024

/**
 * De quién es esta verificación: de quien tiene sesión, o de quien llega
 * con el código del QR desde el teléfono. El código no abre sesión ni sirve
 * para nada más que estas dos rutas.
 */
async function deQuien(token: string | null): Promise<string | null> {
  if (token) return perfilDeTraspaso(token)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(request: Request) {
  const user = await deQuien(new URL(request.url).searchParams.get('t'))
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const { data: filas } = await createAdminClient()
    .from('verifications')
    .select('kind, status, rejection_reason, created_at, reviewed_at, storage_path')
    .eq('profile_id', user)
    .order('created_at', { ascending: false })

  const viva = (kind: string) =>
    (filas ?? []).find((f) => f.kind === kind && f.status !== 'expired')

  const doc = viva('id_document')
  const selfie = viva('selfie')
  const rechazada = (filas ?? []).find((f) => f.status === 'rejected')

  // El motivo interno NUNCA sale de aquí: se manda el mensaje del catálogo.
  // Los dos motivos de sospecha comparten mensaje a propósito, y uno
  // específico le enseñaría a quien suplanta qué corregir.
  let motivo: { mensaje: string; permiteReintento: boolean } | null = null
  if (rechazada?.rejection_reason) {
    const { data } = await createAdminClient()
      .from('verification_rejection_reasons')
      .select('message, allows_retry')
      .eq('code', rechazada.rejection_reason)
      .maybeSingle()
    if (data) motivo = { mensaje: data.message, permiteReintento: data.allows_retry }
  }

  // "En revisión" exige LAS DOS. Con `||` bastaba la cédula: quien subía
  // una y cerraba el navegador volvía a una pantalla que decía "lo está
  // revisando una persona" sin haber mandado la selfie, y ahí se quedaba
  // esperando un correo que no iba a llegar nunca.
  const entregada = (v?: { status: string }) =>
    v?.status === 'pending' || v?.status === 'approved'

  const estado =
    doc?.status === 'approved' && selfie?.status === 'approved'
      ? 'aprobada'
      : rechazada
        ? 'rechazada'
        : entregada(doc) && entregada(selfie)
          ? 'revision'
          : 'sin-empezar'

  // Cuándo la revisó una persona, y cuándo se borran las fotos. La pantalla
  // de «ya verificada» promete una fecha concreta de borrado, así que sale
  // de la MISMA regla que purga de verdad —reviewed_at + 90 días, la de
  // purgar_documentos_verificacion()— y no de una cuenta escrita aparte.
  // Dos cuentas del mismo plazo acaban diciendo días distintos.
  const revisadaEl =
    estado === 'aprobada'
      ? [doc?.reviewed_at, selfie?.reviewed_at].filter(Boolean).sort().pop() ?? null
      : null

  // Si ya no hay fichero, es que la purga pasó: entonces no se anuncia una
  // fecha futura, se dice que ya están borradas.
  const yaBorradas = estado === 'aprobada' && !doc?.storage_path && !selfie?.storage_path

  const seBorraEl =
    revisadaEl && !yaBorradas
      ? new Date(new Date(revisadaEl).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : null

  return NextResponse.json({
    estado,
    cedulaLista: Boolean(doc && doc.status !== 'rejected'),
    selfieLista: Boolean(selfie && selfie.status !== 'rejected'),
    motivo,
    // Escritas aquí, como en el resto: la pantalla no arma fechas a mano.
    revisadaEl: revisadaEl ? diaCompleto(revisadaEl) : null,
    seBorraEl: seBorraEl ? diaCompleto(seBorraEl) : null,
    yaBorradas,
  })
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const user = await deQuien((form?.get('token') as string) || null)
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const tipo = String(form?.get('tipo') ?? '')
  const archivo = form?.get('archivo')

  if (!(tipo in TIPOS) || !(archivo instanceof File)) {
    return NextResponse.json({ error: 'Falta la foto.' }, { status: 400 })
  }
  if (archivo.size > MAXIMO) {
    return NextResponse.json(
      { error: 'Esa foto pesa demasiado. Haz otra con menos zoom, o elígela de la galería.' },
      { status: 400 },
    )
  }
  if (!MIMES.includes(archivo.type)) {
    return NextResponse.json({ error: 'Ese archivo no es una foto.' }, { status: 400 })
  }

  const kind = TIPOS[tipo as keyof typeof TIPOS]
  const admin = createAdminClient()

  // Un rechazo sin reintento es definitivo. Aceptar otra foto aquí dejaría
  // que quien suplanta lo intente con otro documento hasta que cuele.
  const { data: previa } = await admin
    .from('verifications')
    .select('id, status, rejection_reason')
    .eq('profile_id', user)
    .eq('kind', kind)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (previa?.status === 'approved') {
    return NextResponse.json({ error: 'Esa parte ya está verificada.' }, { status: 409 })
  }
  if (previa?.status === 'rejected' && previa.rejection_reason) {
    const { data: motivo } = await admin
      .from('verification_rejection_reasons')
      .select('allows_retry, message')
      .eq('code', previa.rejection_reason)
      .maybeSingle()
    if (motivo && !motivo.allows_retry) {
      // El mismo mensaje del catálogo, no uno escrito aquí: tenía otro
      // canal —WhatsApp en vez del correo— para exactamente la misma
      // situación, y quien lo leyera dos veces vería dos respuestas.
      return NextResponse.json({ error: motivo.message }, { status: 409 })
    }
  }

  // La ruta la decide el servidor, con el id de la persona por delante.
  const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg'
  const ruta = `${user}/${kind}-${Date.now()}.${ext}`

  const { error: errorSubida } = await admin.storage
    .from('verificaciones')
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false })

  if (errorSubida) {
    console.error('[verificacion] no se subió', errorSubida)
    return NextResponse.json({ error: 'No pudimos guardar la foto.' }, { status: 500 })
  }

  // El intento anterior deja de estar vivo antes de insertar el nuevo: el
  // índice único solo admite una pendiente o aprobada por tipo.
  // Si estaba aprobada ya se devolvio 409 arriba, asi que lo que llega
  // aqui es un rechazo con reintento o un pendiente que se sustituye.
  if (previa) {
    await admin.from('verifications').update({ status: 'expired' }).eq('id', previa.id)
  }

  const { error } = await admin.from('verifications').insert({
    profile_id: user,
    kind,
    status: 'pending',
    storage_path: ruta,
  })

  if (error) {
    // La foto ya está subida; sin fila nadie la revisaría nunca.
    await admin.storage.from('verificaciones').remove([ruta])
    console.error('[verificacion] no se registró', error)
    return NextResponse.json({ error: 'No pudimos registrar tu envío.' }, { status: 500 })
  }

  // Con las dos dentro, la llave del QR sobra. Lo que sobra se cierra.
  const { data: entregadas } = await admin
    .from('verifications')
    .select('kind')
    .eq('profile_id', user)
    .in('status', ['pending', 'approved'])

  const tipos = new Set((entregadas ?? []).map((v) => v.kind))
  if (tipos.has('id_document') && tipos.has('selfie')) await cerrarTraspasos(user)

  return NextResponse.json({ estado: 'recibida' })
}

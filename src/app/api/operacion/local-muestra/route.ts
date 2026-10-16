import { NextResponse } from 'next/server'

import { componer } from '@/lib/remitente'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'
import { enlaceDeMapa } from '@/lib/mapa'
import { precioTexto, vozDe } from '@/lib/reglas'
import { HORA_DE, horaBonita, partesHora } from '@/lib/formatos'
import { urlDeFotoDeLocal } from '@/lib/foto-local'

/**
 * El correo de la mesa, con los datos de UN local, para enseñárselo a él.
 *
 * Michael: «quiero poder probar cómo se ven los locales revelados en la app y
 * en el correo para mostrarle a los locales cómo se ven».
 *
 * La app y Mi mesa se pueden enseñar de verdad —`banco-pruebas.mjs revelada`
 * monta una cuenta con mesa revelada y se entra con ella— pero el correo no:
 * un correo solo existe cuando se manda, y mandárselo a alguien para
 * enseñárselo a otro es ensuciar la cola y el historial de esa persona.
 *
 * Así que se pinta. Con la MISMA plantilla y el MISMO `componer()` que usa el
 * envío de verdad: si fueran dos caminos, el día que alguien toque la
 * plantilla el local vería una cosa y los comensales otra, y lo que se le
 * enseña a un restaurante es una promesa de cómo lo vamos a presentar.
 *
 * Lo único inventado es la mesa: un número, una hora y cinco comensales. El
 * sitio —nombre, dirección, zona, mapa— sale de su ficha tal cual.
 */

/** Cinco acompañantes de ejemplo. Nombres de pila y sectores del catálogo. */
const COMENSALES = [
  { nombre: 'Daniela', sector: 'Diseño' },
  { nombre: 'Andrés', sector: 'Construcción' },
  { nombre: 'Gabriela', sector: 'Salud' },
  { nombre: 'José', sector: 'Finanzas' },
  { nombre: 'Andreína', sector: 'Educación' },
]

export async function GET(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const params = new URL(request.url).searchParams
  const id = params.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el local.' }, { status: 400 })

  /**
   * De qué plan es la muestra. Sin decir nada, una cena.
   *
   * Una cafetería no quiere ver el correo de una cena: quiere ver el suyo, a
   * su hora y con sus palabras —«CON QUIÉN VAS» a las once de la mañana, no
   * «CON QUIÉN CENAS»—. Y el día cambia con él: un brunch se enseña en
   * domingo y una cena en sábado, porque enseñarle a nadie un brunch del
   * martes es enseñarle algo que no vamos a hacer.
   */
  const formato = params.get('formato') ?? 'dinner'
  if (!HORA_DE[formato]) {
    return NextResponse.json(
      { error: `No conozco el formato «${formato}».`, formatos: Object.keys(HORA_DE) },
      { status: 400 },
    )
  }
  const voz = vozDe(formato)

  const admin = createAdminClient()

  const { data: local } = await admin
    .from('restaurants')
    .select('id, name, address, maps_url, zone_slug, facade_photo_path, zones(name)')
    .eq('id', id)
    .maybeSingle()

  if (!local) return NextResponse.json({ error: 'Ese local no existe.' }, { status: 404 })

  /**
   * El próximo fin de semana: sábado si es de noche, domingo si es de mañana.
   *
   * La fecha se inventa a propósito y no se coge una real: enseñarle a un
   * restaurante el correo de una fecha concreta le dice cuánta gente va ese
   * día, y eso no es suyo.
   */
  const hora = HORA_DE[formato]
  const deManana = partesHora(hora)[0] < 12
  const diaQueToca = deManana ? 0 : 6
  const dia = new Date()
  dia.setUTCDate(dia.getUTCDate() + ((diaQueToca - dia.getUTCDay() + 7) % 7 || 7))

  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]

  const pintado = await componer('mesa_asignada', {
    // --- lo que es de verdad suyo ---------------------------------------
    sitio: local.name,
    direccion: local.address ?? '',
    zona: (local.zones as unknown as { name: string } | null)?.name ?? local.zone_slug ?? '',
    mapa: enlaceDeMapa(local) ?? '',
    // Y su propia foto de la entrada, que es media razón para enseñarle esto:
    // lo que ve el comensal al llegar es su fachada.
    fotoEntrada: urlDeFotoDeLocal(local.id, local.facade_photo_path) ?? '',

    // --- y la mesa de ejemplo -------------------------------------------
    numero: '03',
    mesaUnica: false,
    comoLlegar: `${voz.el} ${voz.unidad} de Aro, ${voz.el} 03`,
    gente: COMENSALES.map((c) => ({ ...c, inicial: c.nombre.charAt(0) })),
    trato: 'Daniel',
    ciudad: 'Caracas',
    cuando: `${DIAS[dia.getUTCDay()]} ${dia.getUTCDate()} de ${MESES[dia.getUTCMonth()]}`,
    hora: horaBonita(hora),
    // Todo el vocabulario de la voz, como en el correo de verdad: una cena
    // dice «CON QUIÉN CENAS» y un brunch «CON QUIÉN VAS», y ninguna de las
    // dos frases se escribe aquí.
    unidad: voz.unidad,
    Unidad: voz.Unidad,
    art: voz.el,
    TU: voz.TU,
    conQuien: voz.conQuien,
    alGrupo: voz.unidad === 'mesa' ? ' la mesa' : 'l grupo',
    // El precio, porque el correo lo nombra desde el 16-10 en la nota del
    // final. Es el del club y no el de una fecha: esta muestra no cuelga de
    // ninguna. Sin esto, el local vería «Los  de tu plaza cubren…».
    precio: precioTexto(),
    // Sin enlace de ajustes: esto no se manda a nadie, así que no hay baja
    // que ofrecer. Vacío deja el pie sin un enlace muerto.
    enlaceAjustes: '',
  })

  if (!pintado) {
    return NextResponse.json({ error: 'No pudimos pintar el correo.' }, { status: 500 })
  }

  /**
   * Como HTML y no como JSON: se abre en una pestaña y se ve el correo. De
   * ahí sale la captura, o «guardar como PDF» del propio navegador, que es
   * lo que se le enseña al restaurante.
   *
   * `noindex` por si acaso: esto lleva el nombre y la dirección de un local
   * en la URL de nuestro dominio y no tiene por qué acabar en un buscador.
   */
  return new NextResponse(pintado.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
    },
  })
}

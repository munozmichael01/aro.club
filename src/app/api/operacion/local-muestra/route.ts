import { NextResponse } from 'next/server'

import { componer } from '@/lib/remitente'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'
import { enlaceDeMapa } from '@/lib/mapa'
import { vozDe } from '@/lib/reglas'

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

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el local.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: local } = await admin
    .from('restaurants')
    .select('id, name, address, maps_url, zone_slug, zones(name)')
    .eq('id', id)
    .maybeSingle()

  if (!local) return NextResponse.json({ error: 'Ese local no existe.' }, { status: 404 })

  /**
   * Un sábado a las 7:30, que es la cena normal.
   *
   * La fecha se inventa a propósito y no se coge una real: enseñarle a un
   * restaurante el correo de una cena concreta le dice cuánta gente va ese
   * día, y eso no es suyo.
   */
  const sabado = new Date()
  sabado.setUTCDate(sabado.getUTCDate() + ((6 - sabado.getUTCDay() + 7) % 7 || 7))

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

    // --- y la mesa de ejemplo -------------------------------------------
    numero: '03',
    mesaUnica: false,
    comoLlegar: 'la mesa de Aro, la 03',
    gente: COMENSALES.map((c) => ({ ...c, inicial: c.nombre.charAt(0) })),
    trato: 'Daniel',
    ciudad: 'Caracas',
    cuando: `${DIAS[sabado.getUTCDay()]} ${sabado.getUTCDate()} de ${MESES[sabado.getUTCMonth()]}`,
    hora: '7:30 p.m.',
    unidad: 'mesa',
    Unidad: 'Mesa',
    art: 'la',
    TU: 'TU MESA',
    // De la voz, como el correo de verdad: la muestra es de una cena, así
    // que dice «CON QUIÉN CENAS», pero la frase no se escribe aquí.
    conQuien: vozDe('dinner').conQuien,
    alGrupo: ' la mesa',
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

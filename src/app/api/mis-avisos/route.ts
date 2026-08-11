import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Los avisos (entrega 10 §4.2).
 *
 * Cinco claves, y **dos no se pueden apagar**: sin `mesa_jueves` y sin
 * `dia_cena` la persona no sabe dónde es la cena. Eso no es una preferencia
 * —es la única forma de que el producto funcione— y por eso el servidor las
 * ignora si llegan en false en vez de fiarse de que la pantalla no lo
 * ofrezca.
 *
 * **WhatsApp es un permiso, no una preferencia.** Se guarda con la fecha en
 * que lo dio: un consentimiento sin fecha no defiende nada. Y al quitarlo,
 * la fecha se borra —no queda constancia de un permiso que ya no existe—.
 */

/** Las que no se apagan. La lista corta y explícita, a propósito. */
const FIJAS = ['mesa_jueves', 'dia_cena'] as const

const guardar = z.object({
  mesa_jueves: z.boolean().optional(),
  dia_cena: z.boolean().optional(),
  pago_ok: z.boolean().optional(),
  apertura_zona: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
})

const POR_DEFECTO = {
  mesa_jueves: true,
  dia_cena: true,
  pago_ok: true,
  apertura_zona: true,
  whatsapp: false,
}

/** Lo que se le cuenta de cada uno, para que sepa qué está apagando. */
const QUE_ES: Record<string, { titulo: string; cuerpo: string }> = {
  mesa_jueves: {
    titulo: 'Tu mesa del jueves',
    cuerpo: 'El sitio, la hora y con quién cenas, en cuanto se abre a las doce.',
  },
  dia_cena: {
    titulo: 'El día de la cena',
    cuerpo: 'Un recordatorio con la dirección unas horas antes.',
  },
  pago_ok: {
    titulo: 'Tu pago',
    cuerpo: 'Cuando lo confirmamos, o si no cuadra y hay que corregir algo.',
  },
  apertura_zona: {
    titulo: 'Fechas nuevas en tus zonas',
    cuerpo: 'Cuando abrimos una fecha donde tú puedes llegar.',
  },
  whatsapp: {
    titulo: 'Avisarte por WhatsApp',
    cuerpo: 'Además del correo. Solo lo de arriba, nunca nada más.',
  },
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('notificaciones, whatsapp_opt_in_at')
    .eq('id', user.id)
    .maybeSingle()

  const actuales = { ...POR_DEFECTO, ...((data?.notificaciones ?? {}) as Record<string, boolean>) }

  return NextResponse.json({
    avisos: Object.keys(POR_DEFECTO).map((clave) => ({
      clave,
      encendido: !!actuales[clave as keyof typeof POR_DEFECTO],
      // Que no se pueda apagar se dice; no se esconde el interruptor sin
      // explicar por qué.
      fijo: (FIJAS as readonly string[]).includes(clave),
      titulo: QUE_ES[clave].titulo,
      cuerpo: QUE_ES[clave].cuerpo,
    })),
    whatsappDesde: data?.whatsapp_opt_in_at ?? null,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = guardar.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('profiles')
    .select('notificaciones, whatsapp_opt_in_at')
    .eq('id', user.id)
    .maybeSingle()

  const antes = { ...POR_DEFECTO, ...((perfil?.notificaciones ?? {}) as Record<string, boolean>) }
  const despues = { ...antes, ...parsed.data }

  // Las fijas vuelven a true pase lo que pase. Si solo lo impidiera la
  // pantalla, el interruptor sería decorativo.
  for (const f of FIJAS) despues[f] = true

  // La fecha del permiso: se pone al darlo y se borra al quitarlo. Guardar
  // la fecha de un permiso retirado sería decir que sigue vigente.
  const daWhatsapp = despues.whatsapp && !antes.whatsapp
  const quitaWhatsapp = !despues.whatsapp && antes.whatsapp

  const { error } = await admin
    .from('profiles')
    .update({
      notificaciones: despues,
      ...(daWhatsapp ? { whatsapp_opt_in_at: new Date().toISOString() } : {}),
      ...(quitaWhatsapp ? { whatsapp_opt_in_at: null } : {}),
    } as never)
    .eq('id', user.id)

  if (error) {
    console.error('[mis-avisos] guardar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'guardado', avisos: despues })
}

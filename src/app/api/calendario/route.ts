import { NextResponse } from 'next/server'

import { reservaDentro } from '@/lib/estas-dentro'
import { DENTRO } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «Añadir al calendario», en un fichero .ics.
 *
 * La app abre Google Calendar con el evento escrito, y la web también fuera
 * de Apple. Pero en un iPhone el enlace de Google abre una web que pide
 * entrar con Google: quien usa el calendario del teléfono se queda a medias.
 * Un .ics, en cambio, Safari lo abre con «Añadir» del calendario de siempre.
 *
 * El evento es el del HANDOFF de la entrega: «Aro Club · Cena», el día y la
 * hora, la zona como lugar hasta la revelación, y «El sitio se abre…». Dura
 * dos horas, como el de la app.
 */
export const dynamic = 'force-dynamic'

const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** RFC 5545: las comas, los puntos y comas y las barras van escapados. */
const escapar = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const evento = new URL(request.url).searchParams.get('evento')
  const d = await reservaDentro(createAdminClient(), user.id, evento)
  if (!d) return NextResponse.json({ error: 'No tienes esa reserva.' }, { status: 404 })

  const inicio = Date.parse(d.plan.empiezaEn)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aro Club//Estas dentro//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${d.reservaId}@aro.club`,
    `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(inicio)}`,
    `DTEND:${utc(inicio + 2 * 3600_000)}`,
    `SUMMARY:${escapar(DENTRO.evento.titulo(DENTRO.planDe(d.plan.formato)))}`,
    `DESCRIPTION:${escapar(DENTRO.evento.descripcion(DENTRO.cuandoSeSabe(d.plan.revelaEn, d.plan.zonaHoraria)))}`,
    `LOCATION:${escapar(DENTRO.zonasEnTexto(d.plan.zonas))}`,
    'URL:https://aro.club/mesa',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="aro-club.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
}

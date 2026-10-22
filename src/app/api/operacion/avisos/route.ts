import { NextResponse } from 'next/server'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La cola de avisos, para mirarla.
 *
 * SOLO LEE. No reenvía, no reintenta, no borra. Lo que hace falta primero es
 * poder VER qué se mandó, a quién y qué contestó el proveedor, porque hasta
 * hoy eso solo se sabía entrando a la base.
 *
 * Y se nota lo que cuesta no tenerlo: la push de la encuesta del día después
 * llevaba semanas sin salir y la cola lo decía en una columna
 * —`push_motivo = 'sin_copy'` en las seis filas de una misma mesa— que nadie
 * miraba, porque no había dónde. El correo salía, así que por fuera todo
 * parecía bien.
 *
 * Tres cosas que esta pantalla tiene que distinguir y que se confunden:
 *
 *  - `sent_at` NO significa entregado. Significa que Resend lo aceptó. Lo que
 *    pasó después se consulta con `provider_id`, que es su identificador.
 *  - `push_at` lo mismo: Expo la aceptó. El veredicto está en `push_recibo`,
 *    que llega minutos después y puede decir que el teléfono ya no existe.
 *  - Una fila sin `sent_at` puede estar esperando su hora o haber fallado. Lo
 *    separa `send_at`: en el futuro espera, en el pasado es que algo pasó.
 */

/** Cuántas caben de una vez. Suficiente para una fecha entera. */
const TOPE = 300

export async function GET(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const url = new URL(request.url)
  const persona = (url.searchParams.get('persona') ?? '').trim()
  const eventoId = (url.searchParams.get('evento') ?? '').trim()
  const tipo = (url.searchParams.get('tipo') ?? '').trim()

  const admin = createAdminClient()

  let consulta = admin
    .from('scheduled_emails')
    .select(
      'id, profile_id, kind, event_id, send_at, sent_at, email, estado, motivo, provider_id, push_at, push_motivo, push_recibo',
    )
    .order('send_at', { ascending: false })
    .limit(TOPE)

  if (eventoId) consulta = consulta.eq('event_id', eventoId)
  if (tipo) consulta = consulta.eq('kind', tipo as never)

  // Por persona se busca por CORREO y no por id: quien mira el panel tiene el
  // correo de alguien, no su uuid. Se cruza contra las dos columnas, porque
  // los avisos a quien todavía no tiene cuenta viajan en `email` y los de
  // quien ya la tiene cuelgan de `profile_id`.
  let idsDeEsaPersona: string[] = []
  if (persona) {
    const { data: perfiles } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', `%${persona}%`)
      .limit(20)
    idsDeEsaPersona = (perfiles ?? []).map((p) => p.id)

    if (idsDeEsaPersona.length) {
      consulta = consulta.or(
        `email.ilike.%${persona}%,profile_id.in.(${idsDeEsaPersona.join(',')})`,
      )
    } else {
      consulta = consulta.ilike('email', `%${persona}%`)
    }
  }

  const { data: filas, error } = await consulta

  if (error) {
    console.error('[avisos] no se pudo leer la cola', error)
    return NextResponse.json({ filas: [], error: 'No pudimos leer la cola.' }, { status: 500 })
  }

  // Los nombres, de una vez. Una consulta por fila serían trescientas.
  const ids = [...new Set((filas ?? []).map((f) => f.profile_id).filter(Boolean))] as string[]
  const { data: gente } = ids.length
    ? await admin.from('profiles').select('id, display_name, full_name, email').in('id', ids)
    : { data: [] }

  const quien = new Map(
    (gente ?? []).map((p) => [p.id, { nombre: p.display_name || p.full_name || p.email, correo: p.email }]),
  )

  // Las fechas, para poder decir «la cena del viernes» y no un uuid.
  const idsFecha = [...new Set((filas ?? []).map((f) => f.event_id).filter(Boolean))] as string[]
  const { data: fechas } = idsFecha.length
    ? await admin.from('events').select('id, starts_at, format').in('id', idsFecha)
    : { data: [] }
  const fechaDe = new Map((fechas ?? []).map((e) => [e.id, e.starts_at]))

  const ahora = Date.now()

  /**
   * LAS BAJAS DE CORREO, contadas.
   *
   * Michael lo pidió el 20-10 —«deberíamos registrar esto en algún lugar de
   * operaciones»— y el 21 otra vez, después de un envío a doscientas
   * personas: «sigamos de cerca las bajas». Hasta ahora solo se veían
   * persona a persona, abriendo su ficha, que es justo lo que no sirve para
   * vigilar una tendencia.
   *
   * Va aquí y no en una pantalla nueva porque esta es la de los correos: el
   * sitio donde se mira qué salió es el sitio donde hay que ver qué costó.
   *
   * Las deshechas no cuentan: quien se dio de baja y volvió no está de baja.
   */
  const { data: todasLasBajas } = await admin
    .from('bajas_correo')
    .select('correo, baja_at, origen, deshecha_at')
    .is('deshecha_at', null)
    .order('baja_at', { ascending: false })

  const bajas = todasLasBajas ?? []
  const desde = (dias: number) => new Date(ahora - dias * 86400_000).toISOString()
  const enUltimos = (dias: number) => bajas.filter((b) => b.baja_at >= desde(dias)).length

  /**
   * Y cuántas desde el último envío de bulto.
   *
   * Es la cifra que de verdad se mira después de mandar a doscientas
   * personas, y restar fechas a mano es justo lo que nadie hace a las once
   * de la noche.
   */
  const { data: ultimoBulto } = await admin
    .from('scheduled_emails')
    .select('kind, sent_at')
    .in('kind', ['empujon', 'abrimos_zona', 'resumen_semanal', 'cena_en_ingles', 'equilibrar_mesas'])
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)

  const ultimo = ultimoBulto?.[0] ?? null

  return NextResponse.json({
    bajas: {
      total: bajas.length,
      hoy: enUltimos(1),
      semana: enUltimos(7),
      desdeElUltimoEnvio: ultimo?.sent_at
        ? bajas.filter((b) => b.baja_at >= ultimo.sent_at!).length
        : null,
      ultimoEnvio: ultimo ? { tipo: ultimo.kind, cuando: ultimo.sent_at } : null,
      // Las últimas cinco, con su origen: el pie del correo y el clic de
      // Gmail no se leen igual. Una racha por un clic puede ser un cliente
      // de correo marcando promociones, no la gente huyendo.
      ultimas: bajas.slice(0, 5).map((b) => ({
        correo: b.correo,
        cuando: b.baja_at,
        origen: b.origen,
      })),
    },
    filas: (filas ?? []).map((f) => {
      const p = f.profile_id ? quien.get(f.profile_id) : null
      const pendiente = !f.sent_at && new Date(f.send_at).getTime() > ahora
      return {
        id: f.id,
        tipo: f.kind,
        quien: p?.nombre ?? f.email ?? 'sin destinatario',
        correo: p?.correo ?? f.email ?? null,
        cuandoTocaba: f.send_at,
        fecha: f.event_id ? (fechaDe.get(f.event_id) ?? null) : null,
        eventoId: f.event_id,
        // El correo: enviado, esperando, o lo que falló.
        correoEstado: f.sent_at ? 'enviado' : pendiente ? 'esperando' : (f.estado ?? 'sin salir'),
        correoCuando: f.sent_at,
        correoMotivo: f.motivo,
        proveedorId: f.provider_id,
        // La push, por separado: una fila puede tener el correo enviado y la
        // push sin salir, que es exactamente lo que pasaba con la encuesta.
        pushEstado: f.push_at ? 'enviada' : (f.push_motivo ?? 'sin push'),
        pushCuando: f.push_at,
        pushRecibo: f.push_recibo ?? null,
      }
    }),
    tope: TOPE,
  })
}

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La cola de correos, en un solo sitio.
 *
 * Estaba repetida: `/api/operacion/pagos` tenía su propia función `encolar`,
 * `/api/cancelar` y `/api/operacion/publicar` hacían el insert a mano, y tres
 * de las ocho plantillas de Design no las encolaba nadie —la de verificación
 * entre ellas, que es la que le dice a alguien que ya puede reservar—.
 *
 * **Hoy no hay remitente: esto no manda nada.** Es el registro de lo que
 * habría que mandar, con su destinatario y su momento. Cuando el remitente
 * exista, lee esta tabla y todo el recorrido ya está anotado.
 *
 * Encolar NUNCA tumba la operación que lo dispara: si la anotación falla se
 * escribe en el log y se sigue. Que alguien no reciba un correo es malo; que
 * no se le apruebe la identidad por no poder anotar el correo, peor.
 */

/**
 * Los correos que la baja NO apaga.
 *
 * Son los que contestan a algo que la persona pidió, y que sin ellos lo que
 * pidió no funciona. El de la mesa **es** cómo sabe dónde es la cena; el del
 * pago es el comprobante de que apartamos su puesto; el de la clave lo pidió
 * ella hace un minuto. Apagarlos no sería respetar su decisión, sería
 * romperle la reserva.
 *
 * Lo que sí se apaga: la bienvenida, los empujones, «abrimos tu zona» y todo
 * lo que sale sin que nadie lo haya pedido. Eso es lo que la gente quiere
 * decir cuando se da de baja.
 *
 * La pantalla de baja dice esta misma línea, para que nadie se lleve la
 * sorpresa de recibir un correo después de darse de baja.
 */
const IMPRESCINDIBLES: ReadonlySet<string> = new Set([
  'mesa_asignada',
  'recordatorio',
  'cancelacion',
  'fecha_cancelada',
  'pago_en_revision',
  'pago_confirmado',
  'pago_no_cuadra',
  'restablecer_clave',
])

export type Correo =
  | 'bienvenida'
  | 'verificacion'
  | 'mesa_asignada'
  | 'recordatorio'
  | 'cancelacion'
  | 'pago_en_revision'
  | 'pago_confirmado'
  | 'pago_no_cuadra'
  // Entrega 13: el rechazo deja de ir dentro de `verificacion` con un
  // resultado en el payload. Son dos mensajes distintos —«ya puedes
  // reservar» y «repite esta foto»— y con un solo tipo el remitente tendria
  // que mirar dentro del payload para elegir plantilla.
  | 'verificacion_rechazada'
  | 'fecha_cancelada'
  // Entrega 16: quien pagó y no se sentó. `publicar` encolaba solo los
  // `mesa_asignada` de los sentados y no había ninguna rama para el resto:
  // el panel prometía dos veces «se les avisa hoy» y no salía nada. Alguien
  // pagó su puesto y se quedó fuera sin enterarse.
  | 'sin_mesa'
  // Entrega 17: la mesa cambió DESPUÉS de habérsela contado. No vale reenviar
  // `mesa_asignada`: esa dice «TU MESA · 04» como novedad, y mandarla dos
  // veces con contenido distinto y sin explicar qué cambió deja a quien la
  // lea rápido con la mesa equivocada y sin saber cuál de los dos vale.
  | 'mesa_cambiada'
  | 'restablecer_clave'
  | 'abrimos_zona'
  // Entrega 14: el hueco de en medio. Alguien termina el perfil, sube la
  // cédula y la selfie —todo lo que le pedimos— y no recibía nada hasta que
  // una persona aprobara la identidad. La bienvenida es de quien se queda a
  // medias y la de verificación llega al aprobar: entre las dos había
  // silencio justo después del único paso incómodo del embudo.
  | 'cuenta_lista'
  // Entrega 18: el empujon deja de viajar como 'bienvenida'. Iba con el
  // mismo tipo, y el indice unico de la bienvenida es por correo y para
  // siempre: como el alta encola la suya en el segundo cero, el empujon de
  // una hora despues chocaba siempre y `encolar` daba el 23505 por bueno.
  // Misma plantilla —01-bienvenida ya pinta los dos estados de `falta`—,
  // tipo propio y su propio indice de uno por persona y estado.
  | 'empujon'
  // Entrega 16: la encuesta del día después. La pantalla existía, guardaba
  // bien y tenía cero respuestas, porque no había ningún correo que llevara a
  // ella. Sale la mañana siguiente. No es imprescindible: quien se dio de
  // baja no lo recibe, y por eso su plantilla lleva el enlace de ajustes.
  | 'encuesta_despues'

type AQuien = { perfil: string } | { correo: string }

/**
 * Qué pasó al encolar. `repetido` no es un fallo —es el índice de «uno por
 * persona» haciendo su trabajo— pero tampoco es un envío, y quien cuenta
 * necesita saber cuál de los dos fue.
 */
export type Resultado = 'encolado' | 'repetido' | 'fallo'

export async function encolar(
  aQuien: AQuien,
  tipo: Correo,
  detalle: Record<string, unknown> = {},
  opciones: { eventoId?: string | null; cuando?: Date } = {},
): Promise<Resultado> {
  try {
    const { error } = await createAdminClient()
      .from('scheduled_emails')
      .insert({
        profile_id: 'perfil' in aQuien ? aQuien.perfil : null,
        email: 'correo' in aQuien ? aQuien.correo.trim().toLowerCase() : null,
        kind: tipo,
        event_id: opciones.eventoId ?? null,
        // Por defecto ahora. El recordatorio del día de la cena es el único
        // que se programa para más tarde.
        send_at: (opciones.cuando ?? new Date()).toISOString(),
        payload: detalle as never,
      } as never)

    // 23505 es un índice de «uno por persona»: el de la bienvenida, el del
    // empujón. Encolar dos veces no es un error, es la respuesta correcta a
    // que alguien vuelva a dejar su dirección o a que el cron vuelva a pasar.
    //
    // Pero no es lo mismo que haberlo encolado, y hasta hoy quien llamaba no
    // podía distinguirlo. El cron del empujón contaba `perfil++` después de
    // cada llamada y habría informado de cinco empujones habiendo encolado
    // cero: el mismo choque que lo tuvo diez días muerto, contado como éxito.
    if (error?.code === '23505') return 'repetido'
    if (error) {
      console.error('[correos] no se encoló', tipo, error)
      return 'fallo'
    }

    // Y sale ya, sin esperar al cron.
    //
    // La cola pasa cada quince minutos, y eso está bien para el recordatorio
    // de la cena —que se programa con horas de antelación— pero no para los
    // que contestan a algo que la persona acaba de hacer. Quien sube su
    // cédula y no recibe nada en quince minutos no piensa «habrá una cola»,
    // piensa que no funcionó. Se comprobó con una cuenta real: el acuse del
    // pago tardó diez minutos en salir.
    //
    // El cron no sobra: sigue siendo la red que recoge lo que falle aquí
    // —un corte de red, un límite de la cuenta— y lo que va programado para
    // más tarde. Esto solo adelanta lo inmediato.
    if (!opciones.cuando || opciones.cuando.getTime() <= Date.now()) {
      await despacharPendientes()
    }
    return 'encolado'
  } catch (e) {
    console.error('[correos] no se encoló', tipo, e)
    return 'fallo'
  }
}

/**
 * Qué le pasó a una fila de la cola.
 *
 * Los dos primeros la cierran —`sent_at`— porque mañana pasaría lo mismo.
 * Los tres últimos la dejan viva: `sin_plantilla` se arregla desplegando y
 * `error_de_envio` se arregla solo, así que cerrarlos sería tirar el correo.
 */
type Final =
  | 'enviado'
  | 'no_se_pudo_armar'
  | 'dado_de_baja'
  | 'sin_plantilla'
  | 'error_de_envio'

const CIERRAN: ReadonlySet<Final> = new Set(['enviado', 'no_se_pudo_armar', 'dado_de_baja'])

/**
 * Anota qué pasó. Antes los tres finales que cierran escribían exactamente
 * la misma marca —`sent_at` y nada más—, así que «cuántos correos han
 * salido» devolvía la suma de los enviados, los imposibles de armar y los de
 * quien se dio de baja, y separarlos exigía buscar un `console.error` en los
 * registros de Vercel.
 */
async function anotarFinal(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  final: Final,
  motivo: string | null = null,
): Promise<void> {
  const campos: Record<string, unknown> = { estado: final, motivo }
  if (CIERRAN.has(final)) campos.sent_at = new Date().toISOString()
  const { error } = await admin.from('scheduled_emails').update(campos as never).eq('id', id)
  if (error) console.error('[correos] no se pudo anotar el final', final, error)
}

/**
 * Manda lo que esté vencido en la cola. Lo usan el cron y `encolar`.
 *
 * Nunca lanza: encolar un correo no puede fallar porque el envío falle. Si
 * algo se tuerce, la fila se queda sin `sent_at` y el cron la recoge en la
 * siguiente vuelta, que es exactamente para lo que está.
 */
export async function despacharPendientes(
  seco = false,
): Promise<{ mandados: number; quedan: number; seco?: { kind: string; asunto: string; huecos: number }[] }> {
  try {
    // Se importan aquí dentro y no arriba porque `correos-datos` necesita el
    // tipo `Correo` de este mismo fichero: en la cabecera sería un ciclo.
    const [{ prepararCorreo }, { componer, enviar }] = await Promise.all([
      import('@/lib/correos-datos'),
      import('@/lib/remitente'),
    ])

    const admin = createAdminClient()
    const { data: pendientes } = await admin
      .from('scheduled_emails')
      .select('id, profile_id, email, kind, event_id, payload')
      .is('sent_at', null)
      .lte('send_at', new Date().toISOString())
      .order('send_at')
      .limit(25)

    let mandados = 0
    // Lo que se ve en el ensayo: qué asunto sale y si quedó algún hueco sin
    // rellenar. Es la comprobación que importa —una plantilla con un {{ }} a
    // medias se manda igual y se lee fatal— y no enseña el contenido de nadie.
    const enSeco: { kind: string; asunto: string; huecos: number }[] = []

    // Quién se dio de baja. Se lee una vez para toda la vuelta, no una por
    // correo: son pocas filas y la cola trae hasta veinticinco.
    //
    // Esto es lo que hace que la baja sea real. Hasta ahora
    // `profiles.notificaciones` se guardaba y NADIE lo leía al enviar: los
    // interruptores de Mi cuenta no apagaban nada. Un enlace de baja que no
    // da de baja no es un detalle feo, es el problema legal.
    const { data: bajas } = await admin
      .from('bajas_correo')
      .select('correo')
      .is('deshecha_at', null)

    const dadosDeBaja = new Set((bajas ?? []).map((b) => b.correo))

    for (const fila of pendientes ?? []) {
      const listo = await prepararCorreo(fila as Parameters<typeof prepararCorreo>[0])

      // No se puede armar y no se va a poder mañana: se cierra para que no se
      // reintente cada cuarto de hora para siempre.
      //
      // En seco NO se cierra. El ensayo existe para ver qué haría el envío, y
      // hasta ahora lo que hacía con un correo que no se puede armar era
      // MATARLO: ensayar la cola la vaciaba de todo lo roto, en silencio y en
      // producción. Con el candado de la revelación eso pasa de raro a
      // probable, porque un correo bloqueado es exactamente un correo que no
      // se puede armar. El ensayo lo cuenta y no lo toca.
      if ('error' in listo) {
        console.error('[correos] no se pudo armar', fila.kind, listo.error)
        if (seco) {
          enSeco.push({ kind: fila.kind, asunto: `— no se pudo armar: ${listo.error}`, huecos: -1 })
          continue
        }
        await anotarFinal(admin, fila.id, 'no_se_pudo_armar', listo.error)
        continue
      }

      // ¿Se dio de baja? Se comprueba con la dirección de verdad —la que
      // devuelve `prepararCorreo`— y no con la de la fila: la fila puede
      // llevar `profile_id` sin correo, y ahí la baja se habría colado.
      if (dadosDeBaja.has(String(listo.a).trim().toLowerCase()) && !IMPRESCINDIBLES.has(fila.kind)) {
        // Se cierra en vez de dejarla pendiente: si no, cada vuelta del cron
        // volvería a mirarla para siempre.
        await anotarFinal(admin, fila.id, 'dado_de_baja')
        continue
      }

      // La columna admite algún `kind` sin plantilla propia —'comprobante'—,
      // así que el tipo de la base es más ancho que el de los correos. Si no
      // hay plantilla, `componer` devuelve null y se anota abajo.
      const pintado = await componer(fila.kind as Correo, listo.datos)
      if (!pintado) {
        // NO se cierra. Un `kind` sin plantilla casi siempre es un despliegue
        // por detrás de la base —el enum ya tiene el tipo, el código todavía
        // no—, y eso se arregla solo al desplegar. Cerrarla quemaría el
        // correo. Lo que sí hace falta es que la fila diga por qué lleva ahí
        // parada, en vez de reintentarse cada cuarto de hora en silencio.
        console.error('[correos] sin plantilla', fila.kind)
        await anotarFinal(admin, fila.id, 'sin_plantilla', `no hay plantilla para ${fila.kind}`)
        continue
      }

      // El ensayo se para AQUI y no antes: asi pasa por el filtro de la baja
      // igual que un envio de verdad. Si se saliera antes, el ensayo diria que
      // manda un correo que en realidad no se manda, y el ensayo es justo lo
      // que se usa para comprobar que esto esta bien.
      if (seco) {
        enSeco.push({
          kind: fila.kind,
          asunto: pintado.asunto,
          huecos: (pintado.html.match(/\{\{/g) ?? []).length,
        })
        mandados++
        continue
      }

      const r = await enviar(listo.a, pintado.asunto, pintado.html)

      // Sin remitente configurado no se toca nada: la cola espera al día que
      // exista y no se pierde ninguno.
      if (r.estado === 'sin-remitente') break

      if (r.estado === 'error') {
        // Este sí se reintenta: un fallo de red se arregla solo.
        console.error('[correos] no salió', fila.kind, r.motivo)
        await anotarFinal(admin, fila.id, 'error_de_envio', r.motivo)
        continue
      }

      await anotarFinal(admin, fila.id, 'enviado')
      if (r.estado === 'enviado') mandados++
    }

    const { count } = await admin
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .is('sent_at', null)
      .lte('send_at', new Date().toISOString())

    return { mandados, quedan: count ?? 0, seco: seco ? enSeco : undefined }
  } catch (e) {
    console.error('[correos] fallo despachando', e)
    return { mandados: 0, quedan: 0 }
  }
}

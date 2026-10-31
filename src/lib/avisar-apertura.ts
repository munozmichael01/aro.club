import 'server-only'

import { quienQuiereSaberDe } from '@/lib/a-quien-avisar'
import { encolar } from '@/lib/correos'
import { enTrozos } from '@/lib/en-trozos'
import { createAdminClient } from '@/lib/supabase/admin'
import { diaDe, mismaTanda, proximaTanda, tandaDeManana } from '@/lib/tandas'
import { zonaDeCiudad } from '@/lib/zona-ciudad'

/**
 * Vivía dentro de `/api/operacion/fechas`, que es quien la llama desde dos
 * sitios: al abrir una fecha y al darle a «avisar» después. Sale de ahí el
 * 31-10 para poder invocarla también desde fuera del panel, sin copiar a
 * quién se escribe ni cuándo sale: esa regla no puede existir dos veces.
 */
/**
 * Avisar de que se abre una fecha, a quien le sirva.
 *
 * Vive aparte porque la usan DOS momentos: al crear la fecha y, si se creó
 * callada, al darle a «avisar» después. Dos copias de esta regla serían dos
 * ideas distintas de a quién se le escribe, y la de abajo es la que importa:
 * a quien tenga alguna de esas zonas Y el aviso encendido. Escribir a quien
 * no puede llegar es ruido; escribir a quien lo apagó es ignorar lo que
 * pidió.
 *
 * No hace falta llevar la cuenta de si ya se avisó: `abrimos_zona` entra en
 * el índice de «uno por persona y fecha», así que mandarlo dos veces no
 * duplica nada — y a quien se haya apuntado al club EN MEDIO sí le llega,
 * que es justo lo que se quiere.
 */
export async function avisarDeLaApertura(
  eventoId: string,
  slugs: string[],
  dia: string,
  /**
   * En seco: cuenta a cuánta gente escribiría y NO escribe.
   *
   * No es solo para probar. Antes de mandar un correo a medio club conviene
   * ver a cuántos va, y el panel no tenía forma de saberlo sin mandarlo. Que
   * además haga imposible probar esto sin escribirle a nadie es la otra
   * mitad: no hay staging, esta base es la de producción y el cron de envío
   * pasa cada quince minutos. Probándolo salió un aviso de verdad.
   */
  seco = false,
): Promise<number> {
  const admin = createAdminClient()

  const { data: candidatos } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'zonas')

  const interesados = (candidatos ?? [])
    .filter((a) => Array.isArray(a.value) && (a.value as string[]).some((z) => slugs.includes(z)))
    .map((a) => a.profile_id)
    .filter((id): id is string => !!id)

  if (!interesados.length) return 0

  // El mismo filtro que `cierra_pronto`: quien dijo que ese plan no le
  // interesa no recibe, y las cuentas de prueba tampoco.
  const { data: evFormato } = await admin
    .from('events')
    .select('id, format, starts_at, booking_closes_at, city_slug, age_band_min, age_band_max, idioma')
    .eq('id', eventoId)
    .maybeSingle()

  const quieren = await quienQuiereSaberDe(interesados, evFormato?.format, evFormato)
  if (!quieren.size) return 0

  /**
   * Por trozos, y levantando el error si lo hay.
   *
   * Esta era la consulta que mató el aviso. Con 756 interesados devolvía un
   * 400 —la lista de ids no cabe en la URL—, `perfiles` quedaba en nulo, el
   * bucle de abajo no daba ni una vuelta y la ruta contestaba «avisados: 0»
   * con un 200. Doce fechas abiertas entre el 18 y el 24 de octubre no se
   * le contaron a nadie y no falló nada.
   */
  const perfiles = await enTrozos<{ id: string; notificaciones: unknown }>(
    [...quieren],
    (t) => admin.from('profiles').select('id, notificaciones').in('id', t).is('deleted_at', null),
    'a quién hay que escribir',
  )

  /**
   * UNO POR PERSONA Y DÍA, y no en el momento de abrir: en la tanda.
   *
   * El aviso salía en el mismo minuto en que se abría la fecha. El 10-10 se
   * abrieron dos y salieron sesenta correos para treinta personas; una
   * recibió ocho en total. No escala: aceptan Chacao 398 personas, Altamira
   * 352 y Los Palos Grandes 350 —son casi las mismas—, así que dos fechas en
   * zonas distintas son ochocientos correos a cuatrocientas personas y el
   * segundo no dice nada que el primero no dijera.
   *
   * La regla, de Michael (15-10): un aviso de apertura al día por persona,
   * acumulando los que hagan falta. Las dos tandas y su margen viven en
   * `tandas.ts`; aquí solo se decide EN CUÁL cae cada persona:
   *
   *   · la próxima tanda, si ese día todavía no le toca ningún aviso;
   *   · la primera de mañana, si ya tiene uno ese día;
   *   · AHORA, si la tanda cayera después de que la fecha cierre: un aviso
   *     que llega con la reserva cerrada no es un aviso, es un reproche.
   *
   * Lo que recuerda entre una fecha y otra son las propias filas de la cola,
   * no nada en memoria: la apertura siguiente —otra llamada, otro proceso—
   * las ve aquí.
   */
  const zona = await zonaDeCiudad(evFormato?.city_slug)
  const tanda = proximaTanda(zona)
  const cierra = evFormato?.booking_closes_at ? Date.parse(evFormato.booking_closes_at) : NaN
  const tardeParaLaTanda = Number.isFinite(cierra) && tanda.getTime() >= cierra

  const diaDeLaTanda = diaDe(tanda, zona)
  const desde = new Date(tanda.getTime() - 36 * 3600_000).toISOString()

  const yaTienen = await enTrozos<{ profile_id: string | null; send_at: string }>(
    [...quieren],
    (t) => admin.from('scheduled_emails').select('profile_id, send_at')
      .in('kind', ['abrimos_zona', 'avisos_del_dia'])
      .gte('send_at', desde)
      .in('profile_id', t),
    'quién tiene ya un aviso ese día',
  )

  /**
   * Los que ya tienen un aviso ESE día en OTRA tanda.
   *
   * En la misma no estorba: los dos salen en el mismo sobre, que es
   * justamente lo que se quiere. Contarlos como ocupados era empujar a
   * mañana a quien iba a recibir las dos fechas juntas hoy —49 personas la
   * primera vez que se usó— y convertir un correo con dos planes en dos
   * correos de uno.
   */
  const ocupados = new Set(
    yaTienen
      .filter((r) => {
        const suya = new Date(r.send_at)
        return diaDe(suya, zona) === diaDeLaTanda && !mismaTanda(suya, tanda)
      })
      .map((r) => r.profile_id),
  )

  let avisados = 0
  let callados = 0
  for (const p of perfiles) {
    // Encendido por defecto: solo se salta a quien lo apagó a propósito.
    const avisos = (p.notificaciones ?? {}) as Record<string, boolean>
    if (avisos.apertura_zona === false) continue

    const cuando = tardeParaLaTanda
      ? undefined
      : ocupados.has(p.id)
        ? tandaDeManana(tanda, zona)
        : tanda

    if (cuando && Number.isFinite(cierra) && cuando.getTime() >= cierra) {
      // Ni la de mañana llega: que salga ahora o no saldrá.
      callados++
    }

    if (seco) {
      avisados++
      continue
    }

    const r = await encolar({ perfil: p.id }, 'abrimos_zona', { zonas: slugs, dia }, { eventoId, cuando })
    if (r === 'encolado') avisados++
  }

  if (callados) {
    console.warn(`[fechas] ${callados} avisos salen al momento: su tanda caía después del cierre`)
  }

  return avisados
}

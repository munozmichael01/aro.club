import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUltimo } from '../util/useUltimo'
import { useFocusEffect } from 'expo-router'

import { Aviso, Boton, Ficha, IconoCheck, Opcion, Texto, color, cremaAlfa, fuente, medida, radio, tinta, verdeAlfa } from '../diseno'
import { Cabecera } from '../cuenta/Cabecera'
import { FORMATOS } from '../texto/cuenta'
import * as F from '../texto/fechas'
import * as T from '../texto/mesa'
import * as M from './maquina'
import * as J from '../juego/maquina'
import { MesaCena } from './MesaCena'
import * as RM from '../reembolso/maquina'
import * as TR from '../texto/reembolso'
import { AvisoAjustes, LineaGrabacion, PreguntaGrabacion, useGrabacion } from './Avisos'
import { reglas } from '../reglas'
import * as CM from '../cambiar/maquina'
import * as TC from '../texto/cambiar'
import type { crearServicioMesa } from './servicio'

type Servicio = ReturnType<typeof crearServicioMesa>

/**
 * Mi mesa (`/mesa`), calcada de `Mi mesa.dc.html`: vacía (tres casos),
 * cerrada con su cuenta atrás, abierta (número, sitio, cómo llegar, «Voy
 * tarde», con quién, al llegar) y pasada (lo de después: valorar, bloquear,
 * reportar). La fase la decide el servidor.
 *
 * `ir`: rutas de la app («/cancelar», «/cuenta#agenda») o enlaces externos
 * («externo:<url>», el mapa). Quien la monta decide cómo abrir cada uno.
 */
export function MiMesa(p: { servicio: Servicio; ir: (destino: string) => void; alEntrar: () => void; alSalir: () => Promise<void> }) {
  const insets = useSafeAreaInsets()
  const [d, setD] = useState<M.DeServidor | null>(null)
  const [fallo, setFallo] = useState('')
  const [refrescando, setRefrescando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const { servicio } = p
  const alEntrar = useUltimo(p.alEntrar)

  const cargar = useCallback(async () => {
    const r = await servicio.mesa()
    if (r.ok) {
      setD(r.datos)
      setFallo('')
    } else if (r.status === 401) alEntrar.current()
    else setFallo(r.error)
  }, [servicio, alEntrar])

  // Al entrar en la pestaña, al volver a ella y al volver a la app: la mesa
  // se abre a una hora, y quien espera vuelve a mirar.
  useFocusEffect(
    useCallback(() => {
      cargar()
      const s = AppState.addEventListener('change', (e) => e === 'active' && cargar())
      return () => s.remove()
    }, [cargar]),
  )

  let cuerpo: ReactNode
  if (!d) {
    cuerpo = fallo ? (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{fallo}</Aviso>
        <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), cargar())} />
      </View>
    ) : null
  } else {
    const f = M.fase(d)
    cuerpo =
      f === 'vacia' ? (
        <Vacia d={d} ir={p.ir} />
      ) : f === 'cerrada' ? (
        <Cerrada d={d} ir={p.ir} alAbrirse={cargar} />
      ) : f === 'abierta' ? (
        <Abierta d={d} servicio={servicio} ir={p.ir} />
      ) : (
        <Pasada d={d} servicio={servicio} ir={p.ir} />
      )
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <Cabecera
        arriba={insets.top}
        saliendo={saliendo}
        alSalir={async () => {
          if (saliendo) return
          setSaliendo(true)
          await p.alSalir()
        }}
      />
      <ScrollView
        contentContainerStyle={estilos.pagina}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            tintColor={color.verde}
            onRefresh={async () => {
              setRefrescando(true)
              await cargar()
              setRefrescando(false)
            }}
          />
        }
      >
        {cuerpo}
      </ScrollView>
    </View>
  )
}

// --- Piezas comunes -------------------------------------------------------------

function SelloBorde({ texto }: { texto: string }) {
  return (
    <View style={estilos.selloBorde}>
      <Texto variante="etiqueta" tono="cuerpo" style={{ fontFamily: fuente.textoSemi, letterSpacing: 1.4 }}>
        {texto}
      </Texto>
    </View>
  )
}

function Titular({ children }: { children: ReactNode }) {
  return (
    <Texto variante="portada" accessibilityRole="header" style={{ marginTop: 14 }}>
      {children}
    </Texto>
  )
}

function Bajada({ children }: { children: ReactNode }) {
  return (
    <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
      {children}
    </Texto>
  )
}

function Acuse({ titulo, cuerpo, reporte, extra }: { titulo: string; cuerpo: string; reporte?: boolean; extra?: string | null }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[estilos.acuse, reporte ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(143,69,21,.34)' } : null]}
    >
      <View style={[estilos.acuseIcono, { backgroundColor: reporte ? '#6E340F' : color.verde }]}>
        <IconoCheck tam={13} color={reporte ? color.sobreTerracota : color.crema} />
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="rotulo">{titulo}</Texto>
        <Texto variante="cuerpoChico" style={{ marginTop: 3 }}>
          {cuerpo}
        </Texto>
        {/* El veto del sitio que no cupo: la valoración SÍ se guardó, y decirlo como error haría que la volviera a mandar. */}
        {extra ? (
          <Texto variante="cuerpoChico" tono="terracota" style={{ marginTop: 7 }}>
            {extra}
          </Texto>
        ) : null}
      </View>
    </View>
  )
}

/** Una píldora de elegir (el gasto, «No me mandes más a este sitio»), como la web: rellena al marcarla. */
function Pildora({ texto, marcada, onPress, relleno = color.verdeProfundo }: { texto: string; marcada: boolean; onPress: () => void; relleno?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      aria-checked={marcada}
      style={[estilos.pildora, marcada ? { backgroundColor: relleno, borderColor: relleno } : null]}
    >
      <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, color: marcada ? (relleno === color.verdeProfundo ? color.crema : '#FFF8EA') : color.verdeProfundo }}>
        {texto}
      </Texto>
    </Pressable>
  )
}

function EnlaceCancelar({ ir }: { ir: (d: string) => void }) {
  return (
    <Pressable onPress={() => ir('/cancelar')} accessibilityRole="link" style={estilos.enlace}>
      <Texto variante="cuerpoChico" tono="terracota" style={{ fontFamily: fuente.textoMedia, textDecorationLine: 'underline' }}>
        {T.cancelar}
      </Texto>
    </Pressable>
  )
}

/** Cambiar de fecha (29-10): solo si hay fechas abiertas a las que irse. */
function CambiarDeFecha({ d, ir }: { d: M.DeServidor; ir: (d: string) => void }) {
  if (!CM.enMiMesa(d.cambiarFecha)) return null
  return (
    <Pressable onPress={() => ir('/cambiar-fecha')} accessibilityRole="link" style={estilos.enlace}>
      <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, textDecorationLine: 'underline' }}>
        {TC.enlace}
      </Texto>
    </Pressable>
  )
}

// --- Vacía ----------------------------------------------------------------------

function Vacia({ d, ir }: { d: M.DeServidor; ir: (d: string) => void }) {
  const v = M.vacia(d)
  return (
    <View>
      <SelloBorde texto={v.sello} />
      <Titular>{v.titulo}</Titular>
      <Bajada>{v.bajada}</Bajada>
      <View style={[estilos.caja, { marginTop: 26 }]}>
        <Texto variante="cuerpo">{v.nota}</Texto>
        {v.accion ? (
          <View style={{ marginTop: 18 }}>
            <Boton texto={v.accion} onPress={() => ir('/cuenta#agenda')} />
          </View>
        ) : null}
        {/* Si prefiere el dinero al crédito (21-10): mientras haya plazo, o el acuse si ya lo pidió. */}
        {RM.fase(d.reembolso) === 'pedir' ? (
          <View style={{ marginTop: 12 }}>
            <Boton tipo="secundario" texto={TR.boton} onPress={() => ir('/reembolso')} />
            {d.reembolso?.hasta ? (
              <Texto variante="nota" style={{ marginTop: 10 }}>
                {TR.hasta((() => { const x = reglas.partesDe(d.reembolso!.hasta); return x ? `${x.dia} ${x.numero}` : '' })())}
              </Texto>
            ) : null}
          </View>
        ) : RM.fase(d.reembolso) === 'pendiente' ? (
          <Texto variante="cuerpoChico" style={{ marginTop: 12 }}>
            {TR.acuse.cuerpo(RM.bs(d.reembolso?.montoBs), null)}
          </Texto>
        ) : null}
      </View>
    </View>
  )
}

// --- Cerrada --------------------------------------------------------------------

function Cerrada({ d, ir, alAbrirse }: { d: M.DeServidor; ir: (d: string) => void; alAbrirse: () => void }) {
  const [ahora, setAhora] = useState(Date.now())
  const avisado = useRef(false)
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  // Al llegar a cero se relee: la fase la dice el servidor, no el reloj.
  useEffect(() => {
    if (!avisado.current && d.revelaEn && new Date(d.revelaEn).getTime() <= ahora) {
      avisado.current = true
      alAbrirse()
    }
  }, [ahora, d.revelaEn, alAbrirse])
  const z = d.zonaHoraria
  const etiqueta = (FORMATOS[d.formato ?? 'dinner'] ?? FORMATOS.dinner).singular
  const zonas = d.zonas ?? []
  const zonasTexto = zonas.length <= 1 ? (zonas[0] ?? '') : `${zonas.slice(0, -1).join(', ')} o ${zonas[zonas.length - 1]}`
  const horaZona = [F.horaEn(d.empiezaEn, z), zonasTexto].filter(Boolean).join(' · ')
  return (
    <View>
      <SelloBorde texto={F.selloSeAbre(d.revelaEn, z, ahora)} />
      <Titular>{F.tienesPuesto(d.empiezaEn, z)}</Titular>
      <Bajada>{T.cerrada.bajada(F.cuandoSeSabe(d.revelaEn, z))}</Bajada>
      <View style={[estilos.caja, { marginTop: 26 }]}>
        <Texto variante="cifra" style={{ fontSize: 44, lineHeight: 54 }} accessibilityRole="timer">
          {F.cuentaMesa(d.revelaEn, ahora)}
        </Texto>
        <Texto variante="cuerpo" style={{ marginTop: 8 }}>
          {T.cerrada.paraQue}
        </Texto>
        <View style={{ height: 1, backgroundColor: tinta(0.12), marginVertical: 18 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6, alignItems: 'baseline' }}>
          <Texto variante="subtitulo" style={{ fontSize: 21 }}>
            {F.cenaCorta(etiqueta, d.empiezaEn, z)}
          </Texto>
          <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia }}>
            {horaZona}
          </Texto>
        </View>
      </View>
      <Texto variante="cuerpo" style={{ marginTop: 20 }}>
        {T.cerrada.nota(M.voz(d).vasCon)}
      </Texto>
      <CambiarDeFecha d={d} ir={ir} />
      <EnlaceCancelar ir={ir} />
    </View>
  )
}

// --- Abierta --------------------------------------------------------------------

function Abierta({ d, servicio, ir }: { d: M.DeServidor; servicio: Servicio; ir: (d: string) => void }) {
  const [tardeAbierto, setTardeAbierto] = useState(false)
  const [retraso, setRetraso] = useState(1)
  const [avisando, setAvisando] = useState(false)
  const [falloTarde, setFalloTarde] = useState('')
  const [avisado, setAvisado] = useState<number | null>(null)
  const grab = useGrabacion(d, async (eventoId, permite) => {
    const r = await servicio.grabacion(eventoId, permite)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  })
  const pregunta = <PreguntaGrabacion {...grab.pregunta} />

  const mesa = M.esMesa(d)
  const v = M.voz(d)
  const otros = M.otros(d)
  const act = M.actividad(d)
  const mapa = M.mapa(d, Platform.OS)

  // El juego de la mesa: se abre y se cierra a su hora sin tener que recargar.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const avisar = async () => {
    if (avisando) return
    const minutos = T.tarde.opciones[retraso].minutos
    setAvisando(true)
    setFalloTarde('')
    const r = await servicio.tarde(minutos)
    setAvisando(false)
    if (!r.ok || !r.datos.avisado) return setFalloTarde(r.ok ? T.tarde.noPudimos : r.error)
    setTardeAbierto(false)
    setAvisado(r.datos.minutos ?? minutos)
  }

  const panelTarde = (
    <>
      {tardeAbierto ? (
        <View style={[estilos.caja, { backgroundColor: color.cremaFria, marginTop: 14 }]}>
          <Texto variante="subtitulo">{T.tarde.titulo}</Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 7 }}>
            {T.tarde.nota(mesa)}
          </Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {T.tarde.opciones.map((o, i) => (
              <Opcion key={o.minutos} texto={o.texto} marcada={retraso === i} onPress={() => setRetraso(i)} />
            ))}
          </View>
          {falloTarde ? (
            <View style={{ marginTop: 14 }}>
              <Aviso tono="ojo">{falloTarde}</Aviso>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, alignItems: 'center', marginTop: 18 }}>
            <Boton texto={T.tarde.avisar(mesa, avisando)} onPress={avisar} apagado={avisando} />
            <Boton tipo="fantasma" texto={T.tarde.cancelar} onPress={() => setTardeAbierto(false)} />
          </View>
        </View>
      ) : null}

      {avisado != null ? (
        <View style={{ marginTop: 14 }}>
          <Acuse titulo={T.tarde.avisado(avisado)} cuerpo={T.tarde.calma} />
        </View>
      ) : null}

    </>
  )

  // Una cena: la entrega 20 (paso a paso, juego, foto de la entrada). Lo demás, como estaba.
  if (J.hayJuego(d.formato)) {
    return (
      <>
        <MesaCena
          d={d}
          ahora={ahora}
          ir={ir}
          alTarde={() => setTardeAbierto((x) => !x)}
          tarde={panelTarde}
          ajustes={<AvisoAjustes d={d} />}
          grabacion={grab.linea ? <LineaGrabacion suelta permiso={grab.permiso} alCambiar={grab.cambiar} /> : null}
        />
        {pregunta}
      </>
    )
  }

  return (
    <View>
      <View style={estilos.selloAbierto}>
        <Texto variante="etiqueta" style={{ color: color.sobreTerracota, fontFamily: fuente.textoSemi, letterSpacing: 1.9 }}>
          {T.abierta.sello}
        </Texto>
      </View>

      <View style={estilos.tarjetaMesa}>
        <Texto variante="etiqueta" tono="cuerpoSobreVerde" style={{ letterSpacing: 2.2 }}>
          {v.TU}
        </Texto>
        {M.conNumero(d) ? (
          <>
            <Texto
              style={{ fontFamily: fuente.textoNegrita, fontSize: 112, lineHeight: 136, letterSpacing: -5, color: color.crema, fontVariant: ['tabular-nums'], marginTop: 4 }}
            >
              {M.numero(d)}
            </Texto>
            <View style={{ height: 1, backgroundColor: cremaAlfa(0.22), marginVertical: 20 }} />
          </>
        ) : (
          <View style={{ height: 14 }} />
        )}
        <Texto variante="display" tono="crema" style={{ fontSize: 34, lineHeight: 49 }}>
          {d.restaurante || '—'}
        </Texto>
        {d.direccion ? (
          <Texto variante="cuerpoGrande" tono="crema" style={{ fontFamily: fuente.textoMedia, marginTop: 10 }}>
            {d.direccion}
          </Texto>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {[F.cuandoMesa(d.empiezaEn, d.zonaHoraria, Date.now()), T.abierta.selloReserva(mesa)].filter(Boolean).map((x) => (
            <View key={x} style={estilos.pastillaClara}>
              <Texto variante="cuerpoChico" tono="crema" style={{ fontFamily: fuente.textoMedia }}>
                {x}
              </Texto>
            </View>
          ))}
        </View>
        {act ? (
          <View style={{ borderTopWidth: 1, borderTopColor: cremaAlfa(0.22), marginTop: 20, paddingTop: 18 }}>
            <Texto variante="etiqueta" tono="cuerpoSobreVerde" style={{ letterSpacing: 2.2 }}>
              {T.abierta.queSeHace}
            </Texto>
            <Texto variante="cuerpoGrande" tono="crema" style={{ fontFamily: fuente.textoMedia, marginTop: 9 }}>
              {act.titulo}
            </Texto>
            {act.nota ? (
              <Texto variante="cuerpoChico" tono="cuerpoSobreVerde" style={{ marginTop: 5 }}>
                {act.nota}
              </Texto>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 16 }}>
        {mapa ? <Boton texto={T.abierta.comoLlegar} onPress={() => ir('externo:' + mapa)} /> : null}
        <Boton tipo="secundario" texto={T.abierta.vozTarde} onPress={() => setTardeAbierto((x) => !x)} />
      </View>

      {panelTarde}

      <View style={{ marginTop: 34 }}>
        <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginBottom: 16 }}>
          {M.voz(d).conQuien}
        </Texto>
        {otros.map((c, i) => (
          <View key={c.id} style={estilos.otro}>
            <View style={[estilos.avatar, { backgroundColor: i % 2 ? color.verde : color.terracota }]}>
              <Texto variante="rotulo" tono="crema" style={{ fontSize: 17 }}>
                {c.inicial}
              </Texto>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texto variante="subtitulo" style={{ fontSize: 22 }}>
                {c.nombre}
              </Texto>
              <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, marginTop: 3 }}>
                {c.sector}
              </Texto>
              {c.seUnio ? (
                <Texto variante="cuerpoChico" tono="terracota" style={{ fontFamily: fuente.textoMedia, marginTop: 2 }}>
                  {T.abierta.seUnio}
                </Texto>
              ) : null}
            </View>
          </View>
        ))}
        {M.arraigos(d).length ? (
          <View style={{ marginTop: 18 }}>
            <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 10 }}>
              {T.abierta.arraigos(mesa)}
            </Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {M.arraigos(d).map((a) => (
                <View key={a} style={estilos.ficha}>
                  <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia }}>
                    {a}
                  </Texto>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <Texto variante="cuerpoChico" style={{ marginTop: 16 }}>
          {T.abierta.notaCompaneros(mesa)}
        </Texto>
        {grab.linea ? <LineaGrabacion permiso={grab.permiso} alCambiar={grab.cambiar} /> : null}
      </View>

      <View style={[estilos.caja, { backgroundColor: 'transparent', borderWidth: 1, borderColor: tinta(0.18), marginTop: 30 }]}>
        <Texto variante="subtitulo">{T.abierta.alLlegar}</Texto>
        <Texto variante="cuerpo" style={{ marginTop: 9 }}>
          {T.abierta.llegada(mesa, M.conNumero(d) ? M.numero(d) : '', otros.length + 1)}
        </Texto>
      </View>

      <EnlaceCancelar ir={ir} />
      {pregunta}
    </View>
  )
}

// --- Pasada: lo de después ---------------------------------------------------

function Pasada({ d, servicio, ir }: { d: M.DeServidor; servicio: Servicio; ir: (d: string) => void }) {
  const ya = M.yaHecho(d)
  const [v, setV] = useState<M.Valoracion>(() => ({ ...M.valoracionVacia(), bloqueados: ya.bloqueados }))
  const [contado, setContado] = useState(ya.contado)
  const [reportadoA, setReportadoA] = useState<string | null>(ya.reportadoA)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const [quien, setQuien] = useState<string | null>(null)
  const [motivo, setMotivo] = useState(-1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [avisoSitio, setAvisoSitio] = useState<string | null>(null)
  const [saltando, setSaltando] = useState(false)

  // «Ahora no» GUARDA que la saltó (8dc6b47): la encuesta ya no caduca, y sin
  // esto se quedaría delante para siempre. Si falla, se sale igual: lo que
  // pidió fue salir.
  const saltar = async () => {
    if (saltando) return
    setSaltando(true)
    if (d.mesaId) await servicio.saltar(d.mesaId).catch(() => null)
    setSaltando(false)
    ir('/cuenta')
  }

  const mesa = M.esMesa(d)
  const voz = M.voz(d)
  const otros = M.otros(d)
  const nombreDe = (id: string | null) => otros.find((o) => o.id === id)?.nombre ?? null
  const hay = M.algoQueContar(v)
  const listoReporte = !!quien && motivo >= 0

  const enviar = async () => {
    if (!hay || enviando || !d.mesaId) return
    setEnviando(true)
    setError('')
    // A quien se reportó NO se le vuelve a mandar como bloqueo: el reporte ya
    // lo bloquea, y para siempre. Mandarlo aquí convertía ese bloqueo en uno
    // normal, que se puede quitar en Perfil (Michael lo vio el 20-10).
    const r = await servicio.valorar(d.mesaId, { ...v, bloqueados: v.bloqueados.filter((id) => id !== reportadoA) })
    setEnviando(false)
    if (!r.ok) return setError(r.error)
    setAvisoSitio(r.datos.avisoSitio)
    setContado(true)
  }

  const reportar = async () => {
    if (!listoReporte || enviando || !d.mesaId || !quien) return
    setEnviando(true)
    setError('')
    const r = await servicio.reportar(d.mesaId, quien, T.reporte.motivos[motivo])
    setEnviando(false)
    if (!r.ok) return setError(r.error)
    setReporteAbierto(false)
    setReportadoA(quien)
    // Reportar a alguien también lo bloquea: la lista lo refleja.
    setV((x) => (x.bloqueados.includes(quien) ? x : { ...x, bloqueados: [...x.bloqueados, quien] }))
  }

  const Pregunta = ({ children, arriba = 28, abajo = 10 }: { children: ReactNode; arriba?: number; abajo?: number }) => (
    <Texto variante="rotulo" style={{ fontFamily: fuente.titular, fontSize: 16, lineHeight: 23, marginTop: arriba, marginBottom: abajo }}>
      {children}
    </Texto>
  )

  return (
    <View>
      <SelloBorde texto={M.selloPasada(d, Date.now())} />
      <Titular>{T.pasada.titulo}</Titular>
      <Bajada>{T.pasada.bajada(voz.estuviste, d.restaurante || '—', voz.unidad, M.conNumero(d) ? M.numero(d) : '')}</Bajada>
      {/* Solo en las cenas: el brunch se pregunta igual y la nota sobraría (24-10). */}
      {reglas.DE_CENA.includes(d.formato ?? 'dinner') ? (
        <Texto variante="nota" style={{ marginTop: 8 }}>
          {T.pasada.pensado}
        </Texto>
      ) : null}

      {!contado ? (
        <View style={{ marginTop: 10 }}>
          <Pregunta>{T.pasada.laMesa}</Pregunta>
          <View style={estilos.fichas}>
            {T.pasada.escalaMesa.map((t, i) => (
              <Ficha key={t} texto={t} marcada={v.mesa === i} mala={i === 3} onPress={() => setV((x) => ({ ...x, mesa: x.mesa === i ? -1 : i }))} />
            ))}
          </View>

          <Pregunta>{T.pasada.elSitio}</Pregunta>
          <View style={{ gap: 14 }}>
            {T.pasada.filasSitio.map((fila) => (
              <View key={fila.clave} style={{ gap: 8 }}>
                <Texto variante="cuerpoChico" tono="tinta" style={{ fontFamily: fuente.textoMedia }}>
                  {fila.nombre}
                </Texto>
                <View style={estilos.fichas}>
                  {T.pasada.escalaSitio.map((t, i) => {
                    const on = v.sitio[fila.clave] === i
                    return (
                      <Ficha
                        key={t}
                        texto={t}
                        marcada={on}
                        mala={i === 3}
                        onPress={() => setV((x) => ({ ...x, sitio: { ...x.sitio, [fila.clave]: on ? -1 : i } }))}
                      />
                    )
                  })}
                </View>
              </View>
            ))}
          </View>

          <Pregunta>{T.pasada.volverias}</Pregunta>
          <View style={estilos.fichas}>
            <Ficha texto={T.pasada.si} marcada={v.volveria === 1} onPress={() => setV((x) => ({ ...x, volveria: x.volveria === 1 ? -1 : 1 }))} />
            <Ficha texto={T.pasada.no} marcada={v.volveria === 0} mala onPress={() => setV((x) => ({ ...x, volveria: x.volveria === 0 ? -1 : 0 }))} />
          </View>

          {/* Cuánto gastó y si repetiría el sitio: son del sitio, así que van con lo del sitio y antes del texto libre (17-10). */}
          <Pregunta abajo={6}>{T.pasada.gasto}</Pregunta>
          <Texto variante="nota" style={{ marginBottom: 10 }}>
            {T.pasada.notaGasto(reglas.precioTexto())}
          </Texto>
          <View style={estilos.fichas}>
            {T.pasada.tramosGasto.map(([t], i) => (
              <Pildora key={t} texto={t} marcada={v.gasto === i} onPress={() => setV((x) => ({ ...x, gasto: x.gasto === i ? -1 : i }))} />
            ))}
          </View>

          {M.puedeVetarSitio(v) ? (
            <View style={{ marginTop: 14 }}>
              <View style={{ alignSelf: 'flex-start' }}>
                <Pildora
                  texto={T.pasada.noRepetir(v.noRepetirSitio)}
                  marcada={v.noRepetirSitio}
                  relleno={color.terracota}
                  onPress={() => setV((x) => ({ ...x, noRepetirSitio: !x.noRepetirSitio }))}
                />
              </View>
              <Texto variante="nota" style={{ marginTop: 7 }}>
                {T.pasada.notaNoRepetir}
              </Texto>
            </View>
          ) : null}

          {/* El texto libre (17-10): después de las escalas y antes de la pregunta incómoda. */}
          <Pregunta abajo={6}>{T.pasada.comentario}</Pregunta>
          <Texto variante="nota" style={{ marginBottom: 10 }}>
            {T.pasada.notaComentario}
          </Texto>
          <TextInput
            value={v.comentario}
            onChangeText={(t) => setV((x) => ({ ...x, comentario: t.slice(0, M.MAX_COMENTARIO) }))}
            maxLength={M.MAX_COMENTARIO}
            multiline
            textAlignVertical="top"
            placeholder={T.pasada.comentarioEjemplo}
            placeholderTextColor={color.secundario}
            accessibilityLabel={T.pasada.comentario}
            style={estilos.comentario}
          />

          <Pregunta>{T.pasada.noCoincidir}</Pregunta>
          <Texto variante="nota" style={{ marginTop: -4, marginBottom: 10 }}>
            {T.pasada.notaBloquear(voz as never)}
          </Texto>
          <View style={{ gap: 8 }}>
            {otros.map((o) => {
              const fija = reportadoA === o.id
              return (
                <Opcion
                  key={o.id}
                  unica
                  texto={o.nombre}
                  pie={fija ? T.pasada.bloqueadaPorReporte : o.sector}
                  pieFuerte={fija}
                  fija={fija}
                  marcada={v.bloqueados.includes(o.id)}
                  onPress={() => setV((x) => ({ ...x, bloqueados: M.alternar(x.bloqueados, o.id) }))}
                />
              )
            })}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 28 }}>
            <Boton texto={T.pasada.enviar(enviando)} onPress={enviar} apagado={!hay || enviando} />
            <Boton tipo="fantasma" texto={saltando ? T.pasada.saltando : T.pasada.ahoraNo} onPress={saltar} />
          </View>
          {error && !reporteAbierto ? (
            <View style={{ marginTop: 14 }}>
              <Aviso tono="ojo">{error}</Aviso>
            </View>
          ) : null}
        </View>
      ) : null}

      {!reportadoA ? (
        <Pressable onPress={() => setReporteAbierto((x) => !x)} accessibilityRole="button" style={estilos.enlace}>
          <Texto variante="cuerpoChico" style={{ color: '#6E340F', fontFamily: fuente.textoMedia, textDecorationLine: 'underline' }}>
            {T.reporte.abrir}
          </Texto>
        </Pressable>
      ) : null}

      {contado ? (
        <View style={{ marginTop: 26 }}>
          <Acuse titulo={T.pasada.anotado} cuerpo={T.pasada.resumen(v.bloqueados.length)} extra={avisoSitio} />
        </View>
      ) : null}

      {reporteAbierto ? (
        <View style={[estilos.caja, { backgroundColor: color.cremaFria, marginTop: 14 }]}>
          <Texto variante="subtitulo">{T.reporte.titulo}</Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 7 }}>
            {T.reporte.nota}
          </Texto>
          <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginTop: 20, marginBottom: 10 }}>
            {T.reporte.sobreQuien}
          </Texto>
          <View style={{ gap: 8 }}>
            {otros.map((o) => (
              <Opcion key={o.id} unica texto={o.nombre} pie={o.sector} marcada={quien === o.id} onPress={() => setQuien(o.id)} />
            ))}
          </View>
          <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginTop: 20, marginBottom: 10 }}>
            {T.reporte.quePaso}
          </Texto>
          <View style={{ gap: 8 }}>
            {T.reporte.motivos.map((m, i) => (
              <Opcion key={m} unica texto={m} marcada={motivo === i} onPress={() => setMotivo(i)} />
            ))}
          </View>
          <View style={{ marginTop: 18 }}>
            <Aviso tono="ojo">{T.reporte.aviso(nombreDe(quien))}</Aviso>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 18 }}>
            <Boton tipo="grave" texto={T.reporte.boton(enviando, !!quien, motivo >= 0)} onPress={reportar} apagado={!listoReporte || enviando} />
            <Boton tipo="fantasma" texto={T.reporte.cancelar} onPress={() => setReporteAbierto(false)} />
          </View>
          {error ? (
            <View style={{ marginTop: 14 }}>
              <Aviso tono="ojo">{error}</Aviso>
            </View>
          ) : null}
        </View>
      ) : null}

      {reportadoA ? (
        <View style={{ marginTop: 14 }}>
          <Acuse reporte titulo={T.reporte.enviado} cuerpo={T.reporte.resumen(nombreDe(reportadoA) ?? '—')} />
        </View>
      ) : null}

      {contado || reportadoA ? (
        <View style={{ marginTop: 16 }}>
          <Boton texto={T.pasada.volver} onPress={() => ir('/cuenta')} />
        </View>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, paddingTop: 24, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  selloBorde: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: tinta(0.24),
  },
  selloAbierto: {
    alignSelf: 'flex-start',
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: radio.capsula,
    backgroundColor: '#6E340F',
  },
  caja: { borderRadius: 26, backgroundColor: color.cremaElevada, padding: 20 },
  tarjetaMesa: { borderRadius: 30, backgroundColor: color.verdeProfundo, padding: 24, marginTop: 14 },
  pastillaClara: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: cremaAlfa(0.3),
  },
  otro: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: tinta(0.13) },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  enlace: { alignSelf: 'flex-start', minHeight: medida.toqueMinimo, justifyContent: 'center', marginTop: 16 },
  ficha: { borderRadius: radio.capsula, borderWidth: 1, borderColor: tinta(0.18), paddingHorizontal: 12, paddingVertical: 7 },
  acuse: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 26, backgroundColor: verdeAlfa(0.1), padding: 18 },
  acuseIcono: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pildora: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radio.capsula, borderWidth: 1, borderColor: 'rgba(20,52,42,.22)' },
  comentario: {
    minHeight: 96,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(20,52,42,.22)',
    backgroundColor: '#FFFBF0',
    color: color.verdeProfundo,
    fontFamily: fuente.texto,
    fontSize: 15,
    lineHeight: 22,
  },
})

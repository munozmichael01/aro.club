import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Aviso, Boton, Ficha, IconoCheck, Opcion, Texto, color, cremaAlfa, fuente, medida, radio, tinta, verdeAlfa } from '../diseno'
import { Cabecera } from '../cuenta/Cabecera'
import { FORMATOS } from '../texto/cuenta'
import * as F from '../texto/fechas'
import * as T from '../texto/mesa'
import * as M from './maquina'
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
  const { servicio, alEntrar } = p

  const cargar = useCallback(async () => {
    const r = await servicio.mesa()
    if (r.ok) {
      setD(r.datos)
      setFallo('')
    } else if (r.status === 401) alEntrar()
    else setFallo(r.error)
  }, [servicio, alEntrar])

  useEffect(() => {
    cargar()
    // Al volver a la app: la mesa se abre a una hora, y quien espera vuelve a mirar.
    const s = AppState.addEventListener('change', (e) => e === 'active' && cargar())
    return () => s.remove()
  }, [cargar])

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

function Acuse({ titulo, cuerpo, reporte }: { titulo: string; cuerpo: string; reporte?: boolean }) {
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
      </View>
    </View>
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
        {T.cerrada.nota}
      </Texto>
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

  const mesa = M.esMesa(d)
  const v = M.voz(d)
  const otros = M.otros(d)
  const act = M.actividad(d)
  const mapa = M.mapa(d, Platform.OS)

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
        <Texto
          style={{ fontFamily: fuente.textoNegrita, fontSize: 112, lineHeight: 136, letterSpacing: -5, color: color.crema, fontVariant: ['tabular-nums'], marginTop: 4 }}
        >
          {M.numero(d)}
        </Texto>
        <View style={{ height: 1, backgroundColor: cremaAlfa(0.22), marginVertical: 20 }} />
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

      <View style={{ marginTop: 34 }}>
        <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginBottom: 16 }}>
          {T.abierta.conQuien(mesa)}
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
            </View>
          </View>
        ))}
        <Texto variante="cuerpoChico" style={{ marginTop: 16 }}>
          {T.abierta.notaCompaneros(mesa)}
        </Texto>
      </View>

      <View style={[estilos.caja, { backgroundColor: 'transparent', borderWidth: 1, borderColor: tinta(0.18), marginTop: 30 }]}>
        <Texto variante="subtitulo">{T.abierta.alLlegar}</Texto>
        <Texto variante="cuerpo" style={{ marginTop: 9 }}>
          {T.abierta.llegada(mesa, M.numero(d), otros.length + 1)}
        </Texto>
      </View>

      <EnlaceCancelar ir={ir} />
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
    const r = await servicio.valorar(d.mesaId, v)
    setEnviando(false)
    if (!r.ok) return setError(r.error)
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

  const Pregunta = ({ children, arriba = 28 }: { children: ReactNode; arriba?: number }) => (
    <Texto variante="rotulo" style={{ fontFamily: fuente.titular, fontSize: 16, lineHeight: 23, marginTop: arriba, marginBottom: 10 }}>
      {children}
    </Texto>
  )

  return (
    <View>
      <SelloBorde texto={T.pasada.sello} />
      <Titular>{T.pasada.titulo}</Titular>
      <Bajada>{T.pasada.bajada(mesa, d.restaurante || '—', voz.unidad, M.numero(d))}</Bajada>
      <Texto variante="nota" style={{ marginTop: 8 }}>
        {T.pasada.pensado}
      </Texto>

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
            <Boton tipo="fantasma" texto={T.pasada.ahoraNo} onPress={() => ir('/cuenta')} />
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
          <Acuse titulo={T.pasada.anotado} cuerpo={T.pasada.resumen(v.bloqueados.length)} />
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
  acuse: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 26, backgroundColor: verdeAlfa(0.1), padding: 18 },
  acuseIcono: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})

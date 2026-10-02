import * as Clipboard from 'expo-clipboard'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  AroCarga,
  Aviso,
  Boton,
  Campo,
  Fecha,
  IconoCheck,
  IconoFlecha,
  Marca,
  Selector,
  Texto,
  color,
  cremaAlfa,
  fuente,
  medida,
  radio,
  terracotaAlfa,
  tinta,
} from '../diseno'
import { reglas, type CampoDePago } from '../reglas'
import { MESES_CORTOS } from '../texto/fechas'
import * as F from '../texto/fechas'
import * as T from '../texto/pago'
import { useUltimo } from '../util/useUltimo'
import { encoger } from '../verificacion/foto'
import * as M from './maquina'
import type { crearServicioPago } from './servicio'

type Servicio = ReturnType<typeof crearServicioPago>

/**
 * Pago (`/pago?evento=…`), calcado de `Pago.dc.html`: elegir método (y el
 * código de invitación, plegado), los datos para pagar, el reporte, y lo que
 * pasa después —pendiente, confirmado, no cuadra, o el cupón—. Sin
 * verificar no se enseña ni el primer paso. El puesto se aparta al reportar.
 *
 * `ir`: rutas de la app («/cuenta», «/mesa», «/verificacion»).
 */
export function Pago(p: { evento: string | null; servicio: Servicio; ir: (d: string) => void; alEntrar: () => void; ahora?: () => number }) {
  const insets = useSafeAreaInsets()
  const ahora = p.ahora ?? Date.now
  const { servicio, evento } = p
  const alEntrar = useUltimo(p.alEntrar)

  const [d, setD] = useState<M.DeServidor | null>(null)
  const [fase, setFase] = useState<M.Fase>('elegir')
  const [metodo, setMetodo] = useState(0)
  const [fallo, setFallo] = useState(evento ? '' : T.sinEvento)
  const [copiado, setCopiado] = useState(-1)
  const [rep, setRep] = useState<Record<string, string>>(M.repInicial)
  const [captura, setCaptura] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [cuponAbierto, setCuponAbierto] = useState(false)
  const [cupon, setCupon] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [falloCupon, setFalloCupon] = useState('')

  const cargar = useCallback(async () => {
    if (!evento) return
    const r = await servicio.cargar(evento)
    if (r.ok) {
      setD(r.datos)
      setFase(M.faseDeServidor(r.datos, ahora()))
      setMetodo(M.metodoInicial(r.datos))
      setFallo('')
    } else if (r.status === 401) alEntrar.current()
    else setFallo(r.error)
  }, [servicio, evento, alEntrar])

  useFocusEffect(
    useCallback(() => {
      cargar()
    }, [cargar]),
  )

  // Cada paso empieza arriba: si no, el sello y el titular del siguiente quedan fuera de la pantalla.
  const scroll = useRef<ScrollView>(null)
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false })
  }, [fase])

  const m: M.Metodo | null = d ? (d.metodos[metodo] ?? d.metodos[0] ?? null) : null
  const estado = m ? M.estadoReporte(m, rep, !!captura, ahora()) : null

  const aplicarCupon = async () => {
    const codigo = cupon.trim()
    if (!d || !codigo || aplicando) return
    setAplicando(true)
    setFalloCupon('')
    const r = await servicio.cupon(d.evento.id, codigo)
    setAplicando(false)
    // El fallo se enseña junto al campo: un código mal tecleado se corrige donde se escribió.
    if (!r.ok) return setFalloCupon(r.error)
    setFase('cupon')
  }

  const adjuntar = async () => {
    if (subiendo) return
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    const a = r.canceled ? null : r.assets[0]
    if (!a) return
    setSubiendo(true)
    setFallo('')
    const uri = await encoger(a.uri, a.width, a.height)
    const s = await servicio.captura(new File(uri) as unknown as Blob, 'captura.jpg')
    setSubiendo(false)
    if (!s.ok) return setFallo(s.error)
    setCaptura(s.datos.ruta)
  }

  const reportar = async () => {
    if (!d || !m || !estado?.ok || fase === 'enviando') return
    setFallo('')
    setFase('enviando')
    const r = await servicio.reportar(M.cuerpoReporte(d, m, rep, captura))
    if (!r.ok) {
      if (M.esFechaCerrada(r)) return setFase('cerrada')
      setFase('reportar')
      return setFallo(r.error)
    }
    setFase(r.datos.estado === 'confirmado' ? 'listo' : 'pendiente')
  }

  let cuerpo: ReactNode = null
  if (!d || !m) {
    cuerpo = fallo ? (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{fallo}</Aviso>
        {evento ? <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), cargar())} /> : null}
        <Boton tipo="fantasma" texto={T.faltaVerificar.volver} onPress={() => p.ir('/cuenta')} />
      </View>
    ) : (
      <AroCarga tam={36} />
    )
  } else if (!d.verificada && (fase === 'elegir' || fase === 'datos' || fase === 'reportar')) {
    // Sin verificar no se enseña ni el primer paso: el servidor rechazaría el pago al final.
    cuerpo = (
      <View>
        <Sello tono="aviso" texto={T.faltaVerificar.sello} />
        <Titular>{T.faltaVerificar.titulo}</Titular>
        <Bajada>{T.faltaVerificar.bajada}</Bajada>
        <Acciones>
          <Boton texto={T.faltaVerificar.verificar} onPress={() => p.ir('/verificacion')} />
          <Boton tipo="fantasma" texto={T.faltaVerificar.volver} onPress={() => p.ir('/cuenta')} />
        </Acciones>
      </View>
    )
  } else if (fase === 'elegir') {
    const cab = M.cabecera(d)
    cuerpo = (
      <View>
        <Titular>{T.elegir.titulo}</Titular>
        <Bajada>{T.elegir.bajada}</Bajada>
        <View style={[estilos.caja, { marginTop: 26 }]}>
          <Linea izquierda={<Texto variante="subtitulo" style={{ fontSize: 22 }}>{cab.nombre}</Texto>} derecha={<Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia }}>{cab.detalle}</Texto>} />
          <Separador />
          <Linea izquierda={<Texto variante="cuerpo">{T.elegir.unPuesto}</Texto>} derecha={<Cifra>{M.dinero(d.montoUsd, 'USD')}</Cifra>} />
          <View style={{ height: 9 }} />
          <Linea
            izquierda={<Texto variante="cuerpo">{M.etiquetaTasa(d, ahora())}</Texto>}
            derecha={<Texto variante="cuerpo" style={{ fontFamily: fuente.textoMedia, fontVariant: ['tabular-nums'] }}>{d.tasa ? T.elegir.unUsd(M.dinero(d.tasa, 'Bs')) : T.elegir.sinTasa}</Texto>}
          />
          <Separador />
          <Linea
            izquierda={<Texto variante="rotulo" style={{ fontSize: 16 }}>{T.elegir.total}</Texto>}
            derecha={<Texto variante="cifra" style={{ fontSize: 26, lineHeight: 32 }}>{M.montoDe(d, m)}</Texto>}
          />
        </View>
        <View style={{ marginTop: 14 }}>
          <Aviso tono="ojo">{T.elegir.consumo}</Aviso>
        </View>

        <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginTop: 30, marginBottom: 12 }}>
          {T.elegir.comoPagas}
        </Texto>
        <View style={{ gap: 9 }}>
          {d.metodos.map((x, i) => (
            <FilaMetodo
              key={x.id}
              m={x}
              elegido={metodo === i && x.activo}
              onPress={() => {
                if (!x.activo) return
                setMetodo(i)
                setCopiado(-1)
                setRep(M.repInicial())
                setCaptura(null)
              }}
            />
          ))}
        </View>

        {/* El código va DEBAJO y plegado: casi nadie tiene uno, y arriba le preguntaría a todos. */}
        <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: tinta(0.12) }}>
          {!cuponAbierto ? (
            <Pressable onPress={() => setCuponAbierto(true)} accessibilityRole="button" style={{ minHeight: medida.toqueMinimo, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Texto variante="cuerpoChico" tono="verde" style={{ fontFamily: fuente.textoMedia, textDecorationLine: 'underline' }}>
                {T.cupon.pregunta}
              </Texto>
            </Pressable>
          ) : (
            <View>
              <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginBottom: 10 }}>
                {T.cupon.etiqueta}
              </Texto>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <View style={{ flexGrow: 1, flexBasis: 160 }}>
                  <Campo
                    value={cupon}
                    onChangeText={(v) => (setCupon(M.normalizarCupon(v)), setFalloCupon(''))}
                    placeholder={T.cupon.ejemplo}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    accessibilityLabel={T.cupon.etiqueta}
                  />
                </View>
                <Boton texto={T.cupon.aplicar(aplicando)} onPress={aplicarCupon} apagado={aplicando || !cupon.trim()} />
              </View>
              {falloCupon ? (
                <View style={{ marginTop: 12 }}>
                  <Aviso tono="ojo">{falloCupon}</Aviso>
                </View>
              ) : null}
              <Texto variante="nota" style={{ marginTop: 11 }}>
                {T.cupon.nota}
              </Texto>
            </View>
          )}
        </View>

        <View style={{ marginTop: 26 }}>
          <Boton ancho texto={T.elegir.irDatos(m.manual, m.nombre)} onPress={() => (setFase('datos'), setCopiado(-1))} />
        </View>
        <Texto variante="nota" style={{ marginTop: 12 }}>
          {T.elegir.cancelas}
        </Texto>
      </View>
    )
  } else if (fase === 'datos') {
    cuerpo = (
      <View>
        <Sello tono="aviso" texto={T.selloApartado} />
        <Titular>{T.datos.titulo(m.manual)}</Titular>
        <Bajada>{T.datos.bajada(m.manual, m.id, m.nombre)}</Bajada>
        {m.datosDePrueba ? (
          <View accessibilityRole="alert" style={estilos.prueba}>
            <Texto variante="rotulo" style={{ color: color.sobreTerracota }}>
              {T.datos.pruebaTitulo}
            </Texto>
            <Texto variante="cuerpoChico" style={{ color: color.sobreTerracota, marginTop: 4 }}>
              {T.datos.pruebaCuerpo}
            </Texto>
          </View>
        ) : null}
        <View style={[estilos.caja, { backgroundColor: color.verdeProfundo, marginTop: 24 }]}>
          <Texto variante="etiquetaChica" tono="sobreVerdeSecundario" style={{ marginBottom: 8 }}>
            {T.datos.etiqueta(m.nombre)}
          </Texto>
          {m.datos.map((x, i) => (
            <View key={x.campo} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: cremaAlfa(0.16) }}>
              <Texto variante="nota" tono="sobreVerdeSecundario">
                {x.campo}
              </Texto>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 5 }}>
                <Texto variante="rotulo" tono="crema" style={{ flex: 1, fontSize: 19, lineHeight: 25, fontVariant: ['tabular-nums'] }} selectable>
                  {x.valor}
                </Texto>
                <Pressable
                  onPress={async () => {
                    // Se copia `copiar`, no lo que se lee: «19064051», no «V-19.064.051».
                    await Clipboard.setStringAsync(x.copiar)
                    setCopiado(i)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${T.datos.copiar} ${x.campo}`}
                  style={estilos.copiar}
                >
                  <Texto variante="etiqueta" style={{ fontFamily: fuente.textoSemi, letterSpacing: 0, color: copiado === i ? color.terracotaSobreVerde : color.crema }}>
                    {copiado === i ? T.datos.copiado : T.datos.copiar}
                  </Texto>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        <Acciones>
          <Boton texto={T.datos.irReportar(m.manual)} onPress={() => setFase('reportar')} />
          <Boton tipo="fantasma" texto={T.datos.cambiarMetodo} onPress={() => setFase('elegir')} />
        </Acciones>
      </View>
    )
  } else if (fase === 'reportar' && estado) {
    cuerpo = (
      <View>
        <Sello tono="aviso" texto={T.selloApartado} />
        <Titular>{T.reporte.titulo(m.manual)}</Titular>
        <Bajada>{T.reporte.bajada(m.manual)}</Bajada>
        <View style={{ gap: 16, marginTop: 24 }}>
          {m.campos.map((c) => (
            <CampoReporte key={c.campo} c={c} rep={rep} poner={(k, v) => setRep((x) => ({ ...x, [k]: v }))} />
          ))}
        </View>
        {estado.fechaFutura ? (
          <View style={{ marginTop: 12 }}>
            <Aviso tono="ojo">{T.reporte.fechaFutura}</Aviso>
          </View>
        ) : null}
        {m.manual ? (
          <View style={{ marginTop: 16 }}>
            <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, marginBottom: 8 }}>
              {T.reporte.captura(m.capturaObligatoria)}
            </Texto>
            <Pressable
              onPress={adjuntar}
              disabled={subiendo}
              accessibilityRole="button"
              style={[estilos.captura, captura ? { borderStyle: 'solid', borderColor: color.verde, backgroundColor: color.cremaElevada } : null]}
            >
              <View style={[estilos.capturaIcono, { backgroundColor: captura ? color.verde : tinta(0.09) }]}>
                {subiendo ? <AroCarga tam={18} /> : captura ? <IconoCheck color={color.crema} /> : <Texto variante="rotulo" tono="verde" style={{ fontSize: 18 }}>+</Texto>}
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="rotulo">{T.reporte.capturaTitulo(subiendo, !!captura)}</Texto>
                <Texto variante="nota" tono="cuerpo" style={{ marginTop: 2 }}>
                  {T.reporte.capturaNota(subiendo, !!captura, m.capturaObligatoria, m.nombre)}
                </Texto>
              </View>
            </Pressable>
          </View>
        ) : null}
        {fallo ? (
          <View style={{ marginTop: 14 }}>
            <Aviso tono="ojo">{fallo}</Aviso>
          </View>
        ) : null}
        <Acciones>
          <Boton texto={T.reporte.boton({ ...estado, manual: m.manual })} onPress={reportar} apagado={!estado.ok} />
          <Boton tipo="fantasma" texto={T.reporte.verOtraVez} onPress={() => setFase('datos')} />
        </Acciones>
        <Texto variante="nota" tono="cuerpo" style={{ marginTop: 14 }}>
          {T.reporte.nota(m.manual)}
        </Texto>
      </View>
    )
  } else if (fase === 'enviando') {
    cuerpo = (
      <View>
        <Titular>{T.enviando.titulo(m.manual)}</Titular>
        <View style={estilos.capsula}>
          <AroCarga tam={20} />
          <Texto variante="cuerpoGrande" style={{ fontFamily: fuente.textoMedia }}>
            {M.montoDe(d, m)} · {m.nombre}
          </Texto>
        </View>
        <Texto variante="cuerpoChico" style={{ marginTop: 16 }}>
          {T.enviando.noCierres}
        </Texto>
      </View>
    )
  } else if (fase === 'pendiente') {
    cuerpo = (
      <View>
        <Sello tono="grave" texto={T.pendiente.sello} />
        <Titular>{T.pendiente.titulo}</Titular>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.pendiente.bajada}
          <Texto variante="cuerpoGrande" tono="tinta" style={{ fontFamily: fuente.textoSemi }}>
            {T.pendiente.bajadaEnfasis}
          </Texto>
          {T.pendiente.bajadaFin}
        </Texto>
        <View style={[estilos.recuadro, { marginTop: 24 }]}>
          <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 14 }}>
            {T.pendiente.quePasa}
          </Texto>
          <View style={{ gap: 13 }}>
            {T.pendiente.pasos.map((x) => (
              <View key={x.titulo} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[estilos.paso, { backgroundColor: x.tono === 'hecho' ? color.verde : x.tono === 'ahora' ? color.terracota : color.verdeProfundo }]}>
                  {x.tono === 'hecho' ? <IconoCheck tam={12} color={color.crema} /> : x.tono === 'ahora' ? <View style={estilos.puntito} /> : <IconoFlecha tam={12} color={color.crema} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Texto variante="rotulo">{x.titulo}</Texto>
                  <Texto variante="cuerpoChico" style={{ marginTop: 3 }}>
                    {x.cuerpo}
                  </Texto>
                </View>
              </View>
            ))}
          </View>
        </View>
        <Comprobante titulo={T.pendiente.loQueReportaste} filas={M.comprobante(d, m, 'pendiente')} />
        <Acciones>
          <Boton texto={T.pendiente.irCuenta} onPress={() => p.ir('/cuenta')} />
          <Boton tipo="fantasma" texto={T.pendiente.algoNoCuadra} onPress={() => Linking.openURL('mailto:hola@aro.club')} />
        </Acciones>
      </View>
    )
  } else if (fase === 'listo') {
    const dia = F.diaMinusculaYNumero(d.evento.empiezaEn, d.evento.zonaHoraria)
    cuerpo = (
      <View>
        <Sello tono="listo" texto={T.listo.sello} />
        <Titular>{T.listo.titulo(dia?.dia ?? null, dia?.numero ?? null)}</Titular>
        <Bajada>{T.listo.bajada(M.cuandoSeAbre(d))}</Bajada>
        <Comprobante titulo={T.listo.comprobante} filas={M.comprobante(d, m, 'listo')} pie={T.listo.porCorreo} />
        <Acciones>
          <Boton texto={T.listo.irCuenta} onPress={() => p.ir('/cuenta')} />
          <Boton tipo="fantasma" texto={T.listo.verReserva} onPress={() => p.ir('/mesa')} />
        </Acciones>
      </View>
    )
  } else if (fase === 'cupon') {
    cuerpo = (
      <View>
        <Sello tono="listo" texto={T.cuponListo.sello} />
        <Titular>{T.cuponListo.titulo}</Titular>
        <Bajada>{T.cuponListo.bajada(M.cuandoSeAbre(d))}</Bajada>
        <View style={{ marginTop: 22 }}>
          <Aviso tono="ojo">{T.cuponListo.consumo}</Aviso>
        </View>
        <Acciones>
          <Boton texto={T.listo.irCuenta} onPress={() => p.ir('/cuenta')} />
          <Boton tipo="fantasma" texto={T.listo.verReserva} onPress={() => p.ir('/mesa')} />
        </Acciones>
      </View>
    )
  } else if (fase === 'cerrada') {
    cuerpo = (
      <View>
        <Sello tono="borde" texto={T.cerrada.sello} />
        <Titular>{T.cerrada.titulo}</Titular>
        <Bajada>{T.cerrada.bajada}</Bajada>
        <Acciones>
          <Boton texto={T.cerrada.otraFecha} onPress={() => p.ir('/cuenta')} />
        </Acciones>
      </View>
    )
  } else if (fase === 'fallo') {
    cuerpo = (
      <View>
        <Sello tono="borde" texto={T.fallo.sello} />
        <Titular>{T.fallo.titulo}</Titular>
        <Bajada>{T.fallo.bajada}</Bajada>
        <View style={[estilos.recuadro, { marginTop: 24 }]}>
          <Texto variante="subtitulo" style={{ fontSize: 21 }}>
            {T.fallo.queHacer}
          </Texto>
          <View style={{ gap: 11, marginTop: 14 }}>
            {T.fallo.salidas.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 11 }}>
                <View style={estilos.numero}>
                  <Texto variante="etiqueta" tono="terracota" style={{ fontFamily: fuente.textoSemi, letterSpacing: 0 }}>
                    {i + 1}
                  </Texto>
                </View>
                <Texto variante="cuerpo" style={{ flex: 1 }}>
                  {s}
                </Texto>
              </View>
            ))}
          </View>
        </View>
        <Acciones>
          <Boton texto={T.fallo.corregir} onPress={() => (setRep(M.repInicial()), setCaptura(null), setFase('reportar'))} />
          <Boton tipo="fantasma" texto={T.fallo.escribirnos} onPress={() => Linking.openURL('mailto:hola@aro.club')} />
        </Acciones>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <ScrollView ref={scroll} contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Pressable onPress={() => p.ir('/cuenta')} accessibilityRole="link" accessibilityLabel={T.faltaVerificar.volver} style={estilos.volver}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <IconoFlecha tam={16} color={color.cuerpo} />
          </View>
          <Marca tam={22} />
          <Texto variante="marca">Aro Club</Texto>
        </Pressable>
        {cuerpo}
      </ScrollView>
    </View>
  )
}

// --- Piezas ---------------------------------------------------------------------

function Titular({ children }: { children: ReactNode }) {
  return (
    <Texto variante="portada" accessibilityRole="header">
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

function Acciones({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 26 }}>{children}</View>
}

function Separador() {
  return <View style={{ height: 1, backgroundColor: tinta(0.12), marginVertical: 16 }} />
}

function Linea({ izquierda, derecha }: { izquierda: ReactNode; derecha: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, alignItems: 'baseline' }}>
      <View style={{ flexGrow: 1, flexShrink: 1 }}>{izquierda}</View>
      {derecha}
    </View>
  )
}

function Cifra({ children }: { children: ReactNode }) {
  return (
    <Texto variante="rotulo" style={{ fontVariant: ['tabular-nums'] }}>
      {children}
    </Texto>
  )
}

function Sello({ texto, tono }: { texto: string; tono: 'aviso' | 'grave' | 'listo' | 'borde' }) {
  const fondo = tono === 'aviso' ? terracotaAlfa(0.12) : tono === 'grave' ? '#6E340F' : tono === 'listo' ? color.verde : 'transparent'
  const tinta_ = tono === 'aviso' || tono === 'borde' ? color.terracota : tono === 'grave' ? color.sobreTerracota : color.crema
  return (
    <View style={[estilos.sello, { backgroundColor: fondo }, tono === 'borde' ? { borderWidth: 1, borderColor: 'rgba(143,69,21,.44)' } : null]}>
      <Texto variante="etiquetaChica" style={{ color: tinta_, fontFamily: fuente.textoSemi, letterSpacing: 1.3 }}>
        {texto}
      </Texto>
    </View>
  )
}

function FilaMetodo({ m, elegido, onPress }: { m: M.Metodo; elegido: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={elegido}
      aria-disabled={!m.activo}
      style={[estilos.metodo, { backgroundColor: elegido ? color.cremaElevada : 'transparent', borderColor: elegido ? '#6E340F' : tinta(0.2), opacity: m.activo ? 1 : 0.5 }]}
    >
      <View style={[estilos.aro, { borderColor: elegido ? '#6E340F' : tinta(0.3), backgroundColor: elegido ? color.terracota : 'transparent' }]}>
        {elegido ? <IconoCheck tam={11} color={color.sobreTerracota} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Texto variante="rotulo" style={{ fontSize: 16, fontFamily: elegido ? fuente.textoSemi : fuente.textoMedia }}>
            {m.nombre}
          </Texto>
          {!m.activo ? (
            <View style={estilos.pronto}>
              <Texto variante="etiquetaChica" tono="cuerpo" style={{ fontSize: 10, fontFamily: fuente.textoSemi, letterSpacing: 1 }}>
                {T.elegir.pronto}
              </Texto>
            </View>
          ) : null}
        </View>
        {M.notaDe(m) ? (
          <Texto variante="nota" tono="cuerpo" style={{ marginTop: 3 }}>
            {M.notaDe(m)}
          </Texto>
        ) : null}
      </View>
    </Pressable>
  )
}

/** Un campo del reporte, como lo describe el método: teléfono con prefijo, cédula con V/E, banco de una lista, fecha, o texto. */
function CampoReporte({ c, rep, poner }: { c: CampoDePago; rep: Record<string, string>; poner: (k: string, v: string) => void }) {
  const v = rep[c.campo] ?? ''
  const pistas = T.reporte.pistas
  const pista = c.campo === 'tel' ? ((pistas.tel as Record<string, string>)[c.prefijo ?? ''] ?? '') : ((pistas[c.campo] as string) ?? '')
  const nota = T.reporte.notas[c.campo]
  let control: ReactNode
  if (c.tipo === 'banco') {
    control = (
      <Selector
        etiqueta={c.etiqueta}
        valor={v}
        // La primera, vacía a propósito: sin ella parecería elegido un banco que no lo está.
        opciones={[{ valor: '', texto: T.reporte.elegirBanco }, ...reglas.BANCOS.map((b) => ({ valor: b.codigo, texto: `${b.codigo} ${b.nombre}` }))]}
        onCambio={(x) => poner(c.campo, x)}
      />
    )
  } else if (c.tipo === 'fecha') {
    const f = M.partesDeFechaPago(v)
    control = (
      <Fecha
        dia={f.dia}
        mes={f.mes}
        anio={f.anio}
        meses={MESES_CORTOS}
        textos={T.reporte.fecha}
        onDia={(x) => poner(c.campo, M.fechaPagoDePartes({ ...f, dia: reglas.filtrar('dia', x) }))}
        onMes={(x) => poner(c.campo, M.fechaPagoDePartes({ ...f, mes: x }))}
        onAnio={(x) => poner(c.campo, M.fechaPagoDePartes({ ...f, anio: x.replace(/\D/g, '').slice(0, 4) }))}
      />
    )
  } else {
    const numerico = c.tipo === 'tel' || c.tipo === 'documento' || c.tipo === 'numero'
    control = (
      <View style={[estilos.envoltorio, c.tipo === 'tel' || c.conTipo ? estilos.capsulaCampo : null]}>
        {c.tipo === 'tel' ? (
          <Texto variante="rotulo" style={estilos.prefijo}>
            {c.prefijo}
          </Texto>
        ) : null}
        {c.conTipo ? (
          <View style={estilos.tipoDoc}>
            {['V', 'E'].map((t) => (
              <Pressable
                key={t}
                onPress={() => poner('doc_tipo', t)}
                accessibilityRole="radio"
                aria-checked={rep.doc_tipo === t}
                style={[estilos.letra, { backgroundColor: rep.doc_tipo === t ? color.verdeProfundo : 'transparent' }]}
              >
                <Texto variante="rotulo" style={{ color: rep.doc_tipo === t ? color.crema : color.secundario }}>
                  {t}
                </Texto>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Campo
            value={v}
            onChangeText={(x) => poner(c.campo, M.filtrar(c, x))}
            placeholder={pista}
            keyboardType={numerico ? 'number-pad' : c.campo === 'contacto' ? 'email-address' : 'default'}
            autoCapitalize={c.campo === 'titular' ? 'words' : 'none'}
            autoCorrect={false}
            accessibilityLabel={c.etiqueta}
            desnudo={c.tipo === 'tel' || !!c.conTipo}
            style={c.tipo === 'tel' || c.conTipo ? { paddingLeft: 12 } : undefined}
          />
        </View>
      </View>
    )
  }
  return (
    <View>
      <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, marginBottom: 8 }}>
        {c.etiqueta}
      </Texto>
      {control}
      {nota ? (
        <Texto variante="nota" tono="cuerpo" style={{ marginTop: 6 }}>
          {nota}
        </Texto>
      ) : null}
    </View>
  )
}

function Comprobante({ titulo, filas, pie }: { titulo: string; filas: { campo: string; valor: string; fuerte: boolean }[]; pie?: string }) {
  return (
    <View style={[estilos.caja, { marginTop: 14 }]}>
      <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 12 }}>
        {titulo}
      </Texto>
      {filas.map((f) => (
        <View key={f.campo} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tinta(0.12) }}>
          <Texto variante="cuerpoChico" style={{ flexGrow: 1, flexBasis: 130 }}>
            {f.campo}
          </Texto>
          <Texto variante="cuerpo" tono="tinta" style={{ flexGrow: 2, flexBasis: 170, fontFamily: f.fuerte ? fuente.textoSemi : fuente.textoMedia, fontVariant: ['tabular-nums'] }}>
            {f.valor}
          </Texto>
        </View>
      ))}
      {pie ? (
        <Texto variante="nota" tono="cuerpo" style={{ marginTop: 14 }}>
          {pie}
        </Texto>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 620, width: '100%', alignSelf: 'center' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: medida.toqueMinimo, alignSelf: 'flex-start', marginBottom: 22 },
  caja: { borderRadius: 26, backgroundColor: color.cremaElevada, padding: 20 },
  recuadro: { borderRadius: 26, borderWidth: 1, borderColor: tinta(0.18), padding: 20 },
  sello: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radio.capsula, marginBottom: 16 },
  prueba: { borderRadius: 22, backgroundColor: color.terracota, padding: 16, marginTop: 22 },
  copiar: { minHeight: medida.toqueMinimo, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radio.capsula, borderWidth: 1, borderColor: cremaAlfa(0.3) },
  metodo: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 66, paddingVertical: 13, paddingLeft: 15, paddingRight: 20, borderRadius: 26, borderWidth: 1 },
  aro: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pronto: { minHeight: 24, justifyContent: 'center', paddingHorizontal: 9, borderRadius: radio.capsula, backgroundColor: tinta(0.09) },
  envoltorio: { flexDirection: 'row', alignItems: 'center' },
  capsulaCampo: { borderRadius: radio.capsula, borderWidth: 1, borderColor: tinta(0.18), backgroundColor: color.cremaElevada, overflow: 'hidden' },
  prefijo: { paddingLeft: 18, paddingRight: 14, borderRightWidth: 1, borderRightColor: tinta(0.16) },
  tipoDoc: { flexDirection: 'row', borderRightWidth: 1, borderRightColor: tinta(0.16) },
  letra: { minWidth: 44, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  captura: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 72, padding: 14, borderRadius: 26, borderWidth: 1, borderStyle: 'dashed', borderColor: tinta(0.3) },
  capturaIcono: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  capsula: { flexDirection: 'row', alignItems: 'center', gap: 15, alignSelf: 'flex-start', minHeight: 58, paddingHorizontal: 25, marginTop: 22, borderRadius: radio.capsula, borderWidth: 1, borderColor: tinta(0.24) },
  paso: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  puntito: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.crema },
  numero: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: tinta(0.26), alignItems: 'center', justifyContent: 'center', marginTop: 1 },
})


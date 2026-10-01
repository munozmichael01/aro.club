import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUltimo } from '../util/useUltimo'
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import {
  AroCarga,
  Aviso,
  Barras,
  Boton,
  Marca,
  Tarjeta,
  Texto,
  Velo,
  color,
  cremaAlfa,
  medida,
  radio,
  terracotaAlfa,
  tinta,
  useVelo,
  verdeAlfa,
} from '../diseno'
import * as T from '../texto/verificacion'
import { encoger } from './foto'
import {
  atascado,
  conFoto,
  desdeServidor,
  empezar,
  falloAlSubir,
  inicial,
  pasosRevision,
  repetir,
  subida,
  subiendo,
  type Estado,
} from './maquina'
import type { crearServicioVerificacion } from './servicio'

type Servicio = ReturnType<typeof crearServicioVerificacion>

function Visto({ c = color.terracota, tam = 24 }: { c?: string; tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 40 40" fill="none">
      <Path d="M12 20.5l5 5L28 14.8" stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Encabezado({ eyebrow, titulo, bajada }: { eyebrow: string; titulo: string; bajada?: string }) {
  return (
    <View>
      <Texto variante="etiqueta" tono="terracota" style={{ marginBottom: 14 }}>
        {eyebrow}
      </Texto>
      <Texto variante="display" accessibilityRole="header">
        {titulo}
      </Texto>
      {bajada ? (
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {bajada}
        </Texto>
      ) : null}
    </View>
  )
}

export function Verificacion(p: {
  servicio: Servicio
  alCuenta: () => void
  /** A las preguntas que falten (desde «en revisión»). */
  alPreguntas?: () => void
  /** Sin sesión: a entrar, diciendo que se venía aquí. */
  alEntrar: () => void
  /** La cámara de verdad; en el catálogo de desarrollo se sustituye. */
  camara?: boolean
}) {
  const insets = useSafeAreaInsets()
  const { tapado, levantar } = useVelo()
  const [e, setE] = useState<Estado>(inicial)
  const [errorCarga, setErrorCarga] = useState('')
  const [permiso, pedirPermiso] = useCameraPermissions()
  /**
   * Mientras la foto se encoge. «Usar esta» espera a que termine: si no,
   * se podía subir la ORIGINAL (varios megas en un iPhone), que pasa del
   * límite de 4,5 MB de Vercel y no llega. Pasó en el iPhone de Michael.
   */
  const [preparando, setPreparando] = useState(false)
  const camara = useRef<CameraView>(null)
  const conCamara = p.camara !== false

  // `p` entero NO va en las dependencias: cambia cada vez que el padre se
  // pinta, y relanzaría la carga sin motivo (ver `useUltimo`).
  const alEntrar = useUltimo(p.alEntrar)
  const servicio = p.servicio
  const cargar = useCallback(async () => {
    setErrorCarga('')
    const r = await servicio.estado()
    if (r.ok) setE((s) => desdeServidor(s, r.datos))
    else if (r.status === 401) alEntrar.current()
    else setErrorCarga(r.error)
    levantar()
  }, [levantar, servicio, alEntrar])

  useEffect(() => {
    cargar()
  }, [cargar])

  // En revisión se dice cuántas preguntas faltan; mientras no se sabe, nada.
  const [faltan, setFaltan] = useState<number | null>(null)
  const enRevision = e.fase === 'revision'
  useEffect(() => {
    if (!enRevision) return
    let vivo = true
    servicio.faltan().then((n) => vivo && setFaltan(n))
    return () => {
      vivo = false
    }
  }, [enRevision, servicio])

  const hacerFoto = async () => {
    const foto = await camara.current?.takePictureAsync({ quality: 0.9 })
    if (!foto) return
    setE((s) => conFoto(s, foto.uri))
    // Se encoge ya, mientras se mira la previa: al pulsar «Usar esta» sube al momento.
    setPreparando(true)
    const chica = await encoger(foto.uri, foto.width, foto.height)
    setE((s) => (s.previa === foto.uri ? conFoto(s, chica) : s))
    setPreparando(false)
  }

  const deGaleria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (r.canceled || !r.assets[0]) return
    const a = r.assets[0]
    setE((s) => conFoto(s, a.uri))
    setPreparando(true)
    const chica = await encoger(a.uri, a.width, a.height)
    setE((s) => (s.previa === a.uri ? conFoto(s, chica) : s))
    setPreparando(false)
  }

  const usarEsta = async () => {
    if (!e.previa || e.subiendo || preparando) return
    setE(subiendo)
    const r = await p.servicio.subir(e.toma, e.previa)
    setE((s) => (r.ok ? subida(s) : falloAlSubir(s, r.error)))
  }

  if (tapado) return <Velo />

  const cabecera = (
    <View style={estilos.cabecera}>
      <View style={estilos.marca}>
        <Marca />
        <Texto variante="marca">Aro Club</Texto>
      </View>
      <Texto variante="etiqueta">{T.etiqueta[e.fase]}</Texto>
    </View>
  )

  const pagina = (hijos: React.ReactNode) => (
    <ScrollView
      style={{ backgroundColor: color.crema }}
      contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]}
    >
      {cabecera}
      {errorCarga ? (
        <View style={{ gap: 12 }}>
          <Aviso>{errorCarga}</Aviso>
          <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={cargar} />
        </View>
      ) : (
        hijos
      )}
    </ScrollView>
  )

  // --- Intro: antes de pedir nada, qué se hace con ello. ---
  if (e.fase === 'intro') {
    return pagina(
      <View>
        <Encabezado eyebrow={T.intro.eyebrow} titulo={T.intro.titulo} bajada={T.intro.bajada} />
        <View style={{ marginTop: 28 }}>
          {T.intro.explicacion.map(([clave, valor]) => (
            <View key={clave} style={estilos.fila}>
              <Texto variante="etiqueta" style={{ width: 104, paddingTop: 2 }}>
                {clave}
              </Texto>
              <Texto variante="cuerpo" tono="tinta" style={{ flex: 1 }}>
                {valor}
              </Texto>
            </View>
          ))}
        </View>
        <View style={estilos.nadie}>
          <Texto variante="subtitulo" tono="crema">
            {T.intro.nadieTitulo}
          </Texto>
          <Texto variante="cuerpoChico" tono="cuerpoSobreVerde" style={{ marginTop: 8 }}>
            {T.intro.nadieCuerpo}
          </Texto>
        </View>
        <View style={estilos.acciones}>
          <Boton texto={T.intro.empezar} onPress={() => setE(empezar)} />
          <Boton tipo="fantasma" texto={T.intro.ahoraNo} onPress={p.alCuenta} />
        </View>
      </View>,
    )
  }

  // --- En revisión ---
  if (e.fase === 'revision') {
    return pagina(
      <View>
        <View style={estilos.recibido}>
          <View style={estilos.circulo}>
            <Visto />
          </View>
          <Texto variante="etiqueta" tono="verde">
            {T.revision.recibido}
          </Texto>
        </View>
        <Texto variante="display">{T.revision.titulo}</Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.revision.bajada}
        </Texto>
        <Tarjeta style={{ marginTop: 28, gap: 16 }}>
          <Texto variante="etiquetaChica">{T.revision.mientras}</Texto>
          {pasosRevision(faltan).map((m) => (
            <View key={m.titulo} style={{ flexDirection: 'row', gap: 13 }}>
              <View style={[estilos.marquita, { backgroundColor: m.hecho ? color.verde : verdeAlfa(0.14) }]}>
                {m.hecho ? <Visto c={color.crema} tam={16} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="rotulo">{m.titulo}</Texto>
                <Texto variante="cuerpoChico" style={{ marginTop: 3 }}>
                  {m.cuerpo}
                </Texto>
              </View>
            </View>
          ))}
        </Tarjeta>
        <View style={estilos.acciones}>
          {faltan && p.alPreguntas ? <Boton texto={T.revision.responder} onPress={p.alPreguntas} /> : null}
          <Boton tipo={faltan && p.alPreguntas ? 'fantasma' : undefined} texto={T.revision.cuenta} onPress={p.alCuenta} />
        </View>
      </View>,
    )
  }

  // --- Verificada ---
  if (e.fase === 'hecha') {
    return pagina(
      <View>
        <View style={estilos.selloVerde}>
          <Texto variante="etiqueta" tono="crema">
            {T.hecha.sello}
          </Texto>
        </View>
        <Texto variante="display">{T.hecha.titulo}</Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.hecha.bajada(e.revisadaEl)}
        </Texto>
        <View style={estilos.borrado}>
          <Texto variante="rotulo">{T.hecha.tituloBorrado(e.yaBorradas, e.seBorraEl)}</Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 5 }}>
            {T.hecha.cuerpoBorrado(e.yaBorradas)}
          </Texto>
        </View>
        <View style={estilos.acciones}>
          <Boton texto={T.hecha.cuenta} onPress={p.alCuenta} />
        </View>
      </View>,
    )
  }

  // --- Rechazada: el texto sale del catálogo de motivos, nunca de la nota interna. ---
  if (e.fase === 'rechazo') {
    const reintento = !!e.motivo?.permiteReintento
    return pagina(
      <View>
        <Encabezado eyebrow={T.rechazo.titulo(reintento)} titulo={T.rechazo.encabezado(reintento)} />
        <View style={estilos.quePaso}>
          <Texto variante="etiquetaChica" tono="terracota" style={{ marginBottom: 16 }}>
            {T.rechazo.quePaso}
          </Texto>
          <Texto variante="cuerpo">{e.motivo?.mensaje ?? ''}</Texto>
        </View>
        <View style={estilos.acciones}>
          {reintento ? <Boton texto={T.rechazo.repetir} onPress={() => setE(empezar)} /> : null}
          <Boton tipo="fantasma" texto={T.rechazo.volver} onPress={p.alCuenta} />
        </View>
        <Texto variante="nota" style={{ marginTop: 20 }}>
          {T.rechazo.pie(reintento)}
        </Texto>
      </View>,
    )
  }

  // --- Captura: guía, vista previa, y «Usar esta» o «Repetir» ANTES de enviar. ---
  const c = T.capturas[e.toma]
  const selfie = e.toma === 1
  const sinPermiso = conCamara && permiso && !permiso.granted
  return pagina(
    <View>
      <View style={{ marginBottom: 26 }}>
        <Barras total={2} actual={e.toma} />
      </View>
      <Encabezado eyebrow={c.etiqueta} titulo={c.titulo} bajada={c.ayuda} />

      <View style={[estilos.visor, selfie ? estilos.visorSelfie : estilos.visorCedula]}>
        {e.previa ? (
          <Image source={{ uri: e.previa }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={T.captura.laQueHiciste} />
        ) : sinPermiso ? (
          <View style={estilos.permiso}>
            <Texto variante="rotulo" tono="crema" style={{ textAlign: 'center' }}>
              {T.permiso.titulo}
            </Texto>
            <Texto variante="cuerpoChico" tono="cuerpoSobreVerde" style={{ textAlign: 'center' }}>
              {T.permiso.cuerpo}
            </Texto>
            <Boton
              tipo="sobreVerde"
              texto={permiso?.canAskAgain ? T.permiso.pedir : T.permiso.ajustes}
              onPress={() => (permiso?.canAskAgain ? pedirPermiso() : Linking.openSettings())}
            />
          </View>
        ) : (
          <>
            {conCamara && permiso?.granted ? (
              <CameraView ref={camara} style={StyleSheet.absoluteFill} facing={selfie ? 'front' : 'back'} />
            ) : null}
            <View style={[estilos.guiaCaja, { pointerEvents: 'none' }]}>
              <View style={selfie ? estilos.guiaSelfie : estilos.guiaCedula} />
            </View>
            <Texto variante="nota" tono="crema" style={estilos.pista}>
              {c.pista}
            </Texto>
          </>
        )}
        {e.subiendo ? (
          <View style={estilos.subiendo}>
            <AroCarga tam={40} sobreVerde />
            <Texto variante="cuerpoChico" tono="crema" style={{ marginTop: 14 }}>
              {T.captura.subiendo}
            </Texto>
          </View>
        ) : null}
      </View>

      {e.fallo ? (
        <View style={{ marginTop: 16 }}>
          <Aviso>{e.fallo}</Aviso>
        </View>
      ) : null}

      {atascado(e) ? (
        <View style={estilos.atascado}>
          <Texto variante="rotulo">{T.captura.atascadoTitulo}</Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 6 }}>
            {T.captura.atascadoCuerpo}
          </Texto>
          <View style={{ marginTop: 12 }}>
            <Boton
              tipo="secundario"
              texto={T.captura.escribirnos}
              onPress={() => Linking.openURL(`mailto:hola@aro.club?subject=${encodeURIComponent(T.captura.asuntoAyuda)}`)}
            />
          </View>
        </View>
      ) : null}

      <View style={estilos.acciones}>
        {e.previa ? (
          <>
            <Boton texto={T.usarEsta} onPress={usarEsta} disabled={e.subiendo || preparando} />
            <Boton tipo="fantasma" texto={T.captura.repetir} onPress={() => setE(repetir)} disabled={e.subiendo} />
          </>
        ) : (
          <>
            <Boton texto={c.boton} onPress={hacerFoto} disabled={!conCamara || !permiso?.granted} />
            <Boton tipo="fantasma" texto={T.captura.galeria} onPress={deGaleria} />
          </>
        )}
      </View>
      <Texto variante="nota" style={{ marginTop: 18 }}>
        {c.nota}
      </Texto>
    </View>,
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 660, width: '100%', alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, minHeight: medida.toqueMinimo, marginBottom: 26 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fila: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderColor: tinta(0.13) },
  nadie: { borderRadius: radio.tarjeta, backgroundColor: color.verdeProfundo, padding: 20, marginTop: 20 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 26 },
  recibido: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 22 },
  circulo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: verdeAlfa(0.28), alignItems: 'center', justifyContent: 'center' },
  marquita: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  selloVerde: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radio.capsula, backgroundColor: color.verde, marginBottom: 16 },
  borrado: { borderRadius: radio.tarjeta, backgroundColor: color.cremaFria, padding: 20, marginTop: 26 },
  quePaso: { borderRadius: 26, borderWidth: 1, borderColor: terracotaAlfa(0.32), padding: 22, marginTop: 26 },
  visor: { marginTop: 24, borderRadius: 26, overflow: 'hidden', backgroundColor: color.verdeProfundo, alignSelf: 'center', width: '100%' },
  visorCedula: { aspectRatio: 4 / 3 },
  visorSelfie: { aspectRatio: 3 / 4, maxWidth: 420 },
  guiaCaja: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  guiaCedula: { width: '82%', aspectRatio: 1.586, borderWidth: 2, borderStyle: 'dashed', borderColor: cremaAlfa(0.5), borderRadius: 14 },
  guiaSelfie: { width: '55%', aspectRatio: 3 / 4, borderWidth: 2, borderStyle: 'dashed', borderColor: cremaAlfa(0.5), borderRadius: 999 },
  pista: { position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', paddingHorizontal: 20 },
  permiso: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  subiendo: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: tinta(0.82) },
  atascado: { borderRadius: 26, borderWidth: 1, borderColor: tinta(0.18), padding: 20, marginTop: 14 },
})

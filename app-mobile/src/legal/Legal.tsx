import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Boton, Entra, Esqueleto, Hueso, HuesoForma, IconoAtras, Marca, SinRespuesta, Tarda, Texto, fuente, useTarda, useUmbral } from '../diseno'
import * as T from '../texto/legal'
import * as M from './maquina'

/**
 * Reglas, Términos y Privacidad DENTRO de la app (Michael, 18-10), calcados
 * de `Aro Club - Legal.dc.html`: una página con las tres secciones, y `doc`
 * dice en cuál se abre. El texto es el de `/api/legal`, sin copia aquí.
 */
export function Legal(p: { doc: M.Doc | null; cargar: () => Promise<M.DeServidor | null>; alVolver: () => void }) {
  const insets = useSafeAreaInsets()
  const [d, setD] = useState<M.DeServidor | null>(null)
  const [fallo, setFallo] = useState(false)
  const [reintentando, setReintentando] = useState(false)
  const scroll = useRef<ScrollView>(null)
  const ys = useRef<Partial<Record<M.Doc, number>>>({})
  const colocado = useRef(false)

  const leer = useCallback(async () => {
    setFallo(false)
    const r = await p.cargar().catch(() => null)
    if (r) setD(r)
    else setFallo(true)
  }, [p])
  useEffect(() => {
    leer()
  }, [leer])
  const reintentar = async () => {
    setReintentando(true)
    await leer()
    setReintentando(false)
  }

  // Entrega carga (03-11): nada los primeros 0,4 s; luego el esqueleto, y a los 8 s «Está tardando…».
  const esperando = !d && !fallo
  const esqueleto = useUmbral(esperando)
  const tarda = useTarda(esperando)

  // Se coloca en su sección cuando ya se midió, una sola vez.
  const medida = (k: M.Doc, y: number) => {
    ys.current[k] = y
    if (!colocado.current && p.doc === k) {
      colocado.current = true
      setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: false }), 0)
    }
  }
  const ir = (k: M.Doc) => {
    const y = ys.current[k]
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })
  }

  const cabeza = (
    <View style={[e.barra, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={p.alVolver} accessibilityRole="button" accessibilityLabel={T.volver} hitSlop={8} style={e.atras}>
        <IconoAtras tam={20} color={C.tinta} />
      </Pressable>
      <Marca />
      <Texto style={serif(21, 1)}>Aro Club</Texto>
    </View>
  )

  if (!d || esqueleto) {
    return (
      <View style={{ flex: 1, backgroundColor: C.crema }}>
        {cabeza}
        {fallo && !esqueleto ? (
          // `cargar` no dice si fue la red o el servidor: la frase de la red, que es la que pide algo a la persona.
          <View style={e.centro}>
            <View style={{ alignSelf: 'stretch' }}>
              <SinRespuesta que={T.que} alReintentar={reintentar} reintentando={reintentando} />
            </View>
          </View>
        ) : esqueleto ? (
          <EsqueletoLegal tarda={tarda ? <Tarda alReintentar={reintentar} /> : null} />
        ) : null}
      </View>
    )
  }

  const S = d.secciones
  return (
    <View style={{ flex: 1, backgroundColor: C.crema }}>
      {cabeza}
      <View style={e.indice}>
        {M.DOCS.map((k) => (
          <Pressable key={k} onPress={() => ir(k)} accessibilityRole="link" style={e.pastilla}>
            <Texto style={[media(13), { color: C.cuerpo }]}>{T.indice[k]}</Texto>
          </Pressable>
        ))}
      </View>
      {/* El fundido envuelve el ScrollView, no su contenido: las secciones miden su `y` dentro de él. */}
      <Entra estilo={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={[e.pagina, { paddingBottom: insets.bottom + 48 }]}>
        <Texto accessibilityRole="header" style={serif(32, 1.02, -0.035)}>
          {d.cabecera.titulo}
        </Texto>
        <Texto style={[texto(17, 1.6), { color: C.bajada, marginTop: 16 }]}>{d.cabecera.bajada}</Texto>
        <Texto style={[texto(14, 1.6), { color: C.nota, marginTop: 20 }]}>{d.cabecera.actualizado}</Texto>

        {/* 01 · Reglas de la mesa */}
        <View onLayout={(ev) => medida('reglas', ev.nativeEvent.layout.y)} style={e.seccion}>
          <Encabezado s={S.reglas} />
          <View style={{ gap: 10, marginTop: 26 }}>
            {d.reglas.map((r, i) => (
              <View key={r.titulo} style={e.regla}>
                <View style={e.n}>
                  <Texto style={[semi(13), { color: C.crema }]}>{i + 1}</Texto>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto style={serif(19, 1.15, -0.02)}>{r.titulo}</Texto>
                  <Texto style={[texto(15, 1.6), { color: C.bajada, marginTop: 7 }]}>{r.cuerpo}</Texto>
                </View>
              </View>
            ))}
          </View>
          <View style={e.mesa}>
            <Texto style={[serif(19, 1.15, -0.02), { color: C.terracota }]}>{d.mesa.titulo}</Texto>
            <Texto style={[texto(15, 1.6), { color: C.bajada, marginTop: 8 }]}>
              <Texto style={[semi(15, 1.6), { color: C.cuerpoFuerte }]}>{d.mesa.fuerte}</Texto> {d.mesa.cuerpo}
            </Texto>
          </View>
        </View>

        {/* 02 · Términos */}
        <View onLayout={(ev) => medida('terminos', ev.nativeEvent.layout.y)} style={e.seccion}>
          <Encabezado s={S.terminos} />
          <View style={{ marginTop: 26 }}>
            {d.terminos.map((t, i) => (
              <View key={t.titulo} style={e.punto}>
                <Texto style={[semi(12), { letterSpacing: 1.2, color: C.terracota, marginBottom: 11 }]}>{M.numero(i)}</Texto>
                <Texto style={serif(20, 1.15, -0.02)}>{t.titulo}</Texto>
                <Texto style={[texto(15, 1.65), { color: C.bajada, marginTop: 9 }]}>{t.cuerpo}</Texto>
              </View>
            ))}
          </View>
        </View>

        {/* 03 · Privacidad */}
        <View onLayout={(ev) => medida('privacidad', ev.nativeEvent.layout.y)} style={e.seccion}>
          <Encabezado s={S.privacidad} />
          <View style={e.nunca}>
            <Texto style={[media(11), { letterSpacing: 1.54, color: C.secundarioVerde, marginBottom: 18 }]}>{d.nuncaTitulo}</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
              {d.nunca.map((n) => (
                <View key={n} style={e.chip}>
                  <Texto style={[media(14), { color: C.crema }]}>{n}</Texto>
                </View>
              ))}
            </View>
            <Texto style={[texto(15, 1.6), { color: C.cuerpoVerde, marginTop: 20 }]}>{d.nuncaNota}</Texto>
          </View>
          <View style={{ marginTop: 20 }}>
            {d.datos.map((x) => (
              <View key={x.dato} style={e.dato}>
                <Texto style={[semi(15, 1.4), { color: C.tinta }]}>{x.dato}</Texto>
                <Texto style={[texto(14, 1.55), { color: C.bajada }]}>{x.para}</Texto>
                <Texto style={[media(13), { color: C.terracota }]}>{x.plazo}</Texto>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 26 }}>
            {d.privacidad.map((x) => (
              <View key={x.titulo} style={e.punto}>
                <Texto style={serif(20, 1.15, -0.02)}>{x.titulo}</Texto>
                <Texto style={[texto(15, 1.65), { color: C.bajada, marginTop: 9 }]}>{x.cuerpo}</Texto>
              </View>
            ))}
          </View>
          <View style={e.derechos}>
            <Texto style={serif(21, 1.15, -0.02)}>{d.derechos.titulo}</Texto>
            <Texto style={[texto(15, 1.65), { color: C.bajada, marginTop: 10 }]}>{d.derechos.cuerpo}</Texto>
            <View style={{ marginTop: 18, alignSelf: 'flex-start' }}>
              <Boton texto={d.derechos.correo} onPress={() => Linking.openURL(`mailto:${d.derechos.correo}`)} />
            </View>
          </View>
        </View>

        <View style={e.pie}>
          <Texto style={[texto(14, 1.65), { color: C.nota }]}>{d.pie}</Texto>
        </View>
      </ScrollView>
      </Entra>
    </View>
  )
}

/**
 * El esqueleto de Legal (entrega carga, 03-11): el índice de las tres
 * secciones es fijo y va real; el titular, la bajada y las reglas vienen de
 * `/api/legal` y van en hueso, con la medida de cada línea.
 */
function EsqueletoLegal({ tarda }: { tarda?: ReactNode }) {
  return (
    <>
      <View style={e.indice}>
        {M.DOCS.map((k) => (
          <View key={k} style={e.pastilla}>
            <Texto style={[media(13), { color: C.cuerpo }]}>{T.indice[k]}</Texto>
          </View>
        ))}
      </View>
      <ScrollView contentContainerStyle={e.pagina}>
        <Esqueleto etiqueta={T.cargando}>
          {tarda}
          <HuesoForma alto={24} ancho="80%" estilo={{ marginVertical: 4 }} />
          <HuesoForma alto={24} ancho="50%" estilo={{ marginVertical: 4 }} />
          <Hueso variante="cuerpoGrande" lineas={3} ultima="60%" estilo={{ marginTop: 16 }} />
          <View style={e.seccion}>
            <HuesoForma alto={8} ancho={120} estilo={{ marginVertical: 3 }} />
            <HuesoForma alto={21} ancho="70%" estilo={{ marginTop: 16, marginBottom: 4 }} />
            <View style={{ gap: 10, marginTop: 26 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={e.regla}>
                  <HuesoForma alto={30} redondo estilo={{ marginTop: 2 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <HuesoForma alto={14} ancho="60%" estilo={{ marginVertical: 4 }} />
                    <Hueso variante="cuerpo" lineas={2} ultima="70%" estilo={{ marginTop: 7 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Esqueleto>
      </ScrollView>
    </>
  )
}

function Encabezado({ s }: { s: M.Seccion }) {
  return (
    <>
      <Texto style={[media(11), { letterSpacing: 1.76, color: C.terracota }]}>{s.cinta}</Texto>
      <Texto accessibilityRole="header" style={[serif(28, 1.1, -0.03), { marginTop: 12 }]}>
        {s.titulo}
      </Texto>
      {s.intro ? <Texto style={[texto(16, 1.6), { color: C.bajada, marginTop: 12 }]}>{s.intro}</Texto> : null}
    </>
  )
}

// --- Estilos: los de la web, tal cual ---------------------------------------------

const C = {
  tinta: '#14342A',
  crema: '#FAF3E4',
  hoja: '#FFFBF0',
  verde: '#1B5138',
  bajada: '#456352',
  nota: '#566A5D',
  cuerpo: '#33513F',
  cuerpoFuerte: '#2C4A38',
  terracota: '#8F4515',
  cuerpoVerde: '#C5D8CA',
  secundarioVerde: '#9CBBA6',
}

/** Interlineado con el suelo de cada fuente (Young Serif 1,42; Inter Tight 1,21), que recorta tildes por debajo. */
const lh = (tam: number, alto: number, suelo: number) => Math.round(tam * Math.max(alto, suelo))
const serif = (tam: number, alto: number, tracking = 0): TextStyle => ({ fontFamily: fuente.titular, fontSize: tam, lineHeight: lh(tam, alto, 1.42), letterSpacing: tam * tracking, color: C.tinta })
const texto = (tam: number, alto: number): TextStyle => ({ fontFamily: fuente.texto, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })
const media = (tam: number): TextStyle => ({ fontFamily: fuente.textoMedia, fontSize: tam, lineHeight: lh(tam, 1, 1.21) })
const semi = (tam: number, alto = 1): TextStyle => ({ fontFamily: fuente.textoSemi, fontSize: tam, lineHeight: lh(tam, alto, 1.21) })

const e = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.crema },
  atras: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  indice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(20,52,42,.1)' },
  pastilla: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,52,42,.16)', justifyContent: 'center' },
  pagina: { paddingHorizontal: 16, paddingTop: 30, maxWidth: 820, width: '100%', alignSelf: 'center' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  seccion: { marginTop: 48 },
  regla: { flexDirection: 'row', gap: 15, alignItems: 'flex-start', borderRadius: 22, backgroundColor: C.hoja, padding: 18 },
  n: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.verde, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  mesa: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(143,69,21,.3)', padding: 18, marginTop: 14 },
  punto: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(20,52,42,.13)' },
  nunca: { borderRadius: 22, backgroundColor: C.tinta, padding: 22, marginTop: 26 },
  chip: { minHeight: 40, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(250,243,228,.28)', justifyContent: 'center' },
  dato: { gap: 6, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(20,52,42,.13)' },
  derechos: { borderRadius: 22, backgroundColor: C.hoja, padding: 22, marginTop: 26 },
  pie: { marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(20,52,42,.13)' },
})

import { useKeepAwake } from 'expo-keep-awake'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconoAtras, IconoCruz, Marca, Texto, fuente } from '../diseno'
import { reglas } from '../reglas'
import * as T from '../texto/juego'
import * as G from './guardado'
import * as M from './maquina'

/**
 * El juego de la mesa, calcado de la entrega 20 (4g reglas, 4h pregunta, 4e
 * fin de la ronda 1, 4j antes de la ronda 3, 4k final), todo sobre verde
 * profundo. La pantalla no se apaga mientras está abierto: el teléfono pasa
 * minutos sin tocarse mientras todos responden.
 *
 * Cada paso se guarda por mesa en este teléfono (`guardado.ts`). La X vuelve
 * a Mi mesa sin confirmar y guarda dónde quedó.
 */
export function Juego(p: {
  mesaId: string
  /** Cómo se entra desde Mi mesa: «empezar», «seguir» o «ronda-N». */
  ir?: string
  alSalir: () => void
  /** Solo el catálogo: abre en este estado, sin leer ni guardar. */
  desde?: M.Guardado
}) {
  useKeepAwake()
  const insets = useSafeAreaInsets()
  const [g, setG] = useState<M.Guardado | null>(null)
  const scroll = useRef<ScrollView>(null)

  useEffect(() => {
    if (p.desde) return setG(p.desde)
    let vivo = true
    G.cargar(p.mesaId).then((leido) => {
      if (!vivo) return
      const g2 = M.entrar(leido, p.ir)
      setG(g2)
      G.guardar(p.mesaId, g2)
    })
    return () => {
      vivo = false
    }
  }, [p.mesaId, p.ir, p.desde])

  const a = (nuevo: M.Guardado) => {
    setG(nuevo)
    if (!p.desde) G.guardar(p.mesaId, nuevo)
    scroll.current?.scrollTo({ y: 0, animated: false })
  }

  if (!g) return <View style={{ flex: 1, backgroundColor: C.fondo }} />
  const { e } = g
  const total = M.RONDAS()
  const ronda = reglas.JUEGO.rondas[e.ronda]

  let cabecera: string | null = null
  let cuerpo: ReactNode = null

  if (e.paso === 'reglas') {
    cabecera = T.juego.reglas.sub
    cuerpo = (
      <>
        <Texto style={[s.serif(36, 1.05, -0.025), { marginTop: 28 }]} accessibilityRole="header">
          {T.juego.reglas.titulo}
        </Texto>
        <View style={{ marginTop: 18 }}>
          {reglas.JUEGO.reglas.map((r, i) => (
            <View key={i} style={s.filaRegla}>
              <Texto style={[s.serif(20, 1.2), { color: C.acento, width: 30 }]}>{i + 1}</Texto>
              <Texto style={[s.texto(18, 1.4), { flex: 1, color: C.crema }]}>{r}</Texto>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 'auto', paddingTop: 24, gap: 10 }}>
          <BotonCrema texto={T.juego.reglas.empezar} onPress={() => a(M.siguiente(g, p.mesaId))} />
          <View style={s.relevo}>
            <Texto style={[s.texto(14, 1.21), { color: C.cuerpo }]}>{T.juego.reglas.yaEmpezaron}</Texto>
            {reglas.JUEGO.rondas.slice(1).map((_, i) => (
              <Pressable key={i} onPress={() => a(M.irARonda(g, i + 1))} accessibilityRole="button" style={({ pressed }) => [s.pildora, pressed && { backgroundColor: 'rgba(250,243,228,.12)' }]}>
                <Texto style={[s.semi(14), { color: C.crema }]}>{T.juego.reglas.ronda(i + 2)}</Texto>
              </Pressable>
            ))}
          </View>
        </View>
      </>
    )
  } else if (e.paso === 'pregunta') {
    const lista = M.preguntas(p.mesaId, e.ronda)
    cabecera = T.juego.pregunta.sub(e.ronda + 1, ronda?.titulo ?? '')
    cuerpo = (
      <>
        <View style={{ marginTop: 22, flexDirection: 'row', gap: 6 }}>
          {lista.map((_, k) => (
            <View key={k} style={[s.segmento, { backgroundColor: k <= e.indice ? C.acento : 'rgba(250,243,228,.2)' }]} />
          ))}
        </View>
        <Texto style={[s.semi(12), { marginTop: 8, color: C.secundario }]}>{T.juego.pregunta.posicion(e.indice + 1, lista.length)}</Texto>
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
          <Texto style={s.serif(42, 1.08, -0.025)} accessibilityRole="header">
            {lista[e.indice] ?? ''}
          </Texto>
        </View>
        <Texto style={[s.texto(15, 1.4), { color: C.cuerpo, marginBottom: 16 }]}>{T.juego.pregunta.pista}</Texto>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => a(M.atras(g, p.mesaId))}
            accessibilityRole="button"
            accessibilityLabel={T.juego.pregunta.anterior}
            style={({ pressed }) => [s.atras, pressed && { borderColor: C.crema }]}
          >
            <IconoAtras tam={22} color={C.crema} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <BotonCrema texto={T.juego.pregunta.siguiente} onPress={() => a(M.siguiente(g, p.mesaId))} />
          </View>
        </View>
      </>
    )
  } else if (e.paso === 'finRonda1') {
    // 4e: sin cabecera ni X. Volver a la mesa es lo normal.
    cuerpo = (
      <>
        <Texto style={[s.etiqueta, { color: C.secundario, marginTop: 6 }]}>{T.juego.finRonda1.sello(total).toUpperCase()}</Texto>
        <View style={{ marginVertical: 'auto', paddingVertical: 28, gap: 18 }}>
          <Texto style={s.serif(44, 1.04, -0.03)} accessibilityRole="header">
            {T.juego.finRonda1.titulo}
          </Texto>
          <Texto style={[s.texto(18, 1.5), { color: C.cuerpo }]}>{T.juego.finRonda1.texto}</Texto>
        </View>
        <View style={{ gap: 10 }}>
          <Texto style={s.lector}>{T.juego.lector(2)}</Texto>
          <BotonAcento
            texto={T.juego.finRonda1.volver}
            onPress={() => {
              G.pedirPasoAPaso()
              p.alSalir()
            }}
          />
          <Enlace texto={T.juego.finRonda1.seguir} onPress={() => a(M.seguirCon(g, 1))} />
        </View>
      </>
    )
  } else if (e.paso === 'pausa') {
    cabecera = T.juego.pausa.sub(e.ronda)
    cuerpo = (
      <>
        <View style={{ marginTop: 'auto', paddingTop: 28, gap: 14 }}>
          <Texto style={[s.etiqueta, { color: C.acento }]}>{T.juego.pausa.eyebrow(e.ronda + 1, total).toUpperCase()}</Texto>
          <Texto style={s.serif(40, 1.05, -0.025)} accessibilityRole="header">
            {ronda?.titulo ?? ''}
          </Texto>
          <Texto style={[s.texto(18, 1.45), { color: C.cuerpoClaro }]}>{T.juego.pausa.aviso}</Texto>
        </View>
        <View style={{ marginTop: 'auto', paddingTop: 28, gap: 14 }}>
          <Texto style={s.lector}>{T.juego.lector(e.ronda + 1)}</Texto>
          <BotonCrema texto={T.juego.pausa.seguir(e.ronda + 1)} onPress={() => a(M.seguirCon(g, e.ronda))} />
          <Enlace texto={T.juego.pausa.terminar} onPress={() => a(M.terminar(g))} />
        </View>
      </>
    )
  } else {
    cabecera = T.juego.final.sub(M.jugadas(g))
    cuerpo = (
      <>
        <View style={{ flex: 1, justifyContent: 'center', gap: 26, paddingVertical: 28 }}>
          <Marca tam={84} crema />
          <Texto style={s.serif(48, 1.02, -0.035)} accessibilityRole="header">
            {T.juego.final.titulo} <Texto style={[s.serif(48, 1.02, -0.035), { color: C.acento }]}>{T.juego.final.resto}</Texto>
          </Texto>
          <Texto style={[s.texto(19, 1.4), { color: C.cuerpoClaro }]}>{T.juego.final.guardar}</Texto>
        </View>
        <BotonCrema texto={T.juego.final.volver} onPress={p.alSalir} />
      </>
    )
  }

  const conCabecera = e.paso !== 'finRonda1'
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scroll}
        bounces={false}
        contentContainerStyle={[
          s.pagina,
          e.paso === 'finRonda1'
            ? { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 26 }
            : { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {conCabecera ? (
          <View style={s.cabecera}>
            <View style={{ flex: 1, gap: 5 }}>
              <Texto style={[s.etiqueta, { color: C.secundario }]}>{T.juego.nombre.toUpperCase()}</Texto>
              {cabecera ? <Texto style={[s.media(14), { color: C.cuerpoClaro }]}>{cabecera}</Texto> : null}
            </View>
            <Pressable
              onPress={p.alSalir}
              accessibilityRole="button"
              accessibilityLabel={T.juego.salir}
              style={({ pressed }) => [s.cerrar, pressed && { backgroundColor: 'rgba(250,243,228,.12)' }]}
            >
              <IconoCruz tam={18} color={C.crema} />
            </Pressable>
          </View>
        ) : null}
        {cuerpo}
      </ScrollView>
    </View>
  )
}

function BotonCrema({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.boton, { minHeight: 56, backgroundColor: pressed ? C.acento : C.crema }]}>
      <Texto style={[s.semi(17), { color: C.fondo }]}>{texto}</Texto>
    </Pressable>
  )
}

function BotonAcento({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.boton, { minHeight: 54, backgroundColor: C.acento, opacity: pressed ? 0.85 : 1 }]}>
      <Texto style={[s.semi(16), { color: C.fondo }]}>{texto}</Texto>
    </Pressable>
  )
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Texto style={[s.semi(15), { color: C.crema, textDecorationLine: 'underline' }]}>{texto}</Texto>
    </Pressable>
  )
}

/** Los tonos de la maqueta, tal cual (entrega 20). */
const C = {
  fondo: '#14342A',
  crema: '#FAF3E4',
  acento: '#E39C63',
  secundario: '#9CBBA6',
  cuerpo: '#C5D8CA',
  cuerpoClaro: '#E4EDE6',
}

/**
 * Interlineados: los de la maqueta, salvo donde caen por debajo del suelo
 * medido en los TTF (Young Serif 1,42; Inter Tight 1,21). Por debajo, React
 * Native recorta tildes y ascendentes; ahí manda el suelo.
 */
const lh = (tam: number, alto: number, suelo: number) => Math.round(tam * Math.max(alto, suelo))
const s = {
  ...StyleSheet.create({
    pagina: { flexGrow: 1, paddingHorizontal: 24, maxWidth: 440, width: '100%', alignSelf: 'center' },
    cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cerrar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(250,243,228,.35)', alignItems: 'center', justifyContent: 'center' },
    etiqueta: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.76 },
    filaRegla: { flexDirection: 'row', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(250,243,228,.15)' },
    relevo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 },
    pildora: { minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(250,243,228,.35)', justifyContent: 'center' },
    segmento: { flex: 1, height: 4, borderRadius: 9 },
    atras: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(250,243,228,.45)', alignItems: 'center', justifyContent: 'center' },
    boton: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    lector: { borderTopWidth: 1, borderTopColor: 'rgba(250,243,228,.18)', paddingTop: 14, fontFamily: fuente.texto, fontSize: 15, lineHeight: 22, color: '#C5D8CA' },
  }),
  serif: (tam: number, alto: number, tracking = 0): TextStyle => ({ fontFamily: fuente.titular, fontSize: tam, lineHeight: lh(tam, alto, 1.42), letterSpacing: tam * tracking, color: '#FAF3E4' }),
  texto: (tam: number, alto: number): TextStyle => ({ fontFamily: fuente.texto, fontSize: tam, lineHeight: lh(tam, alto, 1.21) }),
  media: (tam: number): TextStyle => ({ fontFamily: fuente.textoMedia, fontSize: tam, lineHeight: lh(tam, 1.2, 1.21) }),
  semi: (tam: number): TextStyle => ({ fontFamily: fuente.textoSemi, fontSize: tam, lineHeight: lh(tam, 1, 1.21) }),
}

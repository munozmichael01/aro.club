import AsyncStorage from '@react-native-async-storage/async-storage'
import { useKeepAwake } from 'expo-keep-awake'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconoAtras, IconoCruz, Marca, Texto, color, cremaAlfa, fuente } from '../diseno'
import { reglas } from '../reglas'
import * as T from '../texto/juego'
import * as M from './maquina'

/**
 * El juego de la mesa (entrega 18, 1d–1g): reglas, pregunta, cambio de ronda
 * y final, todo sobre verde profundo (crema sobre #14342A da 12:1, se lee en
 * penumbra). La pantalla no se apaga mientras está abierto: el teléfono pasa
 * minutos sin tocarse mientras todos responden.
 *
 * Cada teléfono recuerda la última ronda vista: al volver a abrir a mitad de
 * juego, retoma ahí. Si lo terminó, vuelve a empezar desde las reglas.
 */
const CLAVE = (mesa: string) => `aro.juego.${mesa}`

export function Juego(p: { mesaId: string; alSalir: () => void; /** Solo el catálogo: abre en este paso. */ desde?: M.Estado }) {
  useKeepAwake()
  const insets = useSafeAreaInsets()
  const [e, setE] = useState<M.Estado | null>(null)

  useEffect(() => {
    if (p.desde) return setE(p.desde)
    AsyncStorage.getItem(CLAVE(p.mesaId))
      .catch(() => null)
      .then((v) => setE(M.empezarEn(Number(v) || 0)))
  }, [p.mesaId, p.desde])

  const ir = (s: M.Estado) => {
    setE(s)
    if (s.paso === 'pregunta') AsyncStorage.setItem(CLAVE(p.mesaId), String(s.ronda)).catch(() => {})
    // Terminado, se olvida: al reabrirlo empieza en las reglas (con sus atajos
    // a cada ronda). Recordar la ronda 3 dejaba atrapado en su pausa, que no
    // tiene «atrás» (Michael, 07-10-2026). Retomar sirve solo a mitad de juego.
    if (s.paso === 'final') AsyncStorage.removeItem(CLAVE(p.mesaId)).catch(() => {})
  }

  if (!e) return <View style={{ flex: 1, backgroundColor: color.verdeProfundo }} />
  const v = M.vista(e, p.mesaId)
  const total = v.ronda.total

  let cabecera = T.juego.nombre
  let sub = T.juego.reglas.sub
  let cuerpo: ReactNode = null

  if (e.paso === 'reglas') {
    cuerpo = (
      <>
        <View style={estilos.centro}>
          <Texto style={estilos.grande}>{T.juego.reglas.titulo}</Texto>
          <View style={{ gap: 18, marginTop: 28 }}>
            {v.reglas.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
                <Texto style={estilos.numero}>{i + 1}</Texto>
                <Texto style={[estilos.regla, { flex: 1 }]}>{r}</Texto>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: 14 }}>
          <BotonClaro texto={T.juego.reglas.empezar} onPress={() => ir(M.siguiente(e, p.mesaId))} />
          <View style={estilos.relevo}>
            <Texto style={estilos.relevoTexto}>{T.juego.reglas.yaEmpezaron}</Texto>
            {reglas.JUEGO.rondas.slice(1).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 ? <Texto style={estilos.relevoTexto}>·</Texto> : null}
                <Pressable onPress={() => ir(M.empezarEn(i + 1))} accessibilityRole="button" style={estilos.enlace}>
                  <Texto style={estilos.enlaceTexto}>{T.juego.reglas.ronda(i + 2)}</Texto>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </>
    )
  } else if (e.paso === 'pregunta') {
    cabecera = T.juego.pregunta.cabecera(v.ronda.numero, v.ronda.titulo)
    sub = T.juego.pregunta.posicion(v.posicion.actual, v.posicion.total)
    cuerpo = (
      <>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 22 }}>
          {Array.from({ length: v.posicion.total }, (_, k) => (
            <View key={k} style={[estilos.segmento, { backgroundColor: k < v.posicion.actual ? color.crema : cremaAlfa(0.22) }]} />
          ))}
        </View>
        <View style={[estilos.centro, { justifyContent: 'center' }]}>
          <Texto style={estilos.pregunta} accessibilityRole="header">
            {v.pregunta}
          </Texto>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => ir(M.atras(e, p.mesaId))} accessibilityRole="button" accessibilityLabel={T.juego.pregunta.anterior} style={({ pressed }) => [estilos.atras, pressed && { borderColor: color.crema }]}>
            <IconoAtras color={color.crema} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <BotonClaro texto={T.juego.pregunta.siguiente} onPress={() => ir(M.siguiente(e, p.mesaId))} />
          </View>
        </View>
      </>
    )
  } else if (e.paso === 'cambio') {
    sub = T.juego.cambio.sub(e.ronda)
    cuerpo = (
      <>
        <View style={[estilos.centro, { gap: 20 }]}>
          <Texto style={estilos.eyebrow}>{T.juego.cambio.eyebrow(v.ronda.numero, total).toUpperCase()}</Texto>
          <Texto style={estilos.enorme}>{v.ronda.titulo}</Texto>
          <Texto style={estilos.bajada}>{v.ronda.bajada}</Texto>
          {v.opcional ? <Texto style={estilos.bajada}>{T.juego.cambio.aviso}</Texto> : null}
        </View>
        <View style={{ gap: 16 }}>
          <Texto style={estilos.lector}>{T.juego.cambio.lector(v.ronda.numero)}</Texto>
          <BotonClaro
            texto={v.opcional ? T.juego.cambio.seguir(v.ronda.numero) : T.juego.cambio.boton(v.ronda.numero)}
            onPress={() => ir(M.siguiente(e, p.mesaId))}
          />
          {v.opcional ? (
            <Pressable onPress={() => ir(M.terminar(e))} accessibilityRole="button" style={({ pressed }) => [estilos.volver, pressed && { borderColor: color.crema }]}>
              <Texto style={estilos.volverTexto}>{T.juego.cambio.terminar}</Texto>
            </Pressable>
          ) : null}
        </View>
      </>
    )
  } else {
    sub = T.juego.final.sub(v.jugadas)
    cuerpo = (
      <>
        <View style={[estilos.centro, { gap: 28 }]}>
          <Marca tam={88} crema />
          <Texto style={estilos.enorme}>
            {T.juego.final.titulo} <Texto style={[estilos.enorme, { color: color.terracotaSobreVerde }]}>{T.juego.final.resto}</Texto>
          </Texto>
          <Texto style={estilos.bajada}>{T.juego.final.guardar}</Texto>
        </View>
        <Pressable onPress={p.alSalir} accessibilityRole="button" style={({ pressed }) => [estilos.volver, pressed && { borderColor: color.crema }]}>
          <Texto style={estilos.volverTexto}>{T.juego.final.volver}</Texto>
        </Pressable>
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.verdeProfundo }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 30 }]} bounces={false}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1, gap: 6 }}>
            <Texto style={estilos.cab}>{cabecera.toUpperCase()}</Texto>
            <Texto style={estilos.sub}>{sub.toUpperCase()}</Texto>
          </View>
          <Pressable onPress={p.alSalir} accessibilityRole="button" accessibilityLabel={T.juego.salir} style={({ pressed }) => [estilos.cerrar, pressed && { backgroundColor: cremaAlfa(0.18) }]}>
            <IconoCruz tam={18} color={color.crema} />
          </Pressable>
        </View>
        {cuerpo}
      </ScrollView>
    </View>
  )
}

function BotonClaro({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [estilos.claro, pressed && { backgroundColor: color.terracotaSobreVerde }]}>
      <Texto style={estilos.claroTexto}>{texto}</Texto>
    </Pressable>
  )
}

// Interlineados: el suelo medido en los TTF (Young Serif 1,42; Inter Tight 1,21), nunca por debajo.
const estilos = StyleSheet.create({
  pagina: { flexGrow: 1, paddingHorizontal: 24, maxWidth: 430, width: '100%', alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  cab: { fontFamily: fuente.textoNegrita, fontSize: 12, lineHeight: 15, letterSpacing: 1.7, color: color.terracotaSobreVerde },
  sub: { fontFamily: fuente.textoSemi, fontSize: 13, lineHeight: 16, letterSpacing: 1.6, color: color.cuerpoSobreVerde },
  cerrar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cremaAlfa(0.1), alignItems: 'center', justifyContent: 'center' },
  centro: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
  grande: { fontFamily: fuente.titular, fontSize: 44, lineHeight: 63, letterSpacing: -1.3, color: color.crema },
  enorme: { fontFamily: fuente.titular, fontSize: 50, lineHeight: 71, letterSpacing: -1.75, color: color.crema },
  numero: { fontFamily: fuente.titular, fontSize: 20, lineHeight: 29, width: 18, color: color.terracotaSobreVerde },
  regla: { fontFamily: fuente.texto, fontSize: 20, lineHeight: 27, color: color.crema },
  pregunta: { fontFamily: fuente.titular, fontSize: 42, lineHeight: 60, letterSpacing: -1.05, color: color.crema },
  segmento: { flex: 1, height: 4, borderRadius: 999 },
  eyebrow: { fontFamily: fuente.textoNegrita, fontSize: 13, lineHeight: 16, letterSpacing: 1.8, color: color.terracotaSobreVerde },
  bajada: { fontFamily: fuente.texto, fontSize: 20, lineHeight: 28, color: '#E4EDE6' },
  lector: { borderTopWidth: 1, borderTopColor: cremaAlfa(0.18), paddingTop: 16, fontFamily: fuente.texto, fontSize: 15, lineHeight: 22, color: color.cuerpoSobreVerde },
  relevo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  relevoTexto: { fontFamily: fuente.textoMedia, fontSize: 15, lineHeight: 19, color: color.cuerpoSobreVerde },
  enlace: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  enlaceTexto: { fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19, color: color.crema, textDecorationLine: 'underline' },
  claro: { minHeight: 58, borderRadius: 999, backgroundColor: color.crema, alignItems: 'center', justifyContent: 'center' },
  claroTexto: { fontFamily: fuente.textoSemi, fontSize: 17, lineHeight: 21, color: color.verdeProfundo },
  atras: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: cremaAlfa(0.45), alignItems: 'center', justifyContent: 'center' },
  volver: { minHeight: 52, borderRadius: 999, borderWidth: 1.5, borderColor: cremaAlfa(0.45), alignItems: 'center', justifyContent: 'center' },
  volverTexto: { fontFamily: fuente.textoSemi, fontSize: 16, lineHeight: 20, color: color.crema },
})

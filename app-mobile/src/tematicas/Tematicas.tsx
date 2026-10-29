import AsyncStorage from '@react-native-async-storage/async-storage'
import { useKeepAwake } from 'expo-keep-awake'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'

import { IconoAtras, IconoCheck, IconoCruz, Texto, color, fuente, radio } from '../diseno'
import * as T from '../texto/tematicas'
import * as M from './maquina'

export type Vista = { en: 'elegir' } | { en: 'portada'; i: number } | { en: 'pregunta'; i: number; k: number } | { en: 'final'; i: number } | { en: 'conversar' }

/**
 * El juego por temáticas (entrega tematicas, 29-10): elegir, portada,
 * pregunta, final y «Ahora, a conversar». Pantalla siempre encendida, y la
 * memoria por mesa en este teléfono.
 */
export function JuegoTematicas(p: { mesaId: string; tematicas: M.Tematica[]; alSalir: () => void; inicial?: M.Memoria; tema?: number | null; vista?: Vista }) {
  useKeepAwake()
  const insets = useSafeAreaInsets()
  const [m, setM] = useState<M.Memoria>(p.inicial ?? M.vacia())
  // Desde la tarjeta de Mi mesa se puede entrar directo a la portada de una temática.
  const [v, setV] = useState<Vista>(p.vista ?? (p.tema != null && p.tematicas[p.tema] ? { en: 'portada', i: p.tema } : { en: 'elegir' }))
  const cargada = useRef(!!p.inicial)

  useEffect(() => {
    if (cargada.current) return
    AsyncStorage.getItem(M.CLAVE(p.mesaId))
      .then((c) => setM(M.leer(c)))
      .catch(() => undefined)
      .finally(() => (cargada.current = true))
  }, [p.mesaId])

  const recordar = (nueva: M.Memoria) => {
    setM(nueva)
    AsyncStorage.setItem(M.CLAVE(p.mesaId), JSON.stringify(nueva)).catch(() => undefined)
  }

  const todas = p.tematicas
  const fondoDe = (vv: Vista): string => (vv.en === 'elegir' || vv.en === 'conversar' ? color.verdeProfundo : M.estiloDe(vv.i, p.tematicas[vv.i]).fondo)
  const fondo = fondoDe(v)

  let cuerpo: React.ReactNode = null
  if (v.en === 'elegir') {
    const conAvance = m.jugadas.length > 0 || Object.values(m.avance).some((x) => x > 0)
    const t = conAvance ? T.elegir.conAvance : T.elegir.primera
    const alto = todas.length <= 3 ? 128 : todas.length >= 5 ? 80 : 104
    cuerpo = (
      <View style={{ flex: 1 }}>
        <Cabecera alCerrar={p.alSalir} tinta={color.crema} etiqueta={T.etiqueta} />
        <Texto style={[e.titular, { color: color.crema }]} accessibilityRole="header">{t.titulo}</Texto>
        <Texto style={{ color: color.cuerpoSobreVerde, fontSize: 15, lineHeight: 21, marginTop: 6, marginBottom: 18 }}>{t.sub}</Texto>
        <View style={{ gap: 9 }}>
          {todas.map((tm, i) => {
            const es = M.estiloDe(i, tm)
            const est = M.estado(tm, m)
            return (
              <Pressable key={tm.clave} onPress={() => setV({ en: 'portada', i })} accessibilityRole="button" style={[e.tarjeta, { minHeight: alto, backgroundColor: es.fondo, opacity: est.tipo === 'jugada' ? 0.8 : 1 }]}>
                <Icono d={es.icono} fondo={es.tinta} trazo={es.fondo} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto style={{ fontFamily: fuente.titular, fontSize: 21, lineHeight: 30, color: es.tinta }}>{tm.nombre}</Texto>
                  <Texto style={{ fontSize: 13, lineHeight: 18, color: es.sub }}>{tm.linea}</Texto>
                </View>
                {est.tipo === 'jugada' ? (
                  <View style={[e.sello, { backgroundColor: es.tinta }]}>
                    <IconoCheck tam={11} color={es.fondo} />
                    <Texto style={[e.mini, { fontFamily: fuente.textoNegrita, fontSize: 10.5, letterSpacing: 1, color: es.fondo }]}>{T.elegir.jugada}</Texto>
                  </View>
                ) : est.tipo === 'aMedias' ? (
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Texto style={[e.mini, { color: es.tinta }]}>{T.elegir.vanPor(est.en)}</Texto>
                    <Barras n={est.de} hechas={est.en - 1} tinta={es.tinta} />
                  </View>
                ) : (
                  <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 12, color: es.tinta }}>{T.elegir.preguntas(tm.preguntas.length)}</Texto>
                )}
              </Pressable>
            )
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto', paddingTop: 20 }}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Circle cx={12} cy={12} r={4} stroke={SALVIA} strokeWidth={2} />
            <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke={SALVIA} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Texto style={{ color: SALVIA, fontSize: 12.5, lineHeight: 17 }}>{T.elegir.pantalla}</Texto>
        </View>
      </View>
    )
  } else if (v.en === 'portada') {
    const tm = todas[v.i]
    const es = M.estiloDe(v.i, tm)
    const est = M.estado(tm, m)
    const principal = est.tipo === 'aMedias' ? T.portada.seguir(est.en, est.de) : est.tipo === 'jugada' ? T.portada.otraVez : T.portada.empezar
    const secundario = est.tipo === 'aMedias' ? T.portada.deNuevo : est.tipo === 'jugada' ? T.portada.elegirOtra : null
    cuerpo = (
      <View style={{ flex: 1 }}>
        {/* El icono de la temática, enorme y casi transparente, de fondo (P1 a P4). */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -150, top: 150, opacity: 0.1 }}>
          <Svg width={460} height={460} viewBox="0 0 24 24" fill="none">
            <Path d={es.icono} stroke={es.tinta} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Cabecera alCerrar={p.alSalir} tinta={es.tinta} volver={() => setV({ en: 'elegir' })} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
          <Icono d={es.icono} fondo={es.tinta} trazo={es.fondo} tam={76} />
          {est.tipo !== 'nueva' ? (
            <View style={[e.chip, { backgroundColor: es.tinta }]}>
              <Texto style={[e.mini, { fontFamily: fuente.textoNegrita, letterSpacing: 1.3, color: es.fondo }]}>{est.tipo === 'aMedias' ? T.portada.vanPor(est.en, est.de) : T.portada.yaLaJugaron}</Texto>
            </View>
          ) : null}
          <Texto style={[e.titular, { color: es.tinta, fontSize: 60, lineHeight: 85, letterSpacing: -2 }]} accessibilityRole="header">{tm.nombre}</Texto>
          <Texto style={{ fontSize: 20, lineHeight: 28, color: es.sub, maxWidth: 300 }}>{tm.linea}</Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14, color: es.sub }}>{T.elegir.preguntas(tm.preguntas.length)}</Texto>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: es.sub }} />
            <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14, color: es.sub }}>{T.portada.sePuedePasar}</Texto>
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Boton2 texto={principal} fondo={es.tinta} tinta={es.fondo} onPress={() => setV({ en: 'pregunta', i: v.i, k: M.empiezaEn(tm, m) })} />
          {secundario ? (
            <Pressable
              onPress={() => (est.tipo === 'aMedias' ? (recordar(M.avanzar(m, tm, 0)), setV({ en: 'pregunta', i: v.i, k: 0 })) : setV({ en: 'elegir' }))}
              accessibilityRole="button"
              style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15, color: es.tinta, textDecorationLine: 'underline' }}>{secundario}</Texto>
            </Pressable>
          ) : null}
        </View>
      </View>
    )
  } else if (v.en === 'pregunta') {
    const tm = todas[v.i]
    const es = M.estiloDe(v.i, tm)
    const n = tm.preguntas.length
    const texto = tm.preguntas[v.k] ?? ''
    const ultima = v.k === n - 1
    const ir = (k: number) => {
      if (k >= n) {
        recordar(M.avanzar(m, tm, n))
        return setV({ en: 'final', i: v.i })
      }
      recordar(M.avanzar(m, tm, k))
      setV({ en: 'pregunta', i: v.i, k })
    }
    cuerpo = (
      <View style={{ flex: 1 }}>
        <Cabecera alCerrar={p.alSalir} tinta={es.tinta} volver={() => setV({ en: 'elegir' })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Icono d={es.icono} fondo={es.tinta} trazo={es.fondo} tam={30} />
          <Texto style={{ fontFamily: fuente.titular, fontSize: 18, lineHeight: 26, color: es.tinta }}>{tm.nombre}</Texto>
        </View>
        <View style={{ marginTop: 16 }}>
          <Barras n={n} hechas={v.k + 1} tinta={es.tinta} ancho alTocar={(k) => ir(k)} />
          <Texto style={[e.mini, { fontFamily: fuente.textoNegrita, fontSize: 12, letterSpacing: 1.7, color: es.sub, marginTop: 14 }]}>{T.pregunta.deCuantas(v.k + 1, n)}</Texto>
        </View>
        {/* Deslizar a los lados también pasa de pregunta (maqueta, «Navegación»). */}
        <View style={{ flex: 1, justifyContent: 'center' }} {...deslizar(v.k, (k) => (k >= 0 ? ir(k) : undefined)).panHandlers}>
          <Texto style={{ fontFamily: fuente.titular, color: es.tinta, fontSize: M.esLarga(texto) ? 34 : 40, lineHeight: M.esLarga(texto) ? 49 : 57 }} accessibilityRole="header">
            {texto}
          </Texto>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Pressable onPress={() => v.k > 0 && ir(v.k - 1)} disabled={v.k === 0} accessibilityRole="button" accessibilityLabel="Anterior" style={[e.atras, { borderColor: es.tinta, opacity: v.k === 0 ? 0.35 : 1 }]}>
            <Chevron tam={22} color={es.tinta} atras />
          </Pressable>
          <View style={{ flex: 1 }}>
            {/* El botón lleva los colores de la temática, también en «Terminar» (Pregunta, maqueta). */}
            <Boton2 texto={ultima ? T.pregunta.terminar : T.pregunta.siguiente} fondo={es.tinta} tinta={es.fondo} flecha onPress={() => ir(v.k + 1)} />
          </View>
        </View>
        <Texto style={{ fontSize: 13, lineHeight: 18, color: es.sub, textAlign: 'center', marginTop: 12 }}>{T.pregunta.pasa}</Texto>
      </View>
    )
  } else if (v.en === 'final') {
    const tm = todas[v.i]
    const es = M.estiloDe(v.i, tm)
    const todasHechas = M.todasJugadas(todas, m)
    const otras = M.queQueda(todas, m, tm.clave)
    cuerpo = (
      <View style={{ flex: 1 }}>
        <Cabecera alCerrar={p.alSalir} tinta={es.tinta} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 }}>
          <IconoCheck tam={12} color={es.tinta} />
          <Texto style={[e.mini, { color: es.tinta }]}>{T.final.sello(tm.nombre, tm.preguntas.length)}</Texto>
        </View>
        <Texto style={[e.titular, { color: es.tinta, marginTop: 6 }]} accessibilityRole="header">{todasHechas ? T.final.todas.titulo : T.final.titulo}</Texto>
        <Texto style={{ fontSize: 15, lineHeight: 21, color: es.sub, marginTop: 6, marginBottom: 18 }}>{todasHechas ? T.final.todas.texto : T.final.texto}</Texto>
        <Texto style={[e.mini, { fontFamily: fuente.textoNegrita, color: es.sub, marginTop: 10, marginBottom: 10 }]}>{todasHechas ? T.final.todas.repetir : T.final.quedan}</Texto>
        <View style={{ gap: 8 }}>
          {otras.map((o) => {
            const i = todas.indexOf(o)
            const eo = M.estiloDe(i, o)
            const est = M.estado(o, m)
            return (
              <Pressable key={o.clave} onPress={() => setV({ en: 'portada', i })} accessibilityRole="button" style={[e.fila, { backgroundColor: eo.fondo, opacity: est.tipo === 'jugada' ? 0.8 : 1 }]}>
                <Icono d={eo.icono} fondo={eo.tinta} trazo={eo.fondo} tam={34} />
                <View style={{ flex: 1 }}>
                  <Texto style={{ fontFamily: fuente.titular, fontSize: 19, lineHeight: 27, color: eo.tinta }}>{o.nombre}</Texto>
                  <Texto style={{ fontSize: 12, lineHeight: 16, color: eo.sub }}>
                    {est.tipo === 'jugada' ? T.final.jugadaRepetir : est.tipo === 'aMedias' ? T.elegir.vanPor(est.en) : T.elegir.preguntas(o.preguntas.length)}
                  </Texto>
                </View>
                <Chevron tam={18} color={eo.tinta} />
              </Pressable>
            )
          })}
        </View>
        <View style={{ marginTop: 'auto', paddingTop: 20 }}>
          <Boton2 texto={T.final.terminarJuego} borde={es.tinta} tinta={es.tinta} onPress={() => setV({ en: 'conversar' })} />
        </View>
      </View>
    )
  } else {
    cuerpo = (
      <View style={{ flex: 1 }}>
        <Cabecera alCerrar={p.alSalir} tinta={color.crema} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <AroDeColores />
          <Texto style={[e.titular, { color: color.crema, fontSize: 52, lineHeight: 74, letterSpacing: -1.8 }]} accessibilityRole="header">{T.conversar.titulo}</Texto>
          <Texto style={{ fontSize: 17, lineHeight: 25, color: color.cuerpoSobreVerde }}>{T.conversar.texto}</Texto>
        </View>
        <View style={{ gap: 10 }}>
          <Boton2 texto={T.conversar.volver} fondo={color.terracotaSobreVerde} tinta={color.verdeProfundo} onPress={p.alSalir} />
          <Pressable onPress={() => setV({ en: 'elegir' })} accessibilityRole="link" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14, color: color.crema, textDecorationLine: 'underline' }}>{T.conversar.verTematicas}</Texto>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: fondo }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 22 }}>{cuerpo}</ScrollView>
    </View>
  )
}

function Cabecera({ alCerrar, tinta: t, etiqueta, volver }: { alCerrar: () => void; tinta: string; etiqueta?: string; volver?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginBottom: 18 }}>
      {volver ? (
        <Pressable onPress={volver} accessibilityRole="button" style={[e.pildora, { borderColor: t }]}>
          <Chevron tam={16} color={t} atras />
          <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14, color: t }}>{T.pregunta.tematicas}</Texto>
        </Pressable>
      ) : etiqueta ? (
        <Texto style={[e.mini, { color: color.terracotaSobreVerde }]}>{etiqueta}</Texto>
      ) : (
        <View />
      )}
      <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={[e.cerrar, volver ? { borderWidth: 1.5, borderColor: t } : { backgroundColor: 'rgba(250,243,228,.1)' }]}>
        <IconoCruz tam={volver ? 16 : 18} color={t} />
      </Pressable>
    </View>
  )
}

function Icono({ d, fondo, trazo, tam = 40 }: { d: string; fondo: string; trazo: string; tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tam * 0.5} height={tam * 0.5} viewBox="0 0 24 24" fill="none">
        <Path d={d} stroke={trazo} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

/** «‹» y «›» de la maqueta, no la flecha «→» del sistema. */
function Chevron({ tam, color: c, atras }: { tam: number; color: string; atras?: boolean }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d={atras ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={c} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** F3 · El aro con seis puntos de los colores de las temáticas. */
function AroDeColores() {
  const puntos: [number, number, string][] = [[206, 120, '#E39C63'], [163, 194.5, '#9CBBA6'], [77, 194.5, '#F6D9B4'], [34, 120, '#C5D8CA'], [77, 45.5, '#E39C63'], [163, 45.5, '#9CBBA6']]
  return (
    <Svg width={96} height={96} viewBox="0 0 240 240">
      <Circle cx={120} cy={120} r={86} fill="none" stroke={color.crema} strokeWidth={20} />
      {puntos.map(([x, y, f], i) => <Circle key={i} cx={x} cy={y} r={25} fill={f} />)}
    </Svg>
  )
}

/** Deslizar a la izquierda: la siguiente; a la derecha: la anterior. */
function deslizar(k: number, ir: (k: number) => void) {
  return PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -60) ir(k + 1)
      else if (g.dx > 60 && k > 0) ir(k - 1)
    },
  })
}

function Barras({ n, hechas, tinta: t, ancho, alTocar }: { n: number; hechas: number; tinta: string; ancho?: boolean; alTocar?: (k: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: ancho ? 6 : 3 }}>
      {Array.from({ length: n }, (_, k) => (
        <Pressable key={k} disabled={!alTocar} onPress={() => alTocar?.(k)} hitSlop={8} style={{ flex: ancho ? 1 : undefined }}>
          <View style={{ height: ancho ? 5 : 3, width: ancho ? undefined : 10, borderRadius: 2, backgroundColor: t, opacity: k < hechas ? 1 : 0.25 }} />
        </Pressable>
      ))}
    </View>
  )
}

function Boton2({ texto, onPress, fondo, borde, tinta: t, flecha }: { texto: string; onPress: () => void; fondo?: string; borde?: string; tinta: string; flecha?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[e.boton, fondo ? { backgroundColor: fondo } : null, borde ? { borderWidth: 1.5, borderColor: borde } : null]}>
      <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 17, lineHeight: 22, color: t }}>{texto}</Texto>
      {flecha ? <Chevron tam={20} color={t} /> : null}
    </Pressable>
  )
}

/** El verde salvia del pie (E1 a E4). */
const SALVIA = '#9CBBA6'

const e = StyleSheet.create({
  titular: { fontFamily: fuente.titular, fontSize: 36, lineHeight: 52, letterSpacing: -0.6 },
  mini: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  sello: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, minHeight: 24, borderRadius: radio.capsula },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 10, paddingRight: 14, borderRadius: radio.capsula, borderWidth: 1.5 },
  cerrar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  atras: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  boton: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 58, borderRadius: radio.capsula, paddingHorizontal: 20 },
  chip: { alignSelf: 'flex-start', borderRadius: radio.capsula, paddingHorizontal: 12, paddingVertical: 8 },
})


import AsyncStorage from '@react-native-async-storage/async-storage'
import { useKeepAwake } from 'expo-keep-awake'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { IconoAtras, IconoCheck, IconoCruz, IconoFlecha, Marca, Texto, color, fuente, radio } from '../diseno'
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
  const fondoDe = (vv: Vista): string => (vv.en === 'elegir' || vv.en === 'conversar' ? color.verdeProfundo : M.estiloDe(vv.i).fondo)
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
            const es = M.estiloDe(i)
            const est = M.estado(tm, m)
            return (
              <Pressable key={tm.clave} onPress={() => setV({ en: 'portada', i })} accessibilityRole="button" style={[e.tarjeta, { minHeight: alto, backgroundColor: es.fondo, opacity: est.tipo === 'jugada' ? 0.78 : 1 }]}>
                <Icono d={es.icono} fondo={es.tinta} trazo={es.fondo} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto style={{ fontFamily: fuente.titular, fontSize: 21, lineHeight: 30, color: es.tinta }}>{tm.nombre}</Texto>
                  <Texto style={{ fontSize: 13, lineHeight: 18, color: es.sub }}>{tm.linea}</Texto>
                </View>
                {est.tipo === 'jugada' ? (
                  <View style={[e.sello, { backgroundColor: color.verdeProfundo }]}>
                    <IconoCheck tam={10} color={color.crema} />
                    <Texto style={[e.mini, { color: color.crema }]}>{T.elegir.jugada}</Texto>
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
        <Texto style={{ color: color.cuerpoSobreVerde, fontSize: 12, textAlign: 'center', marginTop: 'auto', paddingTop: 20 }}>{T.elegir.pantalla}</Texto>
      </View>
    )
  } else if (v.en === 'portada') {
    const tm = todas[v.i]
    const es = M.estiloDe(v.i)
    const est = M.estado(tm, m)
    const principal = est.tipo === 'aMedias' ? T.portada.seguir(est.en, est.de) : est.tipo === 'jugada' ? T.portada.otraVez : T.portada.empezar
    const secundario = est.tipo === 'aMedias' ? T.portada.deNuevo : est.tipo === 'jugada' ? T.portada.elegirOtra : null
    cuerpo = (
      <View style={{ flex: 1 }}>
        <Cabecera alCerrar={p.alSalir} tinta={es.tinta} volver={() => setV({ en: 'elegir' })} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <Icono d={es.icono} fondo={es.tinta} trazo={es.fondo} tam={56} />
          {est.tipo !== 'nueva' ? <Texto style={[e.mini, { color: es.tinta }]}>{est.tipo === 'aMedias' ? T.portada.vanPor(est.en, est.de) : T.portada.yaLaJugaron}</Texto> : null}
          <Texto style={[e.titular, { color: es.tinta, fontSize: 44, lineHeight: 63 }]} accessibilityRole="header">{tm.nombre}</Texto>
          <Texto style={{ fontSize: 17, lineHeight: 24, color: es.sub }}>{tm.linea}</Texto>
          <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 13, color: es.sub }}>{T.elegir.preguntas(tm.preguntas.length)}</Texto>
        </View>
        <View style={{ gap: 10 }}>
          <Boton2 texto={principal} fondo={es.tinta} tinta={es.fondo} onPress={() => setV({ en: 'pregunta', i: v.i, k: M.empiezaEn(tm, m) })} />
          {secundario ? (
            <Boton2
              texto={secundario}
              borde={es.tinta}
              tinta={es.tinta}
              onPress={() => (est.tipo === 'aMedias' ? (recordar(M.avanzar(m, tm, 0)), setV({ en: 'pregunta', i: v.i, k: 0 })) : setV({ en: 'elegir' }))}
            />
          ) : null}
        </View>
      </View>
    )
  } else if (v.en === 'pregunta') {
    const tm = todas[v.i]
    const es = M.estiloDe(v.i)
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Icono d={es.icono} fondo={es.tinta} trazo={es.fondo} tam={26} />
          <Texto style={{ fontFamily: fuente.titular, fontSize: 17, lineHeight: 25, color: es.tinta }}>{tm.nombre}</Texto>
        </View>
        <View style={{ marginTop: 12 }}>
          <Barras n={n} hechas={v.k + 1} tinta={es.tinta} ancho alTocar={(k) => ir(k)} />
          <Texto style={[e.mini, { color: es.tinta, marginTop: 10 }]}>{T.pregunta.deCuantas(v.k + 1, n)}</Texto>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Texto style={{ fontFamily: fuente.titular, color: es.tinta, fontSize: M.esLarga(texto) ? 34 : 40, lineHeight: M.esLarga(texto) ? 49 : 57 }} accessibilityRole="header">
            {texto}
          </Texto>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Pressable onPress={() => v.k > 0 && ir(v.k - 1)} disabled={v.k === 0} accessibilityRole="button" accessibilityLabel="Anterior" style={[e.atras, { borderColor: es.tinta, opacity: v.k === 0 ? 0.35 : 1 }]}>
            <IconoAtras tam={18} color={es.tinta} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Boton2 texto={ultima ? T.pregunta.terminar : T.pregunta.siguiente} fondo={ultima ? color.crema : color.verdeProfundo} tinta={ultima ? color.terracota : color.crema} flecha onPress={() => ir(v.k + 1)} />
          </View>
        </View>
        <Texto style={{ fontSize: 12, lineHeight: 17, color: es.sub, textAlign: 'center', marginTop: 10 }}>{T.pregunta.pasa}</Texto>
      </View>
    )
  } else if (v.en === 'final') {
    const tm = todas[v.i]
    const es = M.estiloDe(v.i)
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
        <Texto style={[e.mini, { color: es.tinta, marginBottom: 10 }]}>{todasHechas ? T.final.todas.repetir : T.final.quedan}</Texto>
        <View style={{ gap: 8 }}>
          {otras.map((o) => {
            const i = todas.indexOf(o)
            const eo = M.estiloDe(i)
            const est = M.estado(o, m)
            return (
              <Pressable key={o.clave} onPress={() => setV({ en: 'portada', i })} accessibilityRole="button" style={[e.fila, { backgroundColor: eo.fondo, opacity: est.tipo === 'jugada' ? 0.8 : 1 }]}>
                <Icono d={eo.icono} fondo={eo.tinta} trazo={eo.fondo} tam={34} />
                <View style={{ flex: 1 }}>
                  <Texto style={{ fontFamily: fuente.titular, fontSize: 18, lineHeight: 26, color: eo.tinta }}>{o.nombre}</Texto>
                  <Texto style={{ fontSize: 12, lineHeight: 16, color: eo.sub }}>
                    {est.tipo === 'jugada' ? T.final.jugadaRepetir : est.tipo === 'aMedias' ? T.elegir.vanPor(est.en) : T.elegir.preguntas(o.preguntas.length)}
                  </Texto>
                </View>
                <IconoFlecha tam={13} color={eo.tinta} />
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
          <Marca tam={72} crema />
          <Texto style={[e.titular, { color: color.crema, fontSize: 48, lineHeight: 69 }]} accessibilityRole="header">{T.conversar.titulo}</Texto>
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
          <IconoAtras tam={14} color={t} />
          <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 13, color: t }}>{T.pregunta.tematicas}</Texto>
        </Pressable>
      ) : etiqueta ? (
        <Texto style={[e.mini, { color: color.terracotaSobreVerde }]}>{etiqueta}</Texto>
      ) : (
        <View />
      )}
      <Pressable onPress={alCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={[e.cerrar, { borderColor: t }]}>
        <IconoCruz tam={14} color={t} />
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

function Barras({ n, hechas, tinta: t, ancho, alTocar }: { n: number; hechas: number; tinta: string; ancho?: boolean; alTocar?: (k: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: ancho ? 6 : 3 }}>
      {Array.from({ length: n }, (_, k) => (
        <Pressable key={k} disabled={!alTocar} onPress={() => alTocar?.(k)} hitSlop={8} style={{ flex: ancho ? 1 : undefined }}>
          <View style={{ height: ancho ? 4 : 3, width: ancho ? undefined : 10, borderRadius: 2, backgroundColor: t, opacity: k < hechas ? 1 : 0.25 }} />
        </Pressable>
      ))}
    </View>
  )
}

function Boton2({ texto, onPress, fondo, borde, tinta: t, flecha }: { texto: string; onPress: () => void; fondo?: string; borde?: string; tinta: string; flecha?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[e.boton, fondo ? { backgroundColor: fondo } : null, borde ? { borderWidth: 1.5, borderColor: borde } : null]}>
      <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 16, lineHeight: 21, color: t }}>{texto}</Texto>
      {flecha ? <IconoFlecha tam={13} color={t} /> : null}
    </Pressable>
  )
}

const e = StyleSheet.create({
  titular: { fontFamily: fuente.titular, fontSize: 36, lineHeight: 52, letterSpacing: -0.6 },
  mini: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  sello: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, minHeight: 24, borderRadius: radio.capsula },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radio.capsula, borderWidth: 1 },
  cerrar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  atras: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  boton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: radio.capsula, paddingHorizontal: 20 },
})


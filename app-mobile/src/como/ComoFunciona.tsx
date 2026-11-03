import { useMemo, useState } from 'react'
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'

import { IconoCruz, Texto, color, fuente, medida, radio, tinta } from '../diseno'
import * as T from '../texto/como'
import * as M from './maquina'

/** Los iconos de cada tramo (pin, conversación, salida), de la maqueta. */
const ICONO: Record<M.Tarjeta['clave'], string> = {
  antes: 'M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  durante: 'M4 5.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM18.5 9.5H20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5l-3-2.5h-3',
  despues: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9.5 16.5 14 12 9.5 7.5M14 12H3.5',
}

export function IconoTramo({ clave, tam, color: c }: { clave: M.Tarjeta['clave']; tam: number; color: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d={ICONO[clave]} stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Chevron({ tam, color: c, atras }: { tam: number; color: string; atras?: boolean }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d={atras ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/**
 * «Cómo funciona» (entrega como-funciona, 29-10). `todas`: las tres juntas
 * (C3, la primera vez que tiene puesto). Si no, el carrusel de C2, C4 o C5:
 * una tarjeta por tramo, con la flecha, los puntos, deslizar y la X.
 */
export function ComoFunciona(p: { plan: M.Plan | null; abierta: boolean; todas?: boolean; alCerrar: () => void }) {
  const insets = useSafeAreaInsets()
  const [i, setI] = useState(0)
  const deslizar = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60) setI((x) => Math.min(2, x + 1))
          else if (g.dx > 60) setI((x) => Math.max(0, x - 1))
        },
      }),
    [],
  )
  if (!p.abierta || !p.plan) return null
  const v = M.vista(p.plan)
  const cerrar = () => {
    setI(0)
    p.alCerrar()
  }

  if (p.todas) {
    const plan = (p.plan.formato ?? 'dinner') === 'dinner' ? 'cena' : 'plan'
    // C3: pantalla entera en verde, no una hoja.
    return (
      <Modal visible animationType="slide" onRequestClose={cerrar} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: color.verdeProfundo }} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 12, paddingHorizontal: 20, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 18 }}>
            <Texto style={[e.etiqueta, { color: color.terracotaSobreVerde }]}>{T.primeraVez.sello(plan)}</Texto>
            <Texto style={[e.titular, { color: color.crema, fontSize: 34, lineHeight: 48 }]} accessibilityRole="header">
              {v.esMesa && plan === 'cena' ? T.primeraVez.titulo : T.primeraVez.tituloDia}
            </Texto>
            <View style={{ gap: 10, marginTop: 4 }}>
              {v.tarjetas.map((t) => (
                <View key={t.clave} style={e.filaTodas}>
                  <Panel t={t} ancho={96} alto={108} />
                  <View style={{ flex: 1, gap: 6, paddingVertical: 4, paddingRight: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <IconoTramo clave={t.clave} tam={14} color={color.terracotaSobreVerde} />
                      <Texto style={[e.etiqueta, { fontFamily: fuente.textoNegrita, fontSize: 10.5, letterSpacing: 1.7, color: color.terracotaSobreVerde }]}>{t.etiqueta}</Texto>
                    </View>
                    <Texto style={{ fontFamily: fuente.titular, fontSize: 18, lineHeight: 26, color: color.crema }}>{t.titulo}</Texto>
                    <Texto style={{ fontSize: 12.5, lineHeight: 17.5, color: color.cuerpoSobreVerde }}>{t.cuerpo}</Texto>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 'auto', gap: 10, paddingTop: 12 }}>
              <Pressable onPress={cerrar} accessibilityRole="button" style={[e.boton, { backgroundColor: color.terracotaSobreVerde }]}>
                <Texto style={[e.textoBoton, { color: color.verdeProfundo }]}>{T.entendido}</Texto>
              </Pressable>
              <Texto style={{ fontSize: 12.5, lineHeight: 18, color: color.cuerpoSobreVerde, textAlign: 'center' }}>{T.pie(v.miMesa)}</Texto>
            </View>
          </ScrollView>
        </View>
      </Modal>
    )
  }

  const t = v.tarjetas[i]
  const ultima = i === v.tarjetas.length - 1
  return (
    <Modal visible transparent animationType="slide" onRequestClose={cerrar} statusBarTranslucent>
      <View style={e.fondo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel="Cerrar" />
        <View style={[e.hoja, { paddingBottom: insets.bottom + 26 }]} accessibilityViewIsModal {...deslizar.panHandlers}>
          <View style={e.asa} />
          <View style={e.cabecera}>
            <Texto style={{ fontFamily: fuente.titular, fontSize: 22, lineHeight: 31, color: color.verdeProfundo }} accessibilityRole="header">
              {T.titulo}
            </Texto>
            <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={e.cerrar}>
              <IconoCruz tam={16} color={color.verdeProfundo} />
            </Pressable>
          </View>
          <View style={[e.foto, { backgroundColor: t.panel }]}>
            <Panel t={t} />
            <View style={[e.chip, { left: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 9, paddingRight: 13 }]}>
              <View style={e.chipIcono}>
                <IconoTramo clave={t.clave} tam={15} color={color.crema} />
              </View>
              <Texto style={[e.etiqueta, { fontFamily: fuente.textoNegrita, letterSpacing: 1.8, color: color.verdeProfundo }]}>{t.etiqueta}</Texto>
            </View>
            {/* Si una marca cambió esta tarjeta, su cápsula lo señala (B). La cuenta baja a la esquina de abajo. */}
            {t.marca ? (
              <View style={[e.chip, { right: 14, backgroundColor: color.verdeProfundo, borderWidth: 1.5, borderColor: color.crema, paddingHorizontal: 10 }]}>
                <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.7, color: color.crema }}>{t.marca}</Texto>
              </View>
            ) : null}
            <View style={[e.chip, t.marca ? { top: 'auto', bottom: 14 } : null, { right: 14, backgroundColor: 'rgba(20,52,42,.7)', paddingHorizontal: 11 }]}>
              <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 12, lineHeight: 15, color: color.crema }}>{T.cuentaDe(i + 1, v.tarjetas.length)}</Texto>
            </View>
          </View>
          {/* Alto fijo del texto: la hoja no cambia de tamaño entre tarjetas. */}
          <View style={{ gap: 9, minHeight: 150, marginTop: 14 }}>
            <Texto style={[e.titular, { fontSize: 29, lineHeight: 41 }]}>{t.titulo}</Texto>
            <Texto style={{ fontSize: 16, lineHeight: 23, color: color.cuerpo }}>{t.cuerpo}</Texto>
          </View>
          <View style={e.puntos}>
            {v.tarjetas.map((x, k) => (
              <Pressable key={x.clave} onPress={() => setI(k)} accessibilityRole="button" accessibilityLabel={T.cuentaDe(k + 1, v.tarjetas.length)} hitSlop={10}>
                <View style={[e.punto, k === i ? { width: 26, backgroundColor: color.verdeProfundo } : null]} />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} accessibilityRole="button" accessibilityLabel="Anterior" style={[e.atras, i === 0 && { opacity: 0.3 }]}>
              <Chevron tam={18} color={color.verdeProfundo} atras />
            </Pressable>
            <Pressable onPress={() => (ultima ? cerrar() : setI(i + 1))} accessibilityRole="button" style={[e.boton, { flex: 1, backgroundColor: color.verdeProfundo }]}>
              <Texto style={[e.textoBoton, { color: color.crema }]}>{ultima ? T.entendido : T.siguiente}</Texto>
            </Pressable>
          </View>
          <Texto style={{ fontSize: 12.5, lineHeight: 18, color: color.cuerpo, textAlign: 'center', marginTop: 14 }}>{T.pie(v.miMesa)}</Texto>
        </View>
      </View>
    </Modal>
  )
}

/**
 * El panel de una tarjeta (entrega «Qué estás reservando», B): el color del
 * tramo y el icono del plan en grande. Sustituye a las fotos y al isotipo.
 */
export function Panel({ t, ancho, alto, redondo }: { t: Pick<M.Tarjeta, 'panel' | 'colorIcono' | 'iconoPlan'>; ancho?: number; alto?: number; redondo?: boolean }) {
  const mini = ancho != null
  const lado = mini ? Math.min(ancho!, alto ?? ancho!) * 0.55 : 120
  return (
    <View
      style={[
        mini ? { width: ancho, height: alto ?? ancho, borderRadius: redondo ? ancho! / 2 : 14 } : StyleSheet.absoluteFill,
        { backgroundColor: t.panel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
      ]}
    >
      <Svg width={lado} height={lado} viewBox="0 0 24 24" fill="none">
        <Path d={t.iconoPlan} stroke={t.colorIcono} strokeWidth={mini && lado < 30 ? 2 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

const e = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,52,42,0.45)' },
  hoja: { backgroundColor: color.crema, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12 },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: tinta(0.2), marginBottom: 14 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cerrar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tinta(0.07) },
  foto: { height: 290, borderRadius: 24, overflow: 'hidden' },
  chip: { position: 'absolute', top: 14, minHeight: 30, paddingVertical: 4, borderRadius: radio.capsula, justifyContent: 'center', backgroundColor: color.crema },
  chipIcono: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.verdeProfundo, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.5 },
  titular: { fontFamily: fuente.titular, fontSize: 30, lineHeight: 43, color: color.verdeProfundo },
  puntos: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 'auto', marginBottom: 14, paddingTop: 6 },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: tinta(0.22) },
  atras: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: color.verdeProfundo, alignItems: 'center', justifyContent: 'center' },
  boton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: radio.capsula, paddingHorizontal: 20 },
  textoBoton: { fontFamily: fuente.textoSemi, fontSize: 16, lineHeight: 21 },
  filaTodas: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 10, borderRadius: 20, backgroundColor: '#1B5138' },
  miniatura: { width: 96, height: 108, borderRadius: 14 },
})
// `medida` se queda por si la hoja vuelve a usar el margen del sistema.
void medida

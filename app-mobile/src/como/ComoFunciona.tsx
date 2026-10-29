import { useState } from 'react'
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import { IconoAtras, IconoCruz, IconoFlecha, Texto, color, cremaAlfa, fuente, medida, radio, tinta } from '../diseno'
import * as T from '../texto/como'
import * as M from './maquina'

const FOTOS = {
  antes: require('../../assets/fotos/como-funciona/llegada.jpg'),
  durante: require('../../assets/fotos/como-funciona/conversacion.jpg'),
  despues: require('../../assets/fotos/como-funciona/brindis.jpg'),
}

/**
 * «Cómo funciona» (entrega como-funciona, 29-10). `todas`: las tres juntas
 * (C3, la primera vez que tiene puesto). Si no, el carrusel de C2: una
 * tarjeta por tramo, con la flecha, los puntos y la X.
 */
export function ComoFunciona(p: { plan: M.Plan | null; abierta: boolean; todas?: boolean; alCerrar: () => void }) {
  const insets = useSafeAreaInsets()
  const [i, setI] = useState(0)
  if (!p.abierta || !p.plan) return null
  const v = M.vista(p.plan)
  const cerrar = () => {
    setI(0)
    p.alCerrar()
  }

  if (p.todas) {
    const plan = (p.plan.formato ?? 'dinner') === 'dinner' ? 'cena' : 'plan'
    return (
      <Modal visible transparent animationType="slide" onRequestClose={cerrar} statusBarTranslucent>
        <View style={e.fondo}>
          <View style={[e.hoja, { backgroundColor: color.verdeProfundo, paddingBottom: insets.bottom + 20, maxHeight: '92%' }]} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Texto style={[e.etiqueta, { color: color.terracotaSobreVerde }]}>{T.primeraVez.sello(plan)}</Texto>
              <Texto style={[e.titular, { color: color.crema }]} accessibilityRole="header">
                {v.esMesa && plan === 'cena' ? T.primeraVez.titulo : T.primeraVez.tituloDia}
              </Texto>
              {v.tarjetas.map((t) => (
                <View key={t.clave} style={e.filaTodas}>
                  {v.conFotos ? <Image source={FOTOS[t.clave]} style={e.miniatura} /> : <Panel clave={t.clave} tam={64} />}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Texto style={[e.etiqueta, { color: color.terracotaSobreVerde }]}>{t.etiqueta}</Texto>
                    <Texto style={{ fontFamily: fuente.titular, fontSize: 17, lineHeight: 25, color: color.crema }}>{t.titulo}</Texto>
                    <Texto style={{ fontSize: 13, lineHeight: 18, color: color.cuerpoSobreVerde }}>{t.cuerpo}</Texto>
                  </View>
                </View>
              ))}
              <Pressable onPress={cerrar} accessibilityRole="button" style={[e.boton, { backgroundColor: color.terracotaSobreVerde, marginTop: 6 }]}>
                <Texto style={[e.textoBoton, { color: color.verdeProfundo }]}>{T.entendido}</Texto>
              </Pressable>
              <Texto style={{ fontSize: 12, lineHeight: 17, color: color.cuerpoSobreVerde, textAlign: 'center' }}>{T.pie(v.miMesa)}</Texto>
            </ScrollView>
          </View>
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
        <View style={[e.hoja, { paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
          <View style={e.cabecera}>
            <Texto variante="subtitulo" style={{ fontSize: 21 }} accessibilityRole="header">
              {T.titulo}
            </Texto>
            <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={e.cerrar}>
              <IconoCruz tam={14} color={color.verdeProfundo} />
            </Pressable>
          </View>
          <View style={e.foto}>
            {v.conFotos ? <Image source={FOTOS[t.clave]} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" /> : <Panel clave={t.clave} />}
            <View style={[e.chip, { left: 12 }]}>
              <Texto style={[e.etiqueta, { color: color.verdeProfundo }]}>{t.etiqueta}</Texto>
            </View>
            <View style={[e.chip, { right: 12, backgroundColor: 'rgba(20,52,42,.78)' }]}>
              <Texto style={[e.etiqueta, { color: color.crema }]}>{T.cuentaDe(i + 1, v.tarjetas.length)}</Texto>
            </View>
          </View>
          <Texto style={[e.titular, { fontSize: 24, lineHeight: 35, marginTop: 16 }]}>{t.titulo}</Texto>
          <Texto variante="cuerpo" style={{ marginTop: 6 }}>
            {t.cuerpo}
          </Texto>
          <View style={e.puntos}>
            {v.tarjetas.map((x, k) => (
              <Pressable key={x.clave} onPress={() => setI(k)} accessibilityRole="button" accessibilityLabel={T.cuentaDe(k + 1, v.tarjetas.length)} hitSlop={10}>
                <View style={[e.punto, k === i ? { width: 22, backgroundColor: color.verdeProfundo } : null]} />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} accessibilityRole="button" accessibilityLabel="Anterior" style={[e.atras, i === 0 && { opacity: 0.35 }]}>
              <IconoAtras tam={18} color={color.verdeProfundo} />
            </Pressable>
            <Pressable onPress={() => (ultima ? cerrar() : setI(i + 1))} accessibilityRole="button" style={[e.boton, { flex: 1, backgroundColor: color.verdeProfundo }]}>
              <Texto style={[e.textoBoton, { color: color.crema }]}>{ultima ? T.entendido : T.siguiente}</Texto>
              {ultima ? null : <IconoFlecha tam={13} color={color.crema} />}
            </Pressable>
          </View>
          <Texto variante="nota" style={{ textAlign: 'center', marginTop: 12 }}>
            {T.pie(v.miMesa)}
          </Texto>
        </View>
      </View>
    </Modal>
  )
}

/**
 * Sin fotos (brunch y planes de día): el panel de color con el isotipo en el
 * estado de cada tramo. Antes: tu punto solo. Durante: el aro completo.
 * Después: cada quien por su lado.
 */
function Panel({ clave, tam }: { clave: M.Tarjeta['clave']; tam?: number }) {
  const fondo = clave === 'durante' ? color.verdeProfundo : '#9CBBA6'
  const trazo = clave === 'durante' ? color.crema : color.verdeProfundo
  const pos: [number, number][] = [[206, 120], [163, 194.5], [77, 194.5], [34, 120], [77, 45.5], [163, 45.5]]
  const fuera: [number, number][] = [[226, 120], [175, 215], [65, 215], [14, 120], [65, 25], [175, 25]]
  const puntos = clave === 'despues' ? fuera : pos
  return (
    <View style={[tam ? { width: tam, height: tam, borderRadius: 14 } : StyleSheet.absoluteFill, { backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }]}>
      <Svg width={tam ? tam * 0.7 : 150} height={tam ? tam * 0.7 : 150} viewBox="-10 -10 260 260">
        <Circle cx={120} cy={120} r={86} fill="none" stroke={trazo} strokeWidth={12} opacity={clave === 'despues' ? 0.35 : 1} />
        {puntos.map(([x, y], k) =>
          k === 0 ? (
            <Circle key={k} cx={x} cy={y} r={22} fill={color.terracotaSobreVerde} />
          ) : clave === 'antes' ? (
            <Circle key={k} cx={x} cy={y} r={20} fill="none" stroke={trazo} strokeWidth={5} strokeDasharray="8 6" />
          ) : (
            <Circle key={k} cx={x} cy={y} r={20} fill={trazo} />
          ),
        )}
      </Svg>
    </View>
  )
}

const e = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,52,42,0.45)' },
  hoja: { backgroundColor: color.crema, borderTopLeftRadius: radio.tarjeta, borderTopRightRadius: radio.tarjeta, paddingHorizontal: medida.margenLateral, paddingTop: 20 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cerrar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: tinta(0.07) },
  foto: { height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: tinta(0.08) },
  chip: { position: 'absolute', top: 12, minHeight: 26, paddingHorizontal: 10, borderRadius: radio.capsula, justifyContent: 'center', backgroundColor: color.crema },
  etiqueta: { fontFamily: fuente.textoSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  titular: { fontFamily: fuente.titular, fontSize: 30, lineHeight: 43, color: color.verdeProfundo },
  puntos: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 16 },
  punto: { width: 8, height: 6, borderRadius: 3, backgroundColor: tinta(0.22) },
  atras: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: tinta(0.25), alignItems: 'center', justifyContent: 'center' },
  boton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52, borderRadius: radio.capsula, paddingHorizontal: 20 },
  textoBoton: { fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 20 },
  filaTodas: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 18, backgroundColor: cremaAlfa(0.07) },
  miniatura: { width: 64, height: 64, borderRadius: 14 },
})

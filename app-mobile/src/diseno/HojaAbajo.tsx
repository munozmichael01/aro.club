import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Dimensions, Easing, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { color, tinta } from './tokens'

/**
 * Una hoja que sube desde abajo (la de reservar, «Cómo funciona»).
 *
 * El fondo oscuro aparece con un fundido y solo la hoja se desliza: con
 * `animationType="slide"` del Modal subía también el velo, y se veía un
 * bloque verde detrás de la hoja (Michael, 03-11). La cabecera se arrastra y
 * la hoja sigue al dedo; al soltar, se cierra si bajó lo bastante o se lanzó
 * hacia abajo, y si no, vuelve a su sitio. Tocar fuera y atrás también cierran.
 *
 * `cabecera` es la zona que se arrastra (con el asa ya puesta); `children`,
 * lo que se desplaza; `pie`, lo que queda fijo abajo. Cada una puede ser una
 * función que recibe `cerrar`, para cerrar con la animación desde un botón.
 */
type Pieza = ReactNode | ((cerrar: () => void) => ReactNode)

export function HojaAbajo(p: { alCerrar: () => void; cabecera?: Pieza; children: Pieza; pie?: Pieza; etiquetaCerrar?: string }) {
  const insets = useSafeAreaInsets()
  const alto = Dimensions.get('window').height
  const y = useRef(new Animated.Value(alto)).current
  const velo = useRef(new Animated.Value(0)).current
  const cerrando = useRef(false)
  const alCerrar = useRef(p.alCerrar)
  alCerrar.current = p.alCerrar

  useEffect(() => {
    Animated.parallel([
      Animated.timing(velo, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, damping: 26, stiffness: 260, mass: 0.9, useNativeDriver: true }),
    ]).start()
  }, [velo, y])

  const cerrar = useRef(() => {
    if (cerrando.current) return
    cerrando.current = true
    Animated.parallel([
      Animated.timing(velo, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(y, { toValue: alto, duration: 230, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => alCerrar.current())
  }).current

  const arrastre = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) cerrar()
        else Animated.spring(y, { toValue: 0, damping: 24, stiffness: 300, useNativeDriver: true }).start()
      },
      onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current

  const pintar = (x: Pieza | undefined) => (typeof x === 'function' ? x(cerrar) : x)

  return (
    <Modal visible transparent animationType="none" onRequestClose={cerrar} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,52,42,0.45)', opacity: velo }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel={p.etiquetaCerrar ?? 'Cerrar'} />
        </Animated.View>
        <Animated.View
          style={[e.hoja, { marginTop: insets.top + 24, paddingBottom: insets.bottom + 14, transform: [{ translateY: y }] }]}
          accessibilityViewIsModal
        >
          <View {...arrastre.panHandlers} style={{ paddingTop: 12 }}>
            <View style={e.asa} />
            {pintar(p.cabecera)}
          </View>
          {pintar(p.children)}
          {pintar(p.pie)}
        </Animated.View>
      </View>
    </Modal>
  )
}

const e = StyleSheet.create({
  hoja: { backgroundColor: color.crema, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '100%', flexShrink: 1, overflow: 'hidden' },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: tinta(0.2) },
})

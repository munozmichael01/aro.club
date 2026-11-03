import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, View } from 'react-native'

/**
 * Una hoja CORTA desde abajo: una pregunta con sus botones (los avisos,
 * «¿Cambiar de acompañante?»). Las largas van en `HojaAbajo`, la nativa.
 *
 * El velo aparece con un fundido y solo la hoja sube: con
 * `animationType="slide"` del Modal subía también el velo, un bloque verde
 * detrás de la hoja (Michael, 03-11). Al cerrar, baja y se va el velo, y
 * después se avisa. No se arrastra: se cierra con sus botones, tocando fuera
 * o con atrás.
 *
 * `children` recibe `cerrar`, que anima y luego llama a `alCerrar`.
 */
export function HojaCorta(p: { alCerrar: () => void; velo?: string; etiquetaCerrar?: string; estilo?: object; children: (cerrar: () => void) => ReactNode }) {
  const alto = Dimensions.get('window').height
  const y = useRef(new Animated.Value(alto * 0.5)).current
  const velo = useRef(new Animated.Value(0)).current
  const cerrando = useRef(false)
  const alCerrar = useRef(p.alCerrar)
  alCerrar.current = p.alCerrar

  useEffect(() => {
    Animated.parallel([
      Animated.timing(velo, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [velo, y])

  const cerrar = () => {
    if (cerrando.current) return
    cerrando.current = true
    Animated.parallel([
      Animated.timing(velo, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(y, { toValue: alto * 0.5, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => alCerrar.current())
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={cerrar} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: p.velo ?? 'rgba(20,52,42,0.45)', opacity: velo }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel={p.etiquetaCerrar ?? 'Cerrar'} />
        </Animated.View>
        <Animated.View style={[p.estilo, { transform: [{ translateY: y }] }]} accessibilityViewIsModal>
          {p.children(cerrar)}
        </Animated.View>
      </View>
    </Modal>
  )
}

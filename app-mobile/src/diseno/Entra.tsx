import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, type ViewStyle } from 'react-native'

import { useMovimientoReducido } from './movimiento'
import { tiempo } from './tokens'

/**
 * De esqueleto a contenido (entrega carga, 03-11): cada bloque cambia en
 * 180 ms, de arriba abajo, con 40 ms entre una tanda y la siguiente y como
 * mucho tres tandas (0, 1, 2). Solo cambia la opacidad: nada se desliza ni
 * crece. Si llega a trozos, cada bloque entra cuando se monta.
 *
 * `sinFundido`: lo que llega de lo último guardado entra de golpe, porque ya
 * se había visto. Con «reducir movimiento» se queda el fundido, sin tandas.
 */
export function Entra({ tanda = 0, sinFundido, estilo, children }: { tanda?: 0 | 1 | 2; sinFundido?: boolean; estilo?: ViewStyle; children: ReactNode }) {
  const quieto = useMovimientoReducido()
  const o = useRef(new Animated.Value(sinFundido ? 1 : 0)).current
  useEffect(() => {
    if (sinFundido) return
    const a = Animated.timing(o, { toValue: 1, duration: tiempo.transicion, delay: quieto ? 0 : tanda * tiempo.escalon, useNativeDriver: true })
    a.start()
    return () => a.stop()
    // Solo al montarse: un bloque entra una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Animated.View style={[estilo, { opacity: o }]}>{children}</Animated.View>
}

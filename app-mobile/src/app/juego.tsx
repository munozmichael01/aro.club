import { router, useLocalSearchParams } from 'expo-router'

import { Juego } from '../juego/Juego'
import * as TM from '../tematicas/maquina'
import { JuegoTematicas } from '../tematicas/Tematicas'

/**
 * /juego?mesa=<id>&ir=empezar|seguir|ronda-N (o &tema=N, por temáticas): el juego de la mesa, fuera de
 * las pestañas, como Pago. La X vuelve a Mi mesa sin confirmación.
 */
export default function Pantalla() {
  const { mesa, ir, tema } = useLocalSearchParams<{ mesa?: string; ir?: string; tema?: string }>()
  const salir = () => (router.canGoBack() ? router.back() : router.replace('/mesa'))
  if (!mesa) {
    salir()
    return null
  }
  // Por temáticas cuando el mazo nuevo está en reglas.js (29-10); si no, por rondas, como hoy.
  const tematicas = TM.delMazo()
  if (tematicas.length) return <JuegoTematicas mesaId={mesa} tematicas={tematicas} tema={tema != null ? Number(tema) : null} alSalir={salir} />
  return <Juego mesaId={mesa} ir={ir} alSalir={salir} />
}

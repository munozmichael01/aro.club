import { router, useLocalSearchParams } from 'expo-router'

import { Juego } from '../juego/Juego'

/**
 * /juego?mesa=<id>&ir=empezar|seguir|ronda-N: el juego de la mesa, fuera de
 * las pestañas, como Pago. La X vuelve a Mi mesa sin confirmación.
 */
export default function Pantalla() {
  const { mesa, ir } = useLocalSearchParams<{ mesa?: string; ir?: string }>()
  const salir = () => (router.canGoBack() ? router.back() : router.replace('/mesa'))
  if (!mesa) {
    salir()
    return null
  }
  return <Juego mesaId={mesa} ir={ir} alSalir={salir} />
}

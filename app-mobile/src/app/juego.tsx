import { router, useLocalSearchParams } from 'expo-router'

import { Juego } from '../juego/Juego'

/** /juego?mesa=<id>: el juego de la mesa, fuera de las pestañas, como Pago. La X vuelve a Mi mesa sin confirmación. */
export default function Pantalla() {
  const { mesa } = useLocalSearchParams<{ mesa?: string }>()
  const salir = () => (router.canGoBack() ? router.back() : router.replace('/mesa'))
  if (!mesa) {
    salir()
    return null
  }
  return <Juego mesaId={mesa} alSalir={salir} />
}

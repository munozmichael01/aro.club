import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import { PreguntaAvisos } from '../avisos/PreguntaAvisos'
import type { Momento } from '../avisos/maquina'
import { color } from '../diseno'
import { soloDesarrollo } from '../util/soloDesarrollo'

/** Catálogo: la pregunta previa de las push. ?momento=alta|verificacion|reserva */
function Pantalla() {
  const { momento = 'alta' } = useLocalSearchParams<{ momento?: Momento }>()
  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <PreguntaAvisos momento={momento} zona={momento === 'alta' ? 'Chacao' : null} alCerrar={() => {}} />
    </View>
  )
}

export default soloDesarrollo(Pantalla)

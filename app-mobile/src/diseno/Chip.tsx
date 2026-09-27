import { View } from 'react-native'

import { Texto } from './Texto'
import { radio, tinta, verdeAlfa } from './tokens'

/**
 * La pastilla pequeña: «Lo ven los cinco», «32 años», «Menos de 24 horas».
 * `destacado` va en verde relleno; si no, con borde.
 */
export function Chip({ texto, destacado }: { texto: string; destacado?: boolean }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        minHeight: 28,
        justifyContent: 'center',
        paddingHorizontal: 11,
        borderRadius: radio.capsula,
        backgroundColor: destacado ? verdeAlfa(0.12) : 'transparent',
        borderWidth: destacado ? 0 : 1,
        borderColor: tinta(0.2),
      }}
    >
      <Texto variante="chip" tono={destacado ? 'verde' : 'cuerpo'}>
        {texto}
      </Texto>
    </View>
  )
}

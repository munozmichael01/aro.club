import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { IconoCompartir, IconoGalon, Texto, color, fuente } from '../diseno'
import * as T from '../texto/dentro'
import { HojaCompartir } from './Compartir'
import * as M from './maquina'

/**
 * «Compartir mi plan» en Mi mesa (entrega estas-dentro, C2): para quien ya
 * cerró «Estás dentro». Va debajo de la tarjeta de la mesa, cerrada o ya
 * abierta, hasta que empieza la cena, y abre la misma hoja de historias. Los planes de movimiento no tienen tarjeta, así que no sale.
 */
export function FilaCompartir({ plan, codigo = null }: { plan: M.Plan; codigo?: string | null }) {
  const [abierta, setAbierta] = useState(false)
  const h = M.historia(plan, codigo)
  if (!h) return null
  return (
    <>
      <Pressable
        onPress={() => setAbierta(true)}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, backgroundColor: '#E39C63', paddingVertical: 16, paddingHorizontal: 18, minHeight: 44 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.verdeProfundo, alignItems: 'center', justifyContent: 'center' }}>
          <IconoCompartir tam={20} color={color.crema} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texto style={{ fontFamily: fuente.titular, fontSize: 21, lineHeight: 30, color: color.verdeProfundo }}>{T.filaCompartir.titulo}</Texto>
          <Texto style={{ fontFamily: fuente.texto, fontSize: 13, lineHeight: 17.5, color: color.verdeProfundo, marginTop: 1 }}>{T.filaCompartir.bajada(!!codigo)}</Texto>
        </View>
        <IconoGalon color={color.verdeProfundo} />
      </Pressable>
      {abierta ? <HojaCompartir h={h} mensaje={T.mensaje(codigo)} alCerrar={() => setAbierta(false)} /> : null}
    </>
  )
}

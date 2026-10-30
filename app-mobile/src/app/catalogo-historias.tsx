import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { HojaCompartir } from '../dentro/Compartir'
import * as M from '../dentro/maquina'
import { TarjetaHistoria } from '../dentro/TarjetaHistoria'
import * as T from '../texto/dentro'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Las historias para compartir, todas a la vez, y la hoja «Comparte tu plan»:
 * /catalogo-historias?plan=cena|brunch&codigo=1&ancho=270&hoja=1
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

function Pantalla() {
  const q = useLocalSearchParams<{ plan?: string; codigo?: string; ancho?: string; hoja?: string }>()
  const [hoja, setHoja] = useState(q.hoja === '1')
  const brunch = q.plan === 'brunch'
  const plan: M.Plan = brunch
    ? { empiezaEn: en(80), revelaEn: en(77), zonaHoraria: 'America/Caracas', formato: 'brunch', zonas: ['Altamira'] }
    : { empiezaEn: en(56), revelaEn: en(50), zonaHoraria: 'America/Caracas', formato: 'dinner', zonas: ['Chacao', 'Los Palos Grandes'] }
  const codigo = q.codigo === '1' ? 'ANDREA7KQ' : null
  const h = M.historia(plan, codigo)!
  const ancho = Number(q.ancho ?? 270)
  return (
    <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, backgroundColor: '#E9E1CE' }}>
      <Pressable onPress={() => setHoja(true)} style={{ width: '100%', padding: 12, backgroundColor: '#14342A' }}>
        <Text style={{ color: '#FAF3E4' }}>Abrir la hoja</Text>
      </Pressable>
      {M.variantesDe(h).map((v) => (
        <View key={v} testID={`historia-${v}`}>
          <TarjetaHistoria variante={v} h={h} ancho={ancho} />
        </View>
      ))}
      {hoja ? <HojaCompartir h={h} mensaje={T.mensaje(codigo)} alCerrar={() => setHoja(false)} /> : null}
    </ScrollView>
  )
}

export default soloDesarrollo(Pantalla)

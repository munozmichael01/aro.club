import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'

import { ComoFunciona } from '../como/ComoFunciona'
import { color } from '../diseno'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * «Cómo funciona» con datos de ejemplo: /catalogo-como-funciona?estado=cena|brunch|paseo|todas
 * Catálogo de desarrollo: no se enlaza desde ningún sitio.
 */
function Pantalla() {
  const { estado = 'cena' } = useLocalSearchParams<{ estado?: string }>()
  const formato = estado === 'brunch' ? 'brunch' : estado === 'paseo' ? 'walk' : 'dinner'
  // Fechas de verdad: una cena a las 7:00 p.m. y un brunch o un paseo a las 11:00 a.m. (se revelan la víspera).
  const empiezaEn = formato === 'dinner' ? '2026-10-31T23:00:00Z' : '2026-11-01T15:00:00Z'
  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <ComoFunciona key={estado} plan={{ formato, empiezaEn, zonaHoraria: 'America/Caracas' }} abierta todas={estado === 'todas'} alCerrar={() => console.log('[catálogo] cerrar')} />
    </View>
  )
}

export default soloDesarrollo(Pantalla)

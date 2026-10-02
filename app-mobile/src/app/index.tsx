import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'

import { View } from 'react-native'

import { Boton, Texto, Velo, color, medida } from '../diseno'
import { Bienvenida } from '../entrada/Bienvenida'
import { api, listo, supabase } from '../sesion'
import { destinoDePaso, hayPendiente, terminarEntrada } from '../sesion/nativo'
import * as T from '../texto/entrar'

import { destinoAlAbrir, refrescarAvisos } from '../avisos/push'
import { BIENVENIDA_VISTA as VISTA } from '../entrada/bienvenida-vista'

/**
 * La puerta. Con sesión, a la cuenta. Sin ella, la bienvenida, pero SOLO LA
 * PRIMERA VEZ (nota de Design): quien ya la vio —cerró sesión, o se fue
 * sin terminar el alta— abre en Entrar, que tiene su «Empezar» para quien
 * aún no tiene cuenta.
 *
 * Y si la app murió entre entrar con Apple o Google y `/api/auth/nativo`
 * (queda la marca), se repite la llamada ANTES de decidir: es idempotente, y
 * el `paso` que devuelve dice a dónde va.
 */
export default function Inicio() {
  const [destino, setDestino] = useState<'cuenta' | 'entrar' | 'bienvenida' | 'sinTerminar' | { ruta: string } | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    ;(async () => {
      await listo
      const { data } = await supabase.auth.getSession()
      if (data.session && (await hayPendiente(AsyncStorage))) {
        const t = await terminarEntrada(api, AsyncStorage, T.sinTerminar.titulo)
        if (t.ok) return setDestino({ ruta: destinoDePaso(t.datos.paso) ?? '/cuenta' })
        if (t.status === 401) {
          await supabase.auth.signOut().catch(() => {})
          return setDestino('entrar')
        }
        return setDestino('sinTerminar')
      }
      if (data.session) {
        // El token del teléfono cambia sin avisar: con permiso ya dado, se refresca.
        refrescarAvisos()
        // Abierta tocando una push: a la pantalla de esa push, no al Inicio.
        const push = destinoAlAbrir()
        return setDestino(push ? { ruta: push } : 'cuenta')
      }
      const vista = await AsyncStorage.getItem(VISTA).catch(() => null)
      setDestino(vista ? 'entrar' : 'bienvenida')
      if (!vista) AsyncStorage.setItem(VISTA, '1').catch(() => {})
    })()
  }, [intento])

  if (destino === null) return <Velo sobreVerde />
  if (typeof destino === 'object') return <Redirect href={destino.ruta as never} />
  if (destino === 'sinTerminar')
    return (
      <View style={{ flex: 1, backgroundColor: color.verdeProfundo, justifyContent: 'center', padding: medida.margenLateral, gap: 14 }}>
        <Texto variante="titularGrande" tono="crema">
          {T.sinTerminar.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" tono="cuerpoSobreVerde">
          {T.sinTerminar.bajada}
        </Texto>
        <View style={{ marginTop: 12 }}>
          <Boton tipo="sobreVerde" texto={T.sinTerminar.reintentar} onPress={() => (setDestino(null), setIntento((x) => x + 1))} />
        </View>
      </View>
    )
  if (destino === 'cuenta') return <Redirect href="/cuenta" />
  if (destino === 'entrar') return <Redirect href="/entrar" />
  return <Bienvenida onEmpezar={() => router.push('/puerta')} onEntrar={() => router.push('/entrar')} />
}

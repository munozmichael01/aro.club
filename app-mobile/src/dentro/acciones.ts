import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import { Linking, Share } from 'react-native'

import * as T from '../texto/dentro'
import * as M from './maquina'

/**
 * Calendario y compartir, los mismos en Pago, en /estas-dentro y en Mi mesa.
 * El calendario es un enlace (sin módulo nativo, sale sin compilar) y se
 * recuerda por fecha para pintar «Ya está en tu calendario». Compartir, de
 * momento, es el texto con el enlace: la imagen de la historia necesita
 * módulos nativos y va en la próxima compilación.
 */
export function useAccionesDentro(clave: string | null, plan: M.Plan | null, codigo: string | null = null) {
  const [enCalendario, setEnCalendario] = useState(false)
  useEffect(() => {
    if (!clave) return
    AsyncStorage.getItem(`calendario:${clave}`)
      .then((v) => setEnCalendario(v === '1'))
      .catch(() => undefined)
  }, [clave])

  const alCalendario = useCallback(() => {
    if (!plan) return
    Linking.openURL(M.enlaceCalendario(plan)).catch(() => undefined)
    setEnCalendario(true)
    if (clave) AsyncStorage.setItem(`calendario:${clave}`, '1').catch(() => undefined)
  }, [plan, clave])

  const alCompartir = useCallback(() => {
    Share.share({ message: T.mensaje(codigo) }).catch(() => undefined)
  }, [codigo])

  return { enCalendario, alCalendario, alCompartir }
}

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createElement, useCallback, useEffect, useState } from 'react'
import { Linking, Share } from 'react-native'

import * as T from '../texto/dentro'
import { HojaCompartir } from './Compartir'
import { useInvitacion } from './invitacion'
import * as M from './maquina'

/**
 * Calendario y compartir, los mismos en Pago, en /estas-dentro y en Mi mesa.
 * El calendario es un enlace (sin módulo nativo, sale sin compilar) y se
 * recuerda por fecha para pintar «Ya está en tu calendario». Compartir abre
 * la hoja de las historias (`hoja`, que la pantalla pinta); los planes de
 * movimiento no tienen tarjeta y comparten solo el mensaje.
 */
export function useAccionesDentro(clave: string | null, plan: M.Plan | null) {
  const inv = useInvitacion()
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

  const [compartiendo, setCompartiendo] = useState(false)
  const historia = plan ? M.historia(plan, inv?.codigo ?? null) : null
  const alCompartir = useCallback(() => {
    if (historia) return setCompartiendo(true)
    Share.share({ message: T.mensaje(inv) }).catch(() => undefined)
  }, [historia, inv])

  const hoja = compartiendo && historia ? createElement(HojaCompartir, { h: historia, mensaje: T.mensaje(inv), alCerrar: () => setCompartiendo(false) }) : null

  return { enCalendario, alCalendario, alCompartir, hoja }
}

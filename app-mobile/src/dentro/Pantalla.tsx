import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { usePreguntaAvisos } from '../avisos/PreguntaAvisos'
import { AroCarga, Aviso, Boton, color } from '../diseno'
import * as T from '../texto/dentro'
import { useUltimo } from '../util/useUltimo'
import { useAccionesDentro } from './acciones'
import { EstasDentro } from './EstasDentro'
import * as M from './maquina'
import type { Datos, crearServicioDentro } from './servicio'

type Servicio = ReturnType<typeof crearServicioDentro>

/**
 * /estas-dentro: la reserva viva, en A si el pago sigue en revisión y en B si
 * no. Llegan aquí la reserva con crédito, la push y el correo de «pago
 * confirmado», y la primera apertura después de confirmar. La B se marca vista.
 */
export function PantallaDentro(p: { servicio: Servicio; via: M.Via; preguntarAvisos?: boolean; ir: (d: string) => void; alEntrar: () => void }) {
  const { servicio } = p
  const alEntrar = useUltimo(p.alEntrar)
  const ir = useUltimo(p.ir)
  const [d, setD] = useState<Datos | null | undefined>(undefined)
  const [fallo, setFallo] = useState('')
  const { preguntar, hoja } = usePreguntaAvisos()

  const cargar = useCallback(async () => {
    const r = await servicio.leer()
    if (!r.ok) {
      if (r.status === 401) return alEntrar.current()
      return setFallo(r.error)
    }
    setFallo('')
    // Sin reserva viva no hay nada que celebrar: al Inicio.
    if (!r.datos) return ir.current('/cuenta')
    setD(r.datos)
    if (!r.datos.pendiente) servicio.marcarVista(r.datos.reservaId)
  }, [servicio, alEntrar, ir])

  useFocusEffect(
    useCallback(() => {
      cargar()
    }, [cargar]),
  )

  // Acaba de apartar puesto con crédito: el tercer momento de la pregunta de los avisos.
  useEffect(() => {
    if (p.preguntarAvisos && d) preguntar('reserva')
  }, [p.preguntarAvisos, d, preguntar])

  const acciones = useAccionesDentro(d ? d.reservaId : null, d ? d.plan : null)

  if (!d) {
    return (
      <View style={{ flex: 1, backgroundColor: color.crema, justifyContent: 'center', padding: 24, gap: 16 }}>
        {fallo ? (
          <>
            <Aviso tono="ojo">{fallo}</Aviso>
            <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), cargar())} />
          </>
        ) : (
          <AroCarga tam={36} />
        )}
      </View>
    )
  }
  const v = M.vista(d.plan, d.pendiente ? 'A' : 'B', d.pendiente ? null : p.via)
  return (
    <>
      <EstasDentro v={v} enCalendario={acciones.enCalendario} alCalendario={acciones.alCalendario} alCompartir={acciones.alCompartir} ir={p.ir} />
      {hoja}
    </>
  )
}

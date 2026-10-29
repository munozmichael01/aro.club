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
 * /estas-dentro: la reserva viva, siempre en B; con el pago en revisión, con
 * el sello «Puesto apartado». Llegan aquí la reserva con crédito, la push y el correo de «pago
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
    servicio.marcarVista(r.datos.plan.empiezaEn)
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
  // Con el pago en revisión también es B (Michael, 29-10): «Puesto apartado».
  const v = M.vista(d.plan, 'B', d.pendiente ? 'reportado' : p.via)
  return (
    <>
      <EstasDentro v={v} enCalendario={acciones.enCalendario} alCalendario={acciones.alCalendario} alCompartir={acciones.alCompartir} ir={p.ir} />
      {hoja}
    </>
  )
}

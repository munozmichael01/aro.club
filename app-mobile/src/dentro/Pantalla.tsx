import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { usePreguntaAvisos } from '../avisos/PreguntaAvisos'
import { SinRespuesta, Tarda, color, useTarda, useUmbral } from '../diseno'
import * as T from '../texto/dentro'
import { useUltimo } from '../util/useUltimo'
import { useAccionesDentro } from './acciones'
import { EsqueletoDentro, EstasDentro } from './EstasDentro'
import * as M from './maquina'
import type { Datos, crearServicioDentro } from './servicio'

type Servicio = ReturnType<typeof crearServicioDentro>

/**
 * /estas-dentro: la reserva viva, siempre en B; con el pago en revisión, con
 * el sello «Puesto apartado». Llegan aquí la reserva con crédito, la push y el correo de «pago
 * confirmado», y la primera apertura después de confirmar. La B se marca vista.
 */
export function PantallaDentro(p: { servicio: Servicio; via: M.Via; evento?: string | null; preguntarAvisos?: boolean; ir: (d: string) => void; alEntrar: () => void }) {
  const { servicio } = p
  const alEntrar = useUltimo(p.alEntrar)
  const ir = useUltimo(p.ir)
  const [d, setD] = useState<Datos | null | undefined>(undefined)
  /** No llegó: por la red, o el servidor contestó con error («es cosa nuestra»). */
  const [caida, setCaida] = useState<{ servidor: boolean } | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const { preguntar, hoja } = usePreguntaAvisos()

  const cargar = useCallback(async () => {
    const r = await servicio.leer(p.evento)
    if (!r.ok) {
      if (r.status === 401) return alEntrar.current()
      return setCaida({ servidor: r.status !== undefined })
    }
    setCaida(null)
    // Sin reserva viva no hay nada que celebrar: al Inicio.
    if (!r.datos) return ir.current('/cuenta')
    setD(r.datos)
    servicio.marcarVista(r.datos.reservaId)
  }, [servicio, p.evento, alEntrar, ir])

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

  // Entrega carga (03-11): nada los primeros 0,4 s; luego el esqueleto, y a los 8 s «Está tardando…».
  const esperando = !d && !caida
  const esqueleto = useUmbral(esperando)
  const tarda = useTarda(esperando)
  const reintentar = async () => {
    setReintentando(true)
    await cargar()
    setReintentando(false)
  }

  if (!d || esqueleto) {
    if (caida && !esqueleto)
      return (
        <View style={{ flex: 1, backgroundColor: color.crema, justifyContent: 'center', padding: 24 }}>
          <SinRespuesta que={T.sinRespuesta.que} servidor={caida.servidor} alReintentar={reintentar} reintentando={reintentando} />
        </View>
      )
    if (esqueleto) return <EsqueletoDentro ir={p.ir} tarda={tarda ? <Tarda sobreVerde alReintentar={reintentar} /> : null} />
    return <View style={{ flex: 1, backgroundColor: color.verdeProfundo }} />
  }
  // Con el pago en revisión también es B (Michael, 29-10): «Puesto apartado».
  const v = M.vista(d.plan, 'B', d.pendiente ? 'reportado' : p.via)
  return (
    <>
      <EstasDentro v={v} enCalendario={acciones.enCalendario} alCalendario={acciones.alCalendario} alCompartir={acciones.alCompartir} ir={p.ir} masUno={d.masUno} vienesCon={d.vienesCon} />
      {acciones.hoja}
      {hoja}
    </>
  )
}

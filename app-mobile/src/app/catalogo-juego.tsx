import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Juego } from '../juego/Juego'
import { guardadoVacio, type Guardado } from '../juego/maquina'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * Catálogo: el juego con una mesa de ejemplo (entrega 20).
 * ?paso=reglas|pregunta|fin1|pausa|final. Sin `paso`, el juego de verdad,
 * guardando en este navegador.
 */
const con = (e: Guardado['e'], hechas: boolean[]): Guardado => ({ ...guardadoVacio(), e, hechas, empezado: true })
const PASOS: Record<string, Guardado> = {
  reglas: guardadoVacio(),
  pregunta: con({ paso: 'pregunta', ronda: 0, indice: 0 }, [false, false, false]),
  fin1: con({ paso: 'finRonda1', ronda: 0, indice: 0 }, [true, false, false]),
  pausa: con({ paso: 'pausa', ronda: 2, indice: 0 }, [true, true, false]),
  final: con({ paso: 'final', ronda: 2, indice: 0 }, [true, true, true]),
}

function Pantalla() {
  const { paso, ir } = useLocalSearchParams<{ paso?: string; ir?: string }>()
  const desde = useMemo(() => (paso ? PASOS[paso] : undefined), [paso])
  return <Juego key={paso ?? 'vivo'} desde={desde} ir={ir} mesaId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" alSalir={() => (router.canGoBack() ? router.back() : router.push('/catalogo-mesa?estado=en-curso'))} />
}

export default soloDesarrollo(Pantalla)

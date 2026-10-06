import { router, useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'

import { Juego } from '../juego/Juego'
import type { Estado } from '../juego/maquina'

/** Catálogo: el juego con una mesa de ejemplo. ?paso=reglas|pregunta|cambio|final (las preguntas, de reglas.js). */
const PASOS: Record<string, Estado> = {
  reglas: { paso: 'reglas', ronda: 0, indice: 0 },
  pregunta: { paso: 'pregunta', ronda: 1, indice: 1 },
  cambio: { paso: 'cambio', ronda: 2, indice: 0 },
  final: { paso: 'final', ronda: 2, indice: 1 },
}

export default function Pantalla() {
  const { paso } = useLocalSearchParams<{ paso?: string }>()
  const desde = useMemo(() => (paso ? PASOS[paso] : undefined), [paso])
  return <Juego key={paso ?? 'vivo'} desde={desde} mesaId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" alSalir={() => router.push('/catalogo-mesa?estado=juego-abierto')} />
}

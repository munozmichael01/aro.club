import { router } from 'expo-router'

import { Juego } from '../juego/Juego'

/** Catálogo: el juego de la mesa con una mesa de ejemplo (las preguntas, de reglas.js). */
export default function Pantalla() {
  return <Juego mesaId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" alSalir={() => router.push('/catalogo-mesa?estado=juego-abierto')} />
}

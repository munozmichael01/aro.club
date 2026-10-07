import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Boton, Selector, Texto } from '../diseno'
import * as T from '../texto/puerta'
import type { Ciudad } from './maquina'

/**
 * Debajo de las zonas del alta: «¿No vives en Caracas?». Cerrado, es solo el
 * enlace; al tocarlo aparecen la ayuda y el desplegable de ciudades (Michael:
 * no se enseñan todas de una). Las ciudades salen de `/api/ciudades`.
 */
export function OtraCiudad(p: { ciudades: Ciudad[]; alSeguir: (slug: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [slug, setSlug] = useState('')
  if (!p.ciudades.length) return null
  const elegida = p.ciudades.find((c) => c.slug === slug)
  if (!abierto)
    return (
      <Pressable onPress={() => setAbierto(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', marginTop: 18 }}>
        <Texto variante="cuerpo" tono="crema" style={{ textDecorationLine: 'underline' }}>
          {T.fuera.enlace}
        </Texto>
      </Pressable>
    )
  return (
    <View style={{ marginTop: 22, gap: 14 }}>
      <Texto variante="rotulo" tono="crema">
        {T.fuera.enlace}
      </Texto>
      <Texto variante="cuerpo" tono="sobreVerdeSecundario">
        {T.fuera.ayuda}
      </Texto>
      <Selector
        etiqueta={T.fuera.etiqueta}
        valor={slug}
        opciones={[{ valor: '', texto: T.fuera.elige }, ...p.ciudades.map((c) => ({ valor: c.slug, texto: c.nombre }))]}
        onCambio={setSlug}
      />
      {elegida ? <Boton tipo="sobreVerde" texto={T.fuera.seguir(elegida.slug === 'otra' ? elegida.nombre.toLowerCase() : elegida.nombre)} onPress={() => p.alSeguir(elegida.slug)} /> : null}
    </View>
  )
}

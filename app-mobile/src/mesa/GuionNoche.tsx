import { StyleSheet, View } from 'react-native'

import { Texto, color, fuente, tinta, verdeAlfa } from '../diseno'
import * as F from '../texto/fechas'
import * as T from '../texto/mesa'
import * as G from './guion'

/**
 * El anfitrión y el guion de la noche, en Mi mesa abierta (14-10-2026). Hecho
 * con los componentes del sistema mientras Design entrega
 * (`Design/BRIEF-anfitrion.md`). Lo ve toda la mesa; la persona anfitriona lo
 * tiene destacado arriba.
 */
export function GuionNoche(p: {
  empiezaEn: string | null | undefined
  cierraMesaEn?: string | null
  zonaHoraria?: string | null
  conJuego: boolean
  soyAnfitrion: boolean
  anfitrion: string | null
  ahora: number
}) {
  const pasos = G.pasos(p.empiezaEn, p.cierraMesaEn).filter((x) => p.conJuego || x.momento !== 'juego')
  if (!pasos.length) return null
  const actual = G.enCurso(pasos, p.ahora)
  return (
    <View style={{ marginTop: 30 }}>
      {p.soyAnfitrion ? (
        <View style={estilos.anfitrion}>
          <Texto variante="etiquetaChica" tono="cuerpoSobreVerde">{T.anfitrion.sello}</Texto>
          <Texto variante="subtitulo" tono="crema" style={{ marginTop: 6 }}>{T.anfitrion.tuTitulo}</Texto>
          <Texto variante="cuerpoChico" tono="cuerpoSobreVerde" style={{ marginTop: 8 }}>{T.anfitrion.tuTexto}</Texto>
        </View>
      ) : p.anfitrion ? (
        <Texto variante="cuerpoChico" tono="secundario" style={{ marginBottom: 12 }}>{T.anfitrion.otro(p.anfitrion)}</Texto>
      ) : null}

      <Texto variante="subtitulo">{T.guion.titulo}</Texto>
      <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 4, marginBottom: 14 }}>{T.guion.bajada}</Texto>
      {pasos.map((x, i) => {
        const m = T.guion.momentos[x.momento]
        const ahora = i === actual
        return (
          <View key={x.momento} style={[estilos.paso, ahora && estilos.pasoAhora, i < actual && { opacity: 0.55 }]}>
            <Texto variante="cuerpoChico" style={estilos.hora}>{F.horaEn(x.en, p.zonaHoraria ?? null)}</Texto>
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" style={{ fontSize: 16 }}>
                {m.nombre}
                {ahora ? <Texto variante="etiquetaChica" style={{ color: color.terracota }}>{'  ' + T.guion.ahora}</Texto> : null}
              </Texto>
              <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 2 }}>{m.texto}</Texto>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const estilos = StyleSheet.create({
  anfitrion: { borderRadius: 22, backgroundColor: color.verdeProfundo, padding: 18, marginBottom: 22 },
  paso: { flexDirection: 'row', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: tinta(0.1) },
  pasoAhora: { backgroundColor: verdeAlfa(0.08), borderRadius: 14, paddingHorizontal: 10, borderTopColor: 'transparent' },
  hora: { width: 72, fontFamily: fuente.textoSemi, fontVariant: ['tabular-nums'], color: color.verde },
})

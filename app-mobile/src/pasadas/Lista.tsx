import { Pressable, StyleSheet, View } from 'react-native'

import { AroCarga, Aviso, Boton, IconoAbrir, Texto, color, fuente, terracotaAlfa, tinta } from '../diseno'
import { reglas } from '../reglas'
import * as M from './maquina'

/**
 * Pasadas (entrega mi-mesa-pasadas, L1 y L2): las cenas de la más reciente a
 * la más vieja. «Pendiente» con texto; lo nuevo, con el punto y una línea que
 * dice qué es. Vacía, dice qué va a guardar e invita a la agenda.
 */
export function ListaPasadas(p: { d: M.DePasadas | null; fallo: string; alReintentar: () => void; alAbrir: (mesaId: string) => void; ir: (destino: string) => void }) {
  if (!p.d) {
    return p.fallo ? (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{p.fallo}</Aviso>
        <Boton tipo="secundario" texto="Volver a intentar" onPress={p.alReintentar} />
      </View>
    ) : (
      <View style={{ paddingTop: 24 }}>
        <AroCarga tam={36} />
      </View>
    )
  }

  if (!p.d.cenas.length) {
    const v = reglas.CONTACTO.pasadas.vacia
    return (
      <View style={{ gap: 14, paddingTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={e.hueco} />
        ))}
        <Texto variante="titularGrande" accessibilityRole="header" style={{ marginTop: 14 }}>
          {v.titulo}
        </Texto>
        <Texto variante="cuerpoGrande">{v.bajada}</Texto>
        <Boton texto={v.boton} ancho onPress={() => p.ir('/cuenta#agenda')} />
      </View>
    )
  }

  return (
    <View style={{ gap: 10 }}>
      {p.d.cenas.map((c) => {
        const f = M.filaDe(c)
        if (f.sinCena !== null || !c.mesaId) {
          // Canceló, no fue o no hubo mesa: en gris y sin abrirse (Michael, 31-10).
          return (
            <View key={`${c.eventoId}:${c.estado}`} accessible accessibilityLabel={[f.titulo, f.sinCena].filter(Boolean).join('. ')} style={[e.fila, e.filaGris]}>
              <View style={[e.ficha, { backgroundColor: '#E6DFCD' }]}>
                <Texto style={{ fontFamily: fuente.titular, fontSize: 20, lineHeight: 29, color: color.secundario }}>{f.numero}</Texto>
                <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 9.5, lineHeight: 12, letterSpacing: 1.1, color: color.secundario, marginTop: -4 }}>{f.mes}</Texto>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto style={{ fontFamily: fuente.titular, fontSize: 18, lineHeight: 26, color: color.secundario }}>{f.titulo}</Texto>
                {f.sinCena ? <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.84, color: color.secundario }}>{f.sinCena}</Texto> : null}
              </View>
            </View>
          )
        }
        const mesaId = c.mesaId
        return (
          <Pressable
            key={mesaId}
            onPress={() => p.alAbrir(mesaId)}
            accessibilityRole="button"
            accessibilityLabel={[f.titulo, f.sub, f.etiqueta, f.nuevo].filter(Boolean).join('. ')}
            style={[e.fila, f.punto ? { borderColor: color.terracota } : null]}
          >
            <View style={[e.ficha, { backgroundColor: f.resaltada ? color.verdeProfundo : '#ECE3CF' }]}>
              <Texto style={{ fontFamily: fuente.titular, fontSize: 20, lineHeight: 29, color: f.resaltada ? color.crema : color.verdeProfundo }}>{f.numero}</Texto>
              <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 9.5, lineHeight: 12, letterSpacing: 1.1, color: f.resaltada ? color.crema : color.secundario, marginTop: -4 }}>{f.mes}</Texto>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto style={{ fontFamily: fuente.titular, fontSize: 18, lineHeight: 26, color: color.verdeProfundo }}>{f.titulo}</Texto>
              {f.sub ? <Texto style={{ fontSize: 13, lineHeight: 17, color: color.cuerpo }}>{f.sub}</Texto> : null}
              {f.etiqueta ? (
                <View style={e.etiqueta}>
                  <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.84, color: color.verdeProfundo }}>{f.etiqueta.toUpperCase()}</Texto>
                </View>
              ) : null}
              {f.nuevo ? <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 13, lineHeight: 17, color: color.terracota }}>{f.nuevo}</Texto> : null}
            </View>
            {f.punto ? <View style={e.punto} /> : null}
            <IconoAbrir tam={16} color={color.verdeProfundo} />
          </Pressable>
        )
      })}
    </View>
  )
}

/** El punto terracota de «hay algo nuevo» (N): 8 a 10 px. */
export function Punto({ tam = 8 }: { tam?: number }) {
  return <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: color.terracota }} />
}

const e = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, backgroundColor: '#FFF8EA', borderWidth: 1, borderColor: tinta(0.1), paddingVertical: 14, paddingHorizontal: 14 },
  filaGris: { backgroundColor: '#F2ECDD', borderColor: tinta(0.08) },
  ficha: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#F6D9B4', paddingVertical: 4, paddingHorizontal: 9, marginTop: 4 },
  punto: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.terracota },
  hueco: { height: 62, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: terracotaAlfa(0.25) },
})

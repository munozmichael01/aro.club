import { ScrollView, View } from 'react-native'

import { Texto, color, cremaAlfa } from '../diseno'
import { FaseCorreo, FaseEnviando, FaseFinal, FaseQuiz, FaseRepetido, FaseSinPreguntas, Portada, Cabecera } from '../entrada/Fases'
import { inicial, reducir, type Estado } from '../entrada/maquina'
import type { Pregunta } from '../entrada/preguntas'

/**
 * Las fases de la entrada, una debajo de otra, con datos fijos. Es el
 * catálogo de desarrollo (como /catalogo): sirve para mirarlas sin recorrer
 * el flujo ni tocar la API. Estos datos NO están en el camino de pintado del
 * producto: la entrada real pinta solo lo que devuelve el servidor.
 */
const PREGUNTA: Pregunta = {
  clave: 'temas',
  enunciado: '¿De qué podrías hablar dos horas seguidas?',
  ayuda: null,
  unica: false,
  min: 2,
  max: 4,
  opciones: ['Cocina y restaurantes', 'Viajes', 'Cine y series', 'Música', 'Libros', 'Deporte'].map((label, i) => ({ valor: `v${i}`, label })),
}
const ARRAIGO: Pregunta = {
  clave: 'arraigo',
  enunciado: '¿Te suena alguna de estas?',
  ayuda: null,
  unica: true,
  min: 1,
  max: 1,
  opciones: ['Me fui del país y volví', 'Nunca me fui de Venezuela', 'Estoy de paso'].map((label, i) => ({ valor: `a${i}`, label })),
}

let quiz: Estado = { ...inicial('ana@correo.com'), fase: 'quiz', paso: 3 }
for (const v of ['v0', 'v1', 'v2', 'v3']) quiz = reducir(quiz, { tipo: 'marcar', pregunta: PREGUNTA, valor: v })
const quizArraigo = reducir({ ...inicial('ana@correo.com'), fase: 'quiz' as const }, { tipo: 'marcar', pregunta: ARRAIGO, valor: 'a1' })

function Muestra({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingVertical: 36, borderTopWidth: 1, borderColor: cremaAlfa(0.14) }}>
      <Texto variante="etiqueta" tono="terracotaSobreVerde" style={{ marginBottom: 20 }}>
        FASE · {nombre}
      </Texto>
      {children}
    </View>
  )
}

const nada = () => {}

export default function Pantalla() {
  return (
    <ScrollView style={{ backgroundColor: color.verdeProfundo }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <Cabecera onEntrar={nada} />
      <Muestra nombre="PORTADA + CORREO">
        <Portada chip="Caracas · la próxima se cierra en 4 días y 3 h" dia="sábado" />
        <FaseCorreo correo="" error="" yaTienePuesto={false} onCambio={nada} onEnviar={nada} />
      </Muestra>
      <Muestra nombre="CORREO CON ERROR">
        <FaseCorreo correo="ana@correo" error="Ese correo no se ve completo. Revisa que tenga arroba y punto." yaTienePuesto onCambio={nada} onEnviar={nada} />
      </Muestra>
      <Muestra nombre="ENVIANDO">
        <FaseEnviando correo="ana@correo.com" />
      </Muestra>
      <Muestra nombre="QUIZ · UNA SOLA">
        <FaseQuiz estado={quizArraigo} pregunta={ARRAIGO} total={4} guardando={false} onMarcar={nada} onSiguiente={nada} onAtras={nada} />
      </Muestra>
      <Muestra nombre="QUIZ · VARIAS, EN EL TOPE">
        <FaseQuiz estado={quiz} pregunta={PREGUNTA} total={4} guardando={false} onMarcar={nada} onSiguiente={nada} onAtras={nada} />
      </Muestra>
      <Muestra nombre="SIN PREGUNTAS">
        <FaseSinPreguntas onReintentar={nada} />
      </Muestra>
      <Muestra nombre="FINAL">
        <FaseFinal correo="ana@correo.com" hayFecha zonas={['Chacao', 'Altamira']} onCompletar={nada} onDespues={nada} />
      </Muestra>
      <Muestra nombre="REPETIDO">
        <FaseRepetido correo="ana@correo.com" onEntrar={nada} onOtro={nada} />
      </Muestra>
    </ScrollView>
  )
}

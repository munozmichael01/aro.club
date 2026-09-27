import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native'

import { color, cremaAlfa, fuente, medida, radio, tinta, verdeAlfa } from './tokens'

/**
 * Los botones de la hoja del sistema (§04): tres, y ninguno por debajo de
 * 44 px. Primario para el único paso siguiente, secundario para lo que
 * también sirve, fantasma para lo que se puede saltar. **Nunca dos
 * primarios en la misma vista.** Más la variante primaria sobre fondo verde.
 *
 * Cada uno tiene tres estados —reposo, presionado, deshabilitado— con los
 * colores exactos de la hoja.
 */
export type TipoBoton =
  | 'primario'
  | 'secundario'
  | 'fantasma'
  | 'sobreVerde'
  | 'secundarioSobreVerde'
  | 'fantasmaSobreVerde'

type Estado = { fondo: string; texto: string; borde?: string }

const ESTADOS: Record<TipoBoton, { reposo: Estado; presionado: Estado; inerte: Estado }> = {
  primario: {
    reposo: { fondo: color.verde, texto: color.crema },
    presionado: { fondo: color.terracota, texto: color.sobreTerracota },
    inerte: { fondo: verdeAlfa(0.13), texto: color.cuerpo },
  },
  secundario: {
    reposo: { fondo: 'transparent', texto: color.verde, borde: tinta(0.22) },
    presionado: { fondo: color.cremaElevada, texto: color.terracota, borde: color.terracota },
    inerte: { fondo: 'transparent', texto: color.inerte, borde: tinta(0.1) },
  },
  fantasma: {
    reposo: { fondo: 'transparent', texto: color.secundario },
    presionado: { fondo: 'transparent', texto: color.terracota },
    inerte: { fondo: 'transparent', texto: color.inerte },
  },
  sobreVerde: {
    reposo: { fondo: color.crema, texto: color.verdeProfundo },
    presionado: { fondo: color.terracotaSobreVerde, texto: color.verdeProfundo },
    inerte: { fondo: cremaAlfa(0.16), texto: color.cuerpoSobreVerde },
  },
  // Los dos del registro, sobre verde profundo: «Entrar a mi cuenta» y
  // «Atrás» / «Lo hago después» / «Usar otro correo».
  secundarioSobreVerde: {
    reposo: { fondo: 'transparent', texto: color.crema, borde: cremaAlfa(0.34) },
    presionado: { fondo: color.crema, texto: color.verdeProfundo, borde: color.crema },
    inerte: { fondo: 'transparent', texto: color.cuerpoSobreVerde, borde: cremaAlfa(0.16) },
  },
  fantasmaSobreVerde: {
    reposo: { fondo: 'transparent', texto: color.sobreVerdeSecundario },
    presionado: { fondo: 'transparent', texto: color.terracotaSobreVerde },
    inerte: { fondo: 'transparent', texto: cremaAlfa(0.3) },
  },
}

type Props = Omit<PressableProps, 'children' | 'style'> & {
  tipo?: TipoBoton
  texto: string
  /** Ocupa todo el ancho: lo normal en celular para el paso siguiente. */
  ancho?: boolean
  /**
   * Se VE apagado pero se puede pulsar: el «Faltan 2 en esta pantalla» del
   * cuestionario, que al pulsarlo lleva a lo que falta. Un botón muerto en
   * una pantalla que parece terminada se lee como que está rota.
   */
  apagado?: boolean
}

export function Boton({ tipo = 'primario', texto, ancho, disabled, apagado, ...resto }: Props) {
  const fantasma = tipo === 'fantasma' || tipo === 'fantasmaSobreVerde'
  return (
    <Pressable
      {...resto}
      disabled={disabled}
      accessibilityRole="button"
      aria-disabled={!!disabled}
      style={({ pressed }) => {
        const e = ESTADOS[tipo][disabled || apagado ? 'inerte' : pressed ? 'presionado' : 'reposo']
        return [
          estilos.base,
          ancho && estilos.ancho,
          { backgroundColor: e.fondo },
          e.borde ? { borderWidth: 1, borderColor: e.borde } : null,
        ]
      }}
    >
      {({ pressed }) => {
        const e = ESTADOS[tipo][disabled || apagado ? 'inerte' : pressed ? 'presionado' : 'reposo']
        return (
          <Text style={[estilos.texto, fantasma && estilos.textoFantasma, { color: e.texto }]}>{texto}</Text>
        )
      }}
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: {
    // `minHeight`, no `height`: con la letra del sistema al máximo el botón
    // crece en vez de cortar el texto (criterio 9.6).
    minHeight: medida.boton,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radio.capsula,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  ancho: { alignSelf: 'stretch' },
  texto: { fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19, textAlign: 'center' },
  textoFantasma: {
    fontFamily: fuente.textoMedia,
    textDecorationLine: 'underline',
  },
})

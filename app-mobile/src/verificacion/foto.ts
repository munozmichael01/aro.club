import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import { reescalado } from './tamano'

/**
 * Encoge y pasa a JPEG la foto hecha o elegida. De paso convierte el HEIC del
 * iPhone, que es otra familia entera de fallos que desaparece. Si algo falla,
 * se manda la original: mejor intentarlo que negarse (como la web).
 */
export async function encoger(uri: string, ancho: number, alto: number): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri)
    const r = reescalado(ancho, alto)
    if (r) ctx.resize(r)
    const img = await ctx.renderAsync()
    const hecha = await img.saveAsync({ compress: 0.82, format: SaveFormat.JPEG })
    return hecha.uri
  } catch (err) {
    if (__DEV__) console.warn('[verificación] no se pudo encoger la foto; va la original', String(err))
    return uri
  }
}

import { rutaDeEnlace } from '../enlaces'

/** Un enlace de aro.club (de un correo) llega aquí antes de navegar: se traduce a la pantalla de la app. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return rutaDeEnlace(path)
}

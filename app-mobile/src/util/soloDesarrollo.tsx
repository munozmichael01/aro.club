import { Redirect } from 'expo-router'
import type { ComponentType } from 'react'

/**
 * Las páginas del catálogo (`src/app/catalogo*.tsx`) son para revisar
 * pantallas con datos inventados mientras se desarrolla. Por cómo funciona
 * Expo Router, cualquier fichero de `src/app/` viaja en la app publicada y se
 * puede abrir con un enlace directo (`aroclub://catalogo-…`). Regla de Michael
 * (29-09 y 06-10-2026): nada de desarrollo en la app publicada.
 *
 * Fuera de `__DEV__` la página no se pinta: manda al inicio. En desarrollo
 * (Expo Go, el catálogo en el navegador) no cambia nada.
 * `pruebas/solo-desarrollo.test.ts` vigila que todas pasen por aquí.
 */
export function soloDesarrollo<P extends object>(Pantalla: ComponentType<P>): ComponentType<P> {
  if (__DEV__) return Pantalla
  return function FueraDeDesarrollo() {
    return <Redirect href="/" />
  }
}

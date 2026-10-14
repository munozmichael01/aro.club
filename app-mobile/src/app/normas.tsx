import { router } from 'expo-router'

import { Normas } from '../normas/Normas'

/** /normas: seguridad y normas. Sin sesión: se llega también desde Entrar. */
export default function Pantalla() {
  return <Normas alVolver={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
}

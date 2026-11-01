import type { Historia } from './maquina'
import { TarjetaHistoria } from './TarjetaHistoria'
import { TarjetaPlan } from './TarjetaPlan'

/** La tarjeta para historias que toca: TarjetaPlan en drinks y café, TarjetaHistoria en cena y brunch. */
export function Tarjeta({ variante, h, ancho }: { variante: number; h: Historia; ancho: number }) {
  return h.dePlan ? <TarjetaPlan variante={variante} d={h.dePlan} ancho={ancho} /> : <TarjetaHistoria variante={variante} h={h} ancho={ancho} />
}

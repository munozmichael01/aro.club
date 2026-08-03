import { createClient } from '@/lib/supabase/server'

/**
 * PROVISIONAL. Prueba de vida del Bloque A: verifica que el cliente de
 * servidor habla con Supabase y que las políticas de lectura pública de los
 * catálogos funcionan sin sesión.
 *
 * Se reemplaza por la landing (F1) en cuanto llegue el sistema de diseño.
 */
export default async function Home() {
  const supabase = await createClient()

  const [zones, questions, products] = await Promise.all([
    supabase.from('zones').select('slug, name').order('sort_order'),
    supabase.from('questions').select('key, screen').order('screen'),
    supabase.from('products').select('sku, price_usd').order('sort_order'),
  ])

  const checks = [
    { label: 'Zonas', result: zones, expected: 13 },
    { label: 'Preguntas', result: questions, expected: 17 },
    { label: 'Productos', result: products, expected: 3 },
  ]

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Aro Club</h1>
        <p className="text-sm text-neutral-500">
          Bloque A. Esta pantalla es provisional y desaparece con la landing.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {checks.map(({ label, result, expected }) => {
          const count = result.data?.length ?? 0
          const ok = !result.error && count === expected
          return (
            <li
              key={label}
              className="flex items-center justify-between border-b border-neutral-200 py-2 text-sm"
            >
              <span>{label}</span>
              <span className={ok ? 'text-green-700' : 'text-red-700'}>
                {result.error
                  ? `error: ${result.error.message}`
                  : `${count} de ${expected}`}
              </span>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

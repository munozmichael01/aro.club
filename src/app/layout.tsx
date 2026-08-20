import type { Metadata } from 'next'
import './globals.css'

import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${env.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    'Seis personas, una mesa, cada semana. Cenas curadas, con todo el mundo verificado.',
}

/**
 * Tipografía y color los define el sistema de diseño cuando llegue. Aquí no
 * se fija ninguna fuente a propósito: se usa la pila del sistema para que
 * nada quede elegido por omisión.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // es-VE afecta a la partición de palabras, al corrector del navegador y a
    // los lectores de pantalla.
    <html lang="es-VE" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  )
}

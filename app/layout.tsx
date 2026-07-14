import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'EpicStore - Premium Gear & Setup E-Commerce',
  description: 'Upgrade your productivity and desk setups with premium keycaps, mechanical keyboards, curved monitors, and mesh chairs.',
  keywords: 'ecommerce, trpc, next.js, mechanical keyboard, ergonomic chair, monitor, audio, setup',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

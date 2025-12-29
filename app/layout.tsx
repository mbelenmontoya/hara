import './globals.css'

export const metadata = {
  title: 'Hará Match - Admin',
  description: 'Performance-based lead marketplace for wellness professionals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

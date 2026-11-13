import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Sora, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SettingsProvider } from '@/lib/settings'

const THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("planner.settings")||"{}"),t=s.theme||"system",d=document.documentElement;if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;d.dataset.motion=s.motion||"full"}catch(e){}`

const sora = Sora({ variable: '--font-sora', subsets: ['latin'] })
const mono = JetBrains_Mono({ variable: '--font-jb', subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: 'Mi semestre — Horario, notas y exámenes',
  description: 'Organiza tu horario de clases, lleva el seguimiento de tus notas y registra las fechas de tus exámenes.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        media: '(prefers-color-scheme: light)',
        type: 'image/svg+xml',
      },
      {
        url: '/icon.svg',
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
  appleWebApp: { capable: true, title: 'Mi semestre', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1018' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${sora.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica tema y movimiento antes de pintar para evitar el parpadeo claro/oscuro */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <SettingsProvider>{children}</SettingsProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

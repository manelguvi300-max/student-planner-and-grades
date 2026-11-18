import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Mi semestre',
    short_name: 'Semestre',
    description: 'Horario, notas, agenda y faltas en un solo lugar',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    categories: ['education', 'productivity'],
    background_color: '#0e1018',
    theme_color: '#0e1018',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    // Atajos al mantener pulsado el icono (Android)
    shortcuts: [
      { name: 'Enfocarme', url: '/?tab=enfoque', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Agenda', url: '/?tab=examenes', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Horario', url: '/?tab=horario', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Notas', url: '/?tab=notas', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  }
}

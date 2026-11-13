import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mi semestre',
    short_name: 'Semestre',
    description: 'Horario, notas, exámenes y faltas en un solo lugar',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1018',
    theme_color: '#0e1018',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}

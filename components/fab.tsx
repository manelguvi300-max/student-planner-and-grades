"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Plus } from "lucide-react"

/** Móvil: botón flotante de "agregar" sobre la barra inferior. Va en un portal: las pestañas animan con transform y eso rompe `fixed`. */
export function Fab({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 grid size-14 animate-pop place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-black/30 transition active:scale-90 disabled:opacity-40 md:hidden">
      <Plus className="size-6" />
    </button>,
    document.body
  )
}

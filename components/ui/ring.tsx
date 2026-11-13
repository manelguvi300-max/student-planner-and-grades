"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** Anillo de progreso. El color sale de `className` (ej. "text-emerald-500"); se anima al montar. */
export function Ring({ value, size = 64, stroke = 6, className, children }: { value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = mounted ? Math.max(0, Math.min(1, value)) : 0
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-foreground/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn("text-foreground transition-[stroke-dashoffset] duration-1000 ease-out", className)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

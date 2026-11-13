"use client"

import { useEffect, useRef, useState } from "react"

/** Número que cuenta suavemente hasta su valor cada vez que cambia. */
export function CountUp({ value, decimals = 0, className = "" }: { value: number; decimals?: number; className?: string }) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900)
      setV(a + (value - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <span className={`num ${className}`}>
      {v.toLocaleString("es", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

"use client"

import { useEffect, useId, useRef } from "react"

/**
 * En el móvil, «Atrás» (botón de Android o gesto) debe cerrar la hoja abierta en vez de salir de la página.
 * Hay UNA sola entrada de historial compartida por todas las hojas: se agrega al abrirse la primera y se retira
 * cuando ya no queda ninguna abierta (así, pasar de una hoja a otra no la toca).
 */
const sheets = new Map<string, () => void>()
let pushed = false

function onPop() {
  pushed = false // el usuario ya retiró la entrada
  window.removeEventListener("popstate", onPop)
  ;[...sheets.values()].forEach((close) => close())
}

export function useSheetBack(open: boolean, onClose: () => void) {
  const id = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    sheets.set(id, () => closeRef.current())
    if (!pushed) {
      window.history.pushState({ sheet: true }, "")
      pushed = true
      window.addEventListener("popstate", onPop)
    }
    return () => {
      sheets.delete(id)
      // diferido: si otra hoja se abre en el mismo toque (o React remonta el efecto en desarrollo) no se retira nada
      setTimeout(() => {
        if (sheets.size === 0 && pushed) {
          pushed = false
          window.removeEventListener("popstate", onPop)
          window.history.back()
        }
      }, 0)
    }
  }, [open, id])
}

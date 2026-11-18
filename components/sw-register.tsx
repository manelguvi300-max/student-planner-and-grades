"use client"

import { useEffect } from "react"

/** Registra el service worker (solo en producción) para que la app abra aunque no haya internet. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])
  return null
}

/** Borra las copias guardadas (al cerrar sesión: en un dispositivo compartido no debe quedar nada del usuario anterior). */
export async function clearOfflineCache() {
  try {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k.startsWith("ms-pages")).map((k) => caches.delete(k)))
  } catch {}
}

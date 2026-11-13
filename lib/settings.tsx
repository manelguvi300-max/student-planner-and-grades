"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type TabKey = "hoy" | "horario" | "notas" | "examenes" | "faltas"

export type Settings = {
  timeFormat: "24h" | "12h"
  theme: "system" | "light" | "dark"
  motion: "full" | "reduced"
  rowHeight: "compact" | "normal" | "roomy"
  weekStart: "mon" | "sun"
  startTab: TabKey
}

export const DEFAULT_SETTINGS: Settings = {
  timeFormat: "24h",
  theme: "system",
  motion: "full",
  rowHeight: "normal",
  weekStart: "mon",
  startTab: "hoy",
}

export const SETTINGS_KEY = "planner.settings"

/** Píxeles por hora del horario según la densidad elegida. */
export const ROW_PX: Record<Settings["rowHeight"], number> = { compact: 30, normal: 38, roomy: 50 }

type Ctx = {
  settings: Settings
  /** true cuando ya se leyeron los ajustes guardados (evita aplicar valores por defecto antes de tiempo) */
  loaded: boolean
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

const SettingsContext = createContext<Ctx | null>(null)

function applyToDocument(s: Settings) {
  const dark = s.theme === "dark" || (s.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.dataset.theme = dark ? "dark" : "light"
  document.documentElement.dataset.motion = s.motion
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Los ajustes viven en este dispositivo (localStorage): se leen tras montar para no romper la hidratación.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    applyToDocument(settings)
    if (settings.theme !== "system") return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyToDocument(settings)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [settings])

  const save = useCallback((next: Settings) => {
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch {}
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      settings,
      loaded,
      set: (key, v) => save({ ...settings, [key]: v }),
      reset: () => save(DEFAULT_SETTINGS),
    }),
    [settings, loaded, save]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings debe usarse dentro de <SettingsProvider>")
  return ctx
}

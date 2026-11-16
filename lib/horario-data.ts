export type Subject = {
  id: string
  name: string
  bg: string
  border: string
  teacherName?: string
  teacherEmail?: string
  teacherPhone?: string
  officeHours?: string
}

export type ClassSession = {
  id: string
  subjectId: string
  day: number       // 0=Lunes … 4=Viernes
  startTime: number // minutos desde medianoche, ej: 360 = 6:00
  endTime: number   // minutos desde medianoche, ej: 480 = 8:00
  group: string
  room: string
}

export type Grade = {
  id: string
  name: string
  score: number
  weight: number
}

export type Exam = {
  id: string
  subjectId: string
  date: string
  group: "individual" | "grupal"
  kind: "examen" | "presentacion"
  weight: number
  notes?: string
  title?: string  // ej: "Parcial 1"
  time?: string   // "HH:MM"
  done?: boolean  // ya lo presenté / ya lo entregué
}

export type Absence = {
  id: string
  subjectId: string
  date: string
}

/** Cómo se fija el máximo de faltas de una materia. */
export type AbsenceMode = "calc" | "manual" | "none"

export type SubjectConfig = {
  mode?: AbsenceMode     // sin mode = "calc" (datos anteriores)
  directHours?: number   // HD: horas de trabajo directo (mode "calc")
  weeklyHours?: number   // intensidad semanal en horas (mode "calc"); por defecto 2
  percent?: number       // % de faltas permitido sobre las HD (mode "calc"); por defecto 20
  maxAbsences?: number   // máximo escrito a mano (mode "manual")
}

export const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"]

// Hora mínima por defecto: 6:00 (360 min), máxima por defecto: 20:00 (1200 min)
export const DEFAULT_START_HOUR = 6
export const DEFAULT_END_HOUR = 20

/** Convierte "HH:MM" a minutos desde medianoche */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** Convierte minutos desde medianoche a "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export type TimeFormat = "24h" | "12h"

/** Minutos → "6:00" / "8:30" (24 h) o "6:00 AM" / "2:30 PM" (12 h). */
export function minutesToLabel(minutes: number, format: TimeFormat = "24h"): string {
  const h = Math.floor(minutes / 60)
  const mm = String(minutes % 60).padStart(2, "0")
  if (format === "24h") return `${h}:${mm}`
  return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`
}

/** Etiqueta del eje de horas: "6:00" (24 h) o "6 AM" (12 h). */
export function hourLabel(hour: number, format: TimeFormat = "24h"): string {
  return format === "24h" ? `${hour}:00` : `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`
}

export type ColorSwatch = {
  bg: string
  border: string
}

// Únicamente los colores principales (pasteles curados). El usuario puede
// agregar colores personalizados adicionales, que se guardan aparte.
export const COLORS_PALETTE: ColorSwatch[] = [
  { bg: "#fbeec6", border: "#e0b53e" }, // crema
  { bg: "#f5aaa3", border: "#e26b60" }, // salmón
  { bg: "#aecdee", border: "#5b94d6" }, // azul
  { bg: "#d8e7f6", border: "#8fb8e0" }, // azul claro
  { bg: "#f4c79c", border: "#df9750" }, // naranja
  { bg: "#bcdcab", border: "#7cb45f" }, // verde
]

const CUSTOM_COLORS_KEY = "horario-custom-colors"

/** Genera un borde en tono más oscuro/saturado a partir de un color de fondo (hex). */
export function borderFromBg(hex: string): string {
  const clean = hex.replace("#", "")
  if (clean.length !== 6) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const darken = (c: number) => Math.max(0, Math.round(c * 0.72))
  const toHex = (c: number) => c.toString(16).padStart(2, "0")
  return `#${toHex(darken(r))}${toHex(darken(g))}${toHex(darken(b))}`
}

/** Lee del localStorage los colores personalizados guardados por el usuario. */
export function loadCustomColors(): ColorSwatch[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_COLORS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c): c is ColorSwatch => typeof c?.bg === "string" && typeof c?.border === "string"
    )
  } catch {
    return []
  }
}

/** Guarda un nuevo color personalizado (evitando duplicados) y devuelve la lista actualizada. */
export function saveCustomColor(swatch: ColorSwatch): ColorSwatch[] {
  const current = loadCustomColors()
  const exists = current.some((c) => c.bg.toLowerCase() === swatch.bg.toLowerCase())
  const next = exists ? current : [...current, swatch]
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(next))
    } catch {
      // almacenamiento no disponible, se ignora silenciosamente
    }
  }
  return next
}

/** Elimina un color personalizado guardado y devuelve la lista actualizada. */
export function removeCustomColor(bg: string): ColorSwatch[] {
  const next = loadCustomColors().filter((c) => c.bg.toLowerCase() !== bg.toLowerCase())
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(next))
    } catch {
      // almacenamiento no disponible, se ignora silenciosamente
    }
  }
  return next
}

export const PASSING_GRADE = 3.0
export const FINAL_WEIGHT = 25
export const DEFAULT_CLASSES: ClassSession[] = []

export function getSubject(subjects: Subject[], id: string) {
  return subjects.find((s) => s.id === id)
}

export function accumulatedPoints(grades: Grade[]) {
  return grades.reduce((acc, g) => acc + (g.score * g.weight) / 100, 0)
}

export function coveredWeight(grades: Grade[]) {
  return grades.reduce((acc, g) => acc + g.weight, 0)
}

export function neededOnFinal(grades: Grade[]) {
  const points = accumulatedPoints(grades)
  return (PASSING_GRADE - points) / (FINAL_WEIGHT / 100)
}

export const DEFAULT_PERCENT = 20
export const DEFAULT_WEEKLY_HOURS = 2

/** Máximo de faltas = ⌊ % × HD ÷ intensidad semanal ⌋ */
export function calcAbsenceLimit(directHours: number, weeklyHours: number, percent: number): number {
  return Math.floor((directHours * percent) / 100 / weeklyHours + 1e-9)
}

/** Máximo de faltas de una materia, o null si no tiene máximo (solo conteo o sin configurar). */
export function absenceLimitFor(cfg?: SubjectConfig): number | null {
  if (!cfg) return null
  const mode = cfg.mode ?? "calc"
  if (mode === "manual") return cfg.maxAbsences ?? null
  if (mode === "calc" && cfg.directHours && cfg.directHours > 0) {
    return calcAbsenceLimit(cfg.directHours, cfg.weeklyHours || DEFAULT_WEEKLY_HOURS, cfg.percent || DEFAULT_PERCENT)
  }
  return null
}

// Materias ocultas por pestaña (Notas, Exámenes, Faltas): se guardan con el planner y se sincronizan.
export type HiddenMap = Record<"notas" | "faltas" | "examenes", string[]>
export const NO_HIDDEN: HiddenMap = { notas: [], faltas: [], examenes: [] }
export function normalizeHidden(raw: unknown): HiddenMap {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof HiddenMap, unknown>>
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])
  return { notas: list(r.notas), faltas: list(r.faltas), examenes: list(r.examenes) }
}

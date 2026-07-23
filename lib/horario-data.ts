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
}

export type Absence = {
  id: string
  subjectId: string
  date: string
}

export type SubjectConfig = {
  directHours: number
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

/** Convierte minutos a etiqueta legible "6:00", "8:30", etc. */
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`
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

export function absenceLimit(directHours: number): number {
  return Math.floor((directHours * 0.2) / 2)
}
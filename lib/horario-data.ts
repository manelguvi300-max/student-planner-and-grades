export type Subject = {
  id: string
  name: string
  bg: string
  border: string
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

export const COLORS_PALETTE = [
  // Pasteles originales
  { bg: "#fbeec6", border: "#e0b53e" },
  { bg: "#f5aaa3", border: "#e26b60" },
  { bg: "#aecdee", border: "#5b94d6" },
  { bg: "#d8e7f6", border: "#8fb8e0" },
  { bg: "#f4c79c", border: "#df9750" },
  { bg: "#bcdcab", border: "#7cb45f" },
  { bg: "#f3e8ff", border: "#c084fc" },
  { bg: "#ccfbf1", border: "#2dd4bf" },
  { bg: "#ffedd5", border: "#fb923c" },
  // Nuevos pasteles
  { bg: "#fce7f3", border: "#f472b6" },
  { bg: "#ede9fe", border: "#a78bfa" },
  { bg: "#d1fae5", border: "#34d399" },
  { bg: "#fef9c3", border: "#facc15" },
  { bg: "#fee2e2", border: "#f87171" },
  { bg: "#e0f2fe", border: "#38bdf8" },
  { bg: "#f0fdf4", border: "#4ade80" },
  { bg: "#fff7ed", border: "#fb923c" },
  { bg: "#fdf4ff", border: "#e879f9" },
  { bg: "#ecfdf5", border: "#10b981" },
  { bg: "#f8fafc", border: "#94a3b8" },
  { bg: "#fef2f2", border: "#ef4444" },
]

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
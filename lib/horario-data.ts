export type Subject = {
  id: string
  name: string
  /** color de fondo (pastel) */
  bg: string
  /** color de borde/acento más saturado */
  border: string
}

export type ClassSession = {
  id: string
  subjectId: string
  day: number // 0 = Lunes ... 4 = Viernes
  block: number // índice dentro de BLOCKS
  room: string
}

export type Grade = {
  id: string
  name: string
  /** nota obtenida (escala 0 - 5) */
  score: number
  /** cuánto vale dentro del 100% (porcentaje) */
  weight: number
}

export type Exam = {
  id: string
  subjectId: string
  date: string // yyyy-mm-dd
  group: "individual" | "grupal"
  kind: "examen" | "presentacion"
  weight: number
}

export const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"]

export const BLOCKS = ["6 a 8", "8 a 10", "10 a 12", "12 a 2", "2 a 4", "4 a 6"]

export const SUBJECTS: Subject[] = [
  { id: "proyecto", name: "Proyecto 1", bg: "#fbeec6", border: "#e0b53e" },
  { id: "diseno", name: "Diseño y Arq. de Software", bg: "#f5aaa3", border: "#e26b60" },
  { id: "electronica", name: "Electronica Digital", bg: "#aecdee", border: "#5b94d6" },
  { id: "estadistica", name: "Estadistica", bg: "#d8e7f6", border: "#8fb8e0" },
  { id: "gestion", name: "Gestion de Datos", bg: "#f4c79c", border: "#df9750" },
  { id: "ingles", name: "Electiva Ingles", bg: "#bcdcab", border: "#7cb45f" },
]

export const PASSING_GRADE = 3.0
export const FINAL_WEIGHT = 25 // el final siempre vale 25%

export const DEFAULT_CLASSES: ClassSession[] = [
  { id: "c1", subjectId: "diseno", day: 1, block: 0, room: "62" },
  { id: "c2", subjectId: "gestion", day: 2, block: 0, room: "63" },
  { id: "c3", subjectId: "diseno", day: 3, block: 0, room: "62" },
  { id: "c4", subjectId: "gestion", day: 4, block: 0, room: "63" },
  { id: "c5", subjectId: "electronica", day: 1, block: 1, room: "61" },
  { id: "c6", subjectId: "proyecto", day: 2, block: 1, room: "402" },
  { id: "c7", subjectId: "electronica", day: 3, block: 1, room: "61" },
  { id: "c8", subjectId: "estadistica", day: 0, block: 2, room: "401" },
  { id: "c9", subjectId: "estadistica", day: 2, block: 2, room: "401" },
  { id: "c10", subjectId: "ingles", day: 3, block: 2, room: "Fantastic" },
  { id: "c11", subjectId: "estadistica", day: 4, block: 2, room: "401" },
]

export function getSubject(id: string) {
  return SUBJECTS.find((s) => s.id === id)
}

/** Suma de puntos ya asegurados: Σ(nota * peso/100) */
export function accumulatedPoints(grades: Grade[]) {
  return grades.reduce((acc, g) => acc + (g.score * g.weight) / 100, 0)
}

/** Porcentaje del curso ya calificado */
export function coveredWeight(grades: Grade[]) {
  return grades.reduce((acc, g) => acc + g.weight, 0)
}

/**
 * Nota necesaria en el final (que vale 25%) para que el acumulado
 * quede como mínimo en PASSING_GRADE (3.0).
 */
export function neededOnFinal(grades: Grade[]) {
  const points = accumulatedPoints(grades)
  return (PASSING_GRADE - points) / (FINAL_WEIGHT / 100)
}

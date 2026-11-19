/** Un horario de asesoría de un profesor: un día de la semana y una franja (minutos desde medianoche). */
export type OfficeSlot = { id: string; day: number; start: number; end: number }

/**
 * Un profesor. Vive en un directorio propio (no dentro de una materia): así sus datos se escriben una sola vez
 * aunque dé varias materias, y se puede crear antes de asignarle alguna.
 */
export type Teacher = {
  id: string
  name: string
  role?: string    // "Teoría", "Laboratorio", "Monitor"…
  email?: string
  phone?: string
  office?: string  // oficina / salón
  hours?: string   // nota de asesorías en texto libre ("previa cita por correo")
  slots?: OfficeSlot[] // horarios de asesoría estructurados (alimentan la vista Asesorías)
}

export type Subject = {
  id: string
  name: string
  bg: string
  border: string
  teacherIds?: string[] // profesores asignados (ids del directorio)
  credits?: number // créditos académicos (opcional): ponderan el promedio
  // Formatos anteriores (profesores dentro de la materia): se pasan al directorio con migrateTeachers().
  teachers?: Teacher[]
  teacherName?: string
  teacherEmail?: string
  teacherPhone?: string
  officeHours?: string
}

/** Roles sugeridos al agregar un profesor. */
export const TEACHER_ROLES = ["Teoría", "Laboratorio", "Monitor"]

/** El directorio de profesores se guarda dentro de subjectConfigs (misma columna), bajo esta clave reservada. */
export const TEACHERS_KEY = "__teachers"

/* ───────────── Semestres ─────────────
 * El semestre ACTIVO vive en las columnas de siempre (materias, clases, notas…), así que todo el resto de la app no se entera.
 * Los demás semestres se guardan archivados dentro de subjectConfigs[SEMESTERS_KEY] (sin migrar la base de datos).
 * Se comparten entre semestres la regla global de faltas, las categorías y el estudio; los profesores van con cada semestre. */
export const SEMESTERS_KEY = "__semesters"

export type Semester = { id: string; name: string }
export type SemesterData = {
  subjects: Subject[]
  classes: ClassSession[]
  grades: Record<string, Grade[]>
  exams: Exam[]
  absences: Absence[]
  subjectConfigs: Record<string, SubjectConfig>
  hidden: HiddenMap
}
export type SemestersMeta = { list: Semester[]; activeId: string; archive: Record<string, SemesterData> }

/** Lo que ya estaba registrado antes de existir los semestres pertenece a este. */
export const DEFAULT_SEMESTER: Semester = { id: "2026-2", name: "2026-2" }

export const semestersFromConfigs = (c: Record<string, SubjectConfig>): SemestersMeta =>
  c[SEMESTERS_KEY]?.semesters ?? { list: [DEFAULT_SEMESTER], activeId: DEFAULT_SEMESTER.id, archive: {} }

export const withSemesters = (c: Record<string, SubjectConfig>, semesters: SemestersMeta): Record<string, SubjectConfig> => ({ ...c, [SEMESTERS_KEY]: { semesters } })

/** Siguiente nombre sugerido: 2026-2 → 2027-1, 2026-1 → 2026-2. Si no sigue ese formato, queda vacío. */
export function nextSemesterName(name: string): string {
  const m = /^(\d{4})-([12])$/.exec(name.trim())
  if (!m) return ""
  return m[2] === "1" ? `${m[1]}-2` : `${Number(m[1]) + 1}-1`
}

export const teachersFromConfigs = (c: Record<string, SubjectConfig>): Teacher[] => c[TEACHERS_KEY]?.teachers ?? []
export const withDirectory = (c: Record<string, SubjectConfig>, teachers: Teacher[]): Record<string, SubjectConfig> => ({ ...c, [TEACHERS_KEY]: { teachers } })

/** Profesores asignados a una materia. */
export function teachersOf(s: Subject, directory: Teacher[]): Teacher[] {
  return (s.teacherIds ?? []).map((id) => directory.find((t) => t.id === id)).filter((t): t is Teacher => !!t)
}

/** Materias a las que está asignado un profesor. */
export const subjectsOf = (teacherId: string, subjects: Subject[]) => subjects.filter((s) => s.teacherIds?.includes(teacherId))

/** Pasa los profesores que estaban dentro de cada materia (formato anterior) al directorio. `changed` = hubo algo que migrar. */
export function migrateTeachers(subjects: Subject[], configs: Record<string, SubjectConfig>) {
  const directory = [...teachersFromConfigs(configs)]
  let changed = false
  const next = subjects.map((s) => {
    const old: Teacher[] = s.teachers ?? (s.teacherName || s.teacherEmail || s.teacherPhone || s.officeHours
      ? [{ id: `legacy-${s.id}`, name: s.teacherName ?? "", email: s.teacherEmail, phone: s.teacherPhone, hours: s.officeHours }]
      : [])
    if (!old.length && s.teachers === undefined) return s
    changed = true
    for (const t of old) if (!directory.some((d) => d.id === t.id)) directory.push(t)
    const ids = [...(s.teacherIds ?? [])]
    for (const t of old) if (!ids.includes(t.id)) ids.push(t.id)
    const { teachers: _t, teacherName: _n, teacherEmail: _e, teacherPhone: _p, officeHours: _o, ...rest } = s
    return { ...rest, teacherIds: ids }
  })
  return { subjects: next, configs: changed ? withDirectory(configs, directory) : configs, changed }
}

/** Iniciales para el avatar de un profesor: "María Pérez" → "MP". */
export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
}

export type ClassSession = {
  id: string
  subjectId: string
  day: number       // 0=Lunes … 4=Viernes
  startTime: number // minutos desde medianoche, ej: 360 = 6:00
  endTime: number   // minutos desde medianoche, ej: 480 = 8:00
  group: string
  room: string
  teacherId?: string // profesor que da esta clase (de los de la materia)
}

export type Grade = {
  id: string
  name: string
  score: number
  weight: number
}

export type Exam = {
  id: string
  subjectId: string  // "" = evento sin materia (una reunión, una actividad suelta…)
  date: string
  group: "individual" | "grupal"
  kind: string    // id de una categoría de la agenda (ver EventKind)
  weight: number
  notes?: string
  title?: string  // ej: "Parcial 1"
  time?: string   // "HH:MM"
  done?: boolean  // ya lo presenté / ya lo entregué
}

/* ───────────── Categorías de la agenda ─────────────
 * Hay unas de fábrica y cada persona puede crear las suyas (nombre + color).
 * Las personalizadas se guardan en subjectConfigs[KINDS_KEY]; se comparten entre semestres. */
export const KINDS_KEY = "__kinds"

export const KIND_COLORS = {
  rose: "#f43f5e", orange: "#f97316", amber: "#f59e0b", emerald: "#10b981",
  sky: "#0ea5e9", indigo: "#6366f1", violet: "#8b5cf6", slate: "#64748b",
} as const
export type KindColor = keyof typeof KIND_COLORS

export type EventKind = { id: string; name: string; color: KindColor; builtin?: boolean }

export const BUILTIN_KINDS: EventKind[] = [
  { id: "examen", name: "Examen", color: "rose", builtin: true },
  { id: "presentacion", name: "Presentación", color: "violet", builtin: true },
  { id: "tarea", name: "Tarea", color: "amber", builtin: true },
  { id: "entrega", name: "Entrega", color: "orange", builtin: true },
  { id: "reunion", name: "Reunión", color: "sky", builtin: true },
  { id: "actividad", name: "Actividad", color: "emerald", builtin: true },
]

export const kindsFromConfigs = (c: Record<string, SubjectConfig>): EventKind[] => c[KINDS_KEY]?.kinds ?? []
export const withKinds = (c: Record<string, SubjectConfig>, kinds: EventKind[]): Record<string, SubjectConfig> => ({ ...c, [KINDS_KEY]: { kinds } })

/** Todas las categorías: las de fábrica primero, luego las propias. */
export const allKinds = (custom: EventKind[]): EventKind[] => [...BUILTIN_KINDS, ...custom]

/** Busca una categoría por id; si ya no existe (se borró), se muestra como un evento neutro. */
export const findKind = (custom: EventKind[], id: string): EventKind =>
  allKinds(custom).find((k) => k.id === id) ?? { id, name: "Evento", color: "slate" }

/**
 * Con el modo automático, un evento sin marcar cuenta como hecho cuando ya pasó su hora (o su día, si no tiene hora).
 * Lo que marques o desmarques a mano siempre manda (`done` definido). No cambia los datos guardados.
 */
export function resolveDone(exams: Exam[], auto: boolean, now: Date): Exam[] {
  if (!auto) return exams
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const passed = (e: Exam) => e.date < today || (e.date === today && !!e.time && Number(e.time.slice(0, 2)) * 60 + Number(e.time.slice(3, 5)) <= nowMin)
  return exams.map((e) => (e.done === undefined && passed(e) ? { ...e, done: true } : e))
}

export type Absence = {
  id: string
  subjectId: string
  date: string
  hours?: number  // horas que faltó ese día (solo cuando la regla cuenta en horas)
}

/** Cómo se fija el máximo de faltas de una materia. */
export type AbsenceMode = "calc" | "manual" | "none"
/** En qué se cuentan: clases completas (cada falta = 1 clase) u horas (cada falta registra cuántas horas faltó). */
export type AbsenceUnit = "classes" | "hours"

/**
 * Config de faltas. Se guarda en subjectConfigs por id de materia, y la regla GLOBAL
 * (la que usan todas las materias sin regla propia) bajo GLOBAL_CONFIG_KEY.
 */
export const GLOBAL_CONFIG_KEY = "__global"

export type SubjectConfig = {
  teachers?: Teacher[]  // solo en la entrada reservada TEACHERS_KEY: el directorio de profesores
  semesters?: SemestersMeta // solo en la entrada reservada SEMESTERS_KEY: la lista de semestres y los archivados
  kinds?: EventKind[]    // solo en la entrada reservada KINDS_KEY: las categorías propias de la agenda
  custom?: boolean       // true = la materia tiene regla propia (mode/percent/maxAbsences); si no, usa la global
  mode?: AbsenceMode     // regla: "calc" | "manual" | "none"
  percent?: number       // regla "calc": % de las HD que se puede faltar (20 por defecto)
  maxAbsences?: number   // regla "manual": máximo escrito a mano (en clases u horas, según unit)
  unit?: AbsenceUnit     // regla: "classes" (por defecto) u "hours"
  directHours?: number   // datos de la materia: HD, horas de trabajo directo
  blockHours?: number    // horas por clase (bloque) con que se divide para contar clases enteras; 2 por defecto
  weeklyHours?: number   // nombre anterior de blockHours (se sigue leyendo)
  goal?: number          // meta de nota de la materia (3.0 por defecto)
  study?: StudyEntry[]   // solo en la entrada reservada STUDY_KEY: el registro del modo enfoque
}

/* ───────────── Modo enfoque: registro de estudio ─────────────
 * Una fila por día y materia con los minutos acumulados. Se guarda en subjectConfigs[STUDY_KEY]
 * (se comparte entre semestres; las materias que ya no existen simplemente no se muestran). */
export const STUDY_KEY = "__study"
export type StudyEntry = { d: string; s: string; m: number } // fecha YYYY-MM-DD, id de materia («» = sin materia), minutos

export const studyFromConfigs = (c: Record<string, SubjectConfig>): StudyEntry[] => c[STUDY_KEY]?.study ?? []
export const withStudy = (c: Record<string, SubjectConfig>, study: StudyEntry[]): Record<string, SubjectConfig> => ({ ...c, [STUDY_KEY]: { ...c[STUDY_KEY], study } })
/** Meta diaria de estudio en minutos (se guarda junto al registro, en `goal`). */
export const withStudyGoal = (c: Record<string, SubjectConfig>, goal: number): Record<string, SubjectConfig> => ({ ...c, [STUDY_KEY]: { ...c[STUDY_KEY], goal } })

/** Suma `minutes` al día y materia indicados; descarta lo de hace más de 180 días para que el registro no crezca sin límite. */
export function addStudy(list: StudyEntry[], date: string, subjectId: string, minutes: number): StudyEntry[] {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 180)
  const min = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`
  const kept = list.filter((e) => e.d >= min)
  const i = kept.findIndex((e) => e.d === date && e.s === subjectId)
  if (i < 0) return [...kept, { d: date, s: subjectId, m: minutes }]
  return kept.map((e, j) => (j === i ? { ...e, m: e.m + minutes } : e))
}

/** Plan para llegar a una meta de nota: qué promedio hace falta en lo que aún no se califica. */
export function goalPlan(grades: Grade[], goal: number) {
  const points = accumulatedPoints(grades)
  const remaining = 100 - coveredWeight(grades)
  const maxPossible = points + (remaining / 100) * 5
  if (remaining <= 0) return { state: points >= goal - 1e-9 ? ("done" as const) : ("lost" as const), needed: 0, points, remaining, maxPossible }
  const needed = (goal - points) / (remaining / 100)
  const state = needed <= 1e-9 ? ("secured" as const) : needed > 5 + 1e-9 ? ("out" as const) : ("open" as const)
  return { state, needed, points, remaining, maxPossible }
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

/** Promedio del acumulado de las materias con notas; si hay créditos, cada materia pesa según sus créditos (sin créditos cuenta como 1). */
export function averageOf(subjects: Subject[], grades: Record<string, Grade[]>) {
  const graded = subjects.filter((s) => coveredWeight(grades[s.id] ?? []) > 0)
  if (graded.length === 0) return { avg: null as number | null, weighted: false }
  const w = (s: Subject) => (s.credits && s.credits > 0 ? s.credits : 1)
  const total = graded.reduce((n, s) => n + w(s), 0)
  return {
    avg: graded.reduce((n, s) => n + accumulatedPoints(grades[s.id]) * w(s), 0) / total,
    weighted: graded.some((s) => s.credits && s.credits > 0),
  }
}

export function coveredWeight(grades: Grade[]) {
  return grades.reduce((acc, g) => acc + g.weight, 0)
}

export function neededOnFinal(grades: Grade[], goal = PASSING_GRADE) {
  const points = accumulatedPoints(grades)
  return (goal - points) / (FINAL_WEIGHT / 100)
}

export const DEFAULT_PERCENT = 20
export const DEFAULT_BLOCK_HOURS = 2

/**
 * Faltas permitidas: el % de las HD, en horas. Contadas en clases se divide entre las horas por clase
 * (⌊ % × HD ÷ bloque ⌋); contadas en horas se deja tal cual.
 */
export function calcAbsenceLimit(directHours: number, blockHours: number, percent: number, unit: AbsenceUnit = "classes"): number {
  const hours = (directHours * percent) / 100
  return unit === "hours" ? Math.round(hours * 100) / 100 : Math.floor(hours / blockHours + 1e-9)
}

/** 9.6 → "9.6", 2 → "2" */
export const fmtHours = (n: number) => String(Math.round(n * 100) / 100)

/** ¿Tiene la materia su propia regla? (los datos con `mode` y sin `custom` vienen de cuando cada materia se configuraba sola). */
export const hasOwnRule = (cfg?: SubjectConfig) => cfg?.custom ?? cfg?.mode !== undefined

/**
 * Regla efectiva de una materia: la suya si tiene regla propia, si no la global.
 * limit = null cuando no hay máximo (solo conteo) o falta algún dato (needsHours).
 */
export function resolveAbsence(cfg: SubjectConfig | undefined, global: SubjectConfig | undefined) {
  const custom = hasOwnRule(cfg)
  const rule = custom ? cfg! : (global ?? {})
  const mode: AbsenceMode = rule.mode ?? "calc"
  const unit: AbsenceUnit = mode === "none" ? "classes" : (rule.unit ?? "classes")
  const block = cfg?.blockHours || cfg?.weeklyHours || rule.blockHours || rule.weeklyHours || DEFAULT_BLOCK_HOURS
  const base = { mode, custom, unit, block }
  if (mode === "none") return { ...base, limit: null, needsHours: false }
  if (mode === "manual") return { ...base, limit: rule.maxAbsences ?? null, needsHours: false }
  const hd = cfg?.directHours
  if (!hd || hd <= 0) return { ...base, limit: null, needsHours: true }
  return { ...base, limit: calcAbsenceLimit(hd, block, rule.percent || DEFAULT_PERCENT, unit), needsHours: false }
}

/** Regla + lo que lleva gastado de faltas (clases u horas) y si está en riesgo o cancelada. */
export function absenceStatus(cfg: SubjectConfig | undefined, global: SubjectConfig | undefined, list: Absence[]) {
  const r = resolveAbsence(cfg, global)
  const used = r.unit === "hours" ? list.reduce((n, a) => n + (a.hours ?? r.block), 0) : list.length
  const remaining = r.limit === null ? null : Math.round((r.limit - used) * 100) / 100
  const cancelled = remaining !== null && remaining < 0
  // en riesgo: queda menos de una clase (1 clase, o las horas de un bloque)
  const atRisk = remaining !== null && !cancelled && remaining <= (r.unit === "hours" ? r.block : 1)
  return { ...r, used, remaining, cancelled, atRisk }
}

// Materias ocultas por pestaña (Notas, Exámenes, Faltas): se guardan con el planner y se sincronizan.
export type HiddenMap = Record<"notas" | "faltas" | "examenes", string[]>
export const NO_HIDDEN: HiddenMap = { notas: [], faltas: [], examenes: [] }
export function normalizeHidden(raw: unknown): HiddenMap {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof HiddenMap, unknown>>
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])
  return { notas: list(r.notas), faltas: list(r.faltas), examenes: list(r.examenes) }
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { migrateFromLocal, savePlannerData, type PlannerState } from "@/app/actions/planner"
import { DEFAULT_CLASSES, NO_HIDDEN, normalizeHidden, migrateTeachers, teachersFromConfigs, withDirectory, kindsFromConfigs, withKinds, semestersFromConfigs, withSemesters, SEMESTERS_KEY, type SemesterData, type Teacher, type EventKind, type ClassSession, type Exam, type Grade, type Absence, type SubjectConfig, type HiddenMap } from "@/lib/horario-data"
import type { Subject } from "@/lib/horario-data"

const LOCAL_KEYS = {
  classes: "horario.classes",
  grades: "horario.grades",
  exams: "horario.exams",
} as const

const MIGRATED_FLAG = "horario.migrated"
// Antes las materias ocultas vivían solo en este dispositivo; se suben una vez y se borran de aquí.
const OLD_HIDDEN_KEY = "planner_hidden_subjects"
const hiddenCount = (h: HiddenMap) => h.notas.length + h.faltas.length + h.examenes.length

function readLocalState(): PlannerState | null {
  try {
    const rawClasses = window.localStorage.getItem(LOCAL_KEYS.classes)
    const rawGrades = window.localStorage.getItem(LOCAL_KEYS.grades)
    const rawExams = window.localStorage.getItem(LOCAL_KEYS.exams)

    if (rawClasses === null && rawGrades === null && rawExams === null) return null

    return {
      subjects: [],
      classes: rawClasses ? (JSON.parse(rawClasses) as ClassSession[]) : DEFAULT_CLASSES,
      grades: rawGrades ? (JSON.parse(rawGrades) as Record<string, Grade[]>) : {},
      exams: rawExams ? (JSON.parse(rawExams) as Exam[]) : [],
      absences: [],
      subjectConfigs: {},
    }
  } catch {
    return null
  }
}

const EMPTY_SEMESTER: SemesterData = { subjects: [], classes: [], grades: {}, exams: [], absences: [], subjectConfigs: {}, hidden: NO_HIDDEN }
const isReserved = (k: string) => k.startsWith("__")

export function usePlanner(initial: PlannerState) {
  // Los datos llegan ya cargados desde el servidor (ver app/page.tsx); migrateTeachers pasa a los profesores antiguos al directorio.
  const [init] = useState(() => {
    const mig = migrateTeachers(initial.subjects ?? [], initial.subjectConfigs ?? {})
    return { ...initial, subjects: mig.subjects, subjectConfigs: mig.configs, hidden: normalizeHidden(initial.hidden) }
  })
  const [subjects, setSubjects] = useState<Subject[]>(init.subjects)
  const [classes, setClasses] = useState<ClassSession[]>(init.classes)
  const [grades, setGrades] = useState<Record<string, Grade[]>>(init.grades)
  const [exams, setExams] = useState<Exam[]>(init.exams)
  const [absences, setAbsences] = useState<Absence[]>(init.absences ?? [])
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, SubjectConfig>>(init.subjectConfigs)
  const [hidden, setHidden] = useState<HiddenMap>(init.hidden)

  // Una sola vez por dispositivo: datos del localStorage antiguo y materias ocultas de este dispositivo.
  useEffect(() => {
    let cancelled = false
    async function legacy() {
      try {
        if (!window.localStorage.getItem(MIGRATED_FLAG)) {
          const local = readLocalState()
          if (local) {
            const data = await migrateFromLocal(local)
            if (cancelled) return
            const mig = migrateTeachers(data.subjects ?? [], data.subjectConfigs ?? {})
            setSubjects(mig.subjects)
            setClasses(data.classes)
            setGrades(data.grades)
            setExams(data.exams)
            setAbsences(data.absences ?? [])
            setSubjectConfigs(mig.configs)
          }
          window.localStorage.setItem(MIGRATED_FLAG, "true")
        }
        const old = window.localStorage.getItem(OLD_HIDDEN_KEY)
        if (old) {
          const local = normalizeHidden(JSON.parse(old))
          if (!hiddenCount(init.hidden) && hiddenCount(local)) setHidden(local) // la cuenta aún no tenía ocultas: se adoptan las de este dispositivo
          window.localStorage.removeItem(OLD_HIDDEN_KEY)
        }
      } catch {}
    }
    legacy()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guardado: se espera a que el usuario deje de editar (700 ms) y se envía todo junto. Si la app pasa a segundo plano
  // o se cierra con cambios pendientes, se envían al instante (en el móvil el sistema puede matar la app en cualquier momento).
  const latest = useRef<PlannerState>({ subjects, classes, grades, exams, absences, subjectConfigs, hidden })
  latest.current = { subjects, classes, grades, exams, absences, subjectConfigs, hidden }
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRun = useRef(true)

  const flush = useRef(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (!dirty.current) return
    dirty.current = false
    savePlannerData(latest.current).catch(() => { dirty.current = true }) // si falla, el siguiente cambio lo reintenta
  }).current

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return } // el primer render son los datos del servidor: nada que guardar
    dirty.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }, [subjects, classes, grades, exams, absences, subjectConfigs, hidden, flush])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush() }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", flush)
    window.addEventListener("online", flush) // al volver la red se envían los cambios que quedaron pendientes
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); window.removeEventListener("online", flush); flush() }
  }, [flush])

  // directorio de profesores (vive dentro de subjectConfigs, sin cambiar la base de datos)
  const teachers = useMemo(() => teachersFromConfigs(subjectConfigs), [subjectConfigs])
  const setTeachers = (u: Teacher[] | ((prev: Teacher[]) => Teacher[])) =>
    setSubjectConfigs((prev) => withDirectory(prev, typeof u === "function" ? u(teachersFromConfigs(prev)) : u))

  // categorías propias de la agenda (también dentro de subjectConfigs)
  const kinds = useMemo(() => kindsFromConfigs(subjectConfigs), [subjectConfigs])
  const setKinds = (u: EventKind[] | ((prev: EventKind[]) => EventKind[])) =>
    setSubjectConfigs((prev) => withKinds(prev, typeof u === "function" ? u(kindsFromConfigs(prev)) : u))

  // semestres: el activo vive en el estado de siempre; los demás, archivados dentro de subjectConfigs (ver horario-data)
  const semesters = useMemo(() => semestersFromConfigs(subjectConfigs), [subjectConfigs])

  /** Guarda el semestre actual en el archivo y carga `target` (todo junto, para que se guarde una sola vez). */
  function loadSemester(nextId: string, list: typeof semesters.list, target: SemesterData, archive: typeof semesters.archive) {
    const current: SemesterData = {
      subjects, classes, grades, exams, absences, hidden,
      subjectConfigs: Object.fromEntries(Object.entries(subjectConfigs).filter(([k]) => !isReserved(k))),
    }
    const nextArchive = { ...archive, [semesters.activeId]: current }
    delete nextArchive[nextId]
    // lo compartido entre semestres (directorio de profesores, regla global de faltas) se queda
    const shared = Object.fromEntries(Object.entries(subjectConfigs).filter(([k]) => isReserved(k) && k !== SEMESTERS_KEY))
    setSubjects(target.subjects)
    setClasses(target.classes)
    setGrades(target.grades)
    setExams(target.exams)
    setAbsences(target.absences)
    setHidden(target.hidden)
    setSubjectConfigs(withSemesters({ ...target.subjectConfigs, ...shared }, { list, activeId: nextId, archive: nextArchive }))
  }

  const switchSemester = (id: string) => {
    if (id === semesters.activeId || !semesters.list.some((s) => s.id === id)) return
    loadSemester(id, semesters.list, semesters.archive[id] ?? EMPTY_SEMESTER, semesters.archive)
  }

  /** Crea un semestre vacío ("desde 0") y lo activa. */
  const createSemester = (name: string) => {
    const clean = name.trim()
    if (!clean) return
    const id = `s-${Date.now().toString(36)}`
    loadSemester(id, [...semesters.list, { id, name: clean }], EMPTY_SEMESTER, semesters.archive)
  }

  const updateMeta = (list: typeof semesters.list, archive = semesters.archive) =>
    setSubjectConfigs((prev) => withSemesters(prev, { list, activeId: semesters.activeId, archive }))

  const renameSemester = (id: string, name: string) => {
    const clean = name.trim()
    if (clean) updateMeta(semesters.list.map((s) => (s.id === id ? { ...s, name: clean } : s)))
  }

  /** Borra un semestre archivado (el activo no se puede borrar). */
  const deleteSemester = (id: string) => {
    if (id === semesters.activeId) return
    const { [id]: _gone, ...archive } = semesters.archive
    updateMeta(semesters.list.filter((s) => s.id !== id), archive)
  }

  return {
    semesters, switchSemester, createSemester, renameSemester, deleteSemester,
    teachers, setTeachers,
    kinds, setKinds,
    subjects, setSubjects,
    classes, setClasses,
    grades, setGrades,
    exams, setExams,
    absences, setAbsences,
    subjectConfigs, setSubjectConfigs,
    hidden, setHidden,
  }
}
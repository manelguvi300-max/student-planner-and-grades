"use client"

import { useEffect, useRef, useState } from "react"
import { getPlannerData, migrateFromLocal, savePlannerData, type PlannerState } from "@/app/actions/planner"
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

export type PlannerStatus = "loading" | "saving" | "saved"

export function usePlanner() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassSession[]>(DEFAULT_CLASSES)
  const [grades, setGrades] = useState<Record<string, Grade[]>>({})
  const [exams, setExams] = useState<Exam[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, SubjectConfig>>({})
  const [hidden, setHidden] = useState<HiddenMap>(NO_HIDDEN)
  const [status, setStatus] = useState<PlannerStatus>("loading")

  const ready = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let data = await getPlannerData()

        if (!window.localStorage.getItem(MIGRATED_FLAG)) {
          const local = readLocalState()
          if (local) {
            data = await migrateFromLocal(local)
          }
          window.localStorage.setItem(MIGRATED_FLAG, "true")
        }

        if (cancelled) return
        // los profesores que estaban dentro de cada materia pasan al directorio (se guarda en el siguiente guardado)
        const mig = migrateTeachers(data.subjects ?? [], data.subjectConfigs ?? {})
        setSubjects(mig.subjects)
        setClasses(data.classes)
        setGrades(data.grades)
        setExams(data.exams)
        setAbsences(data.absences ?? [])
        setSubjectConfigs(mig.configs)
        let h = normalizeHidden(data.hidden)
        try {
          const old = window.localStorage.getItem(OLD_HIDDEN_KEY)
          if (old) {
            const local = normalizeHidden(JSON.parse(old))
            if (!hiddenCount(h) && hiddenCount(local)) h = local // la cuenta aún no tenía ocultas: se adoptan las de este dispositivo
            window.localStorage.removeItem(OLD_HIDDEN_KEY)
          }
        } catch {}
        setHidden(h)
        setStatus("saved")
        ready.current = true
      } catch {
        if (!cancelled) setStatus("saved")
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready.current) return

    setStatus("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(() => {
      savePlannerData({ subjects, classes, grades, exams, absences, subjectConfigs, hidden })
        .then(() => setStatus("saved"))
        .catch(() => setStatus("saved"))
    }, 700)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [subjects, classes, grades, exams, absences, subjectConfigs, hidden])

  // directorio de profesores (vive dentro de subjectConfigs, sin cambiar la base de datos)
  const teachers = teachersFromConfigs(subjectConfigs)
  const setTeachers = (u: Teacher[] | ((prev: Teacher[]) => Teacher[])) =>
    setSubjectConfigs((prev) => withDirectory(prev, typeof u === "function" ? u(teachersFromConfigs(prev)) : u))

  // categorías propias de la agenda (también dentro de subjectConfigs)
  const kinds = kindsFromConfigs(subjectConfigs)
  const setKinds = (u: EventKind[] | ((prev: EventKind[]) => EventKind[])) =>
    setSubjectConfigs((prev) => withKinds(prev, typeof u === "function" ? u(kindsFromConfigs(prev)) : u))

  // semestres: el activo vive en el estado de siempre; los demás, archivados dentro de subjectConfigs (ver horario-data)
  const semesters = semestersFromConfigs(subjectConfigs)

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
    status,
  }
}
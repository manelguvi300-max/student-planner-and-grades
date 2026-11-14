"use client"

import { useEffect, useRef, useState } from "react"
import { getPlannerData, migrateFromLocal, savePlannerData, type PlannerState } from "@/app/actions/planner"
import { DEFAULT_CLASSES, NO_HIDDEN, normalizeHidden, type ClassSession, type Exam, type Grade, type Absence, type SubjectConfig, type HiddenMap } from "@/lib/horario-data"
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
        setSubjects(data.subjects ?? [])
        setClasses(data.classes)
        setGrades(data.grades)
        setExams(data.exams)
        setAbsences(data.absences ?? [])
        setSubjectConfigs(data.subjectConfigs ?? {})
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

  return {
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
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getPlannerData, migrateFromLocal, savePlannerData, type PlannerState } from "@/app/actions/planner"
import { DEFAULT_CLASSES, type ClassSession, type Exam, type Grade } from "@/lib/horario-data"

// Claves antiguas usadas por la versión que guardaba en localStorage.
const LOCAL_KEYS = {
  classes: "horario.classes",
  grades: "horario.grades",
  exams: "horario.exams",
} as const

const MIGRATED_FLAG = "horario.migrated"

function readLocalState(): PlannerState | null {
  try {
    const rawClasses = window.localStorage.getItem(LOCAL_KEYS.classes)
    const rawGrades = window.localStorage.getItem(LOCAL_KEYS.grades)
    const rawExams = window.localStorage.getItem(LOCAL_KEYS.exams)

    if (rawClasses === null && rawGrades === null && rawExams === null) {
      return null
    }

    return {
      classes: rawClasses ? (JSON.parse(rawClasses) as ClassSession[]) : DEFAULT_CLASSES,
      grades: rawGrades ? (JSON.parse(rawGrades) as Record<string, Grade[]>) : {},
      exams: rawExams ? (JSON.parse(rawExams) as Exam[]) : [],
    }
  } catch {
    return null
  }
}

export type PlannerStatus = "loading" | "saving" | "saved"

export function usePlanner() {
  const [classes, setClasses] = useState<ClassSession[]>(DEFAULT_CLASSES)
  const [grades, setGrades] = useState<Record<string, Grade[]>>({})
  const [exams, setExams] = useState<Exam[]>([])
  const [status, setStatus] = useState<PlannerStatus>("loading")

  // Evita guardar durante la carga inicial.
  const ready = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carga inicial: trae datos del servidor y migra localStorage si aplica.
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let data = await getPlannerData()

        // Migración única desde localStorage.
        if (!window.localStorage.getItem(MIGRATED_FLAG)) {
          const local = readLocalState()
          if (local) {
            data = await migrateFromLocal(local)
          }
          window.localStorage.setItem(MIGRATED_FLAG, "true")
        }

        if (cancelled) return
        setClasses(data.classes)
        setGrades(data.grades)
        setExams(data.exams)
        setStatus("saved")
        ready.current = true
      } catch {
        if (!cancelled) setStatus("saved")
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Guardado automático con debounce cuando cambian los datos.
  useEffect(() => {
    if (!ready.current) return

    setStatus("saving")
    if (saveTimer.current) clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(() => {
      savePlannerData({ classes, grades, exams })
        .then(() => setStatus("saved"))
        .catch(() => setStatus("saved"))
    }, 700)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [classes, grades, exams])

  return {
    classes,
    setClasses,
    grades,
    setGrades,
    exams,
    setExams,
    status,
  }
}

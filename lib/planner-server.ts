import { db } from "@/lib/db"
import { plannerData } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { PlannerState } from "@/app/actions/planner"
import type { ClassSession, Exam, Grade, Absence, SubjectConfig, Subject } from "@/lib/horario-data"
import { DEFAULT_CLASSES, NO_HIDDEN, normalizeHidden } from "@/lib/horario-data"

/**
 * Lee (o crea) el planner de un usuario. Vive aparte de las acciones del servidor para poder llamarlo
 * directamente desde la página: así los datos llegan ya en el HTML y no hay que pedirlos tras cargar.
 */
export async function loadPlanner(userId: string): Promise<PlannerState> {
  const rows = await db.select().from(plannerData).where(eq(plannerData.userId, userId)).limit(1)

  if (rows.length === 0) {
    const initial: PlannerState = {
      subjects: [],
      classes: DEFAULT_CLASSES,
      grades: {},
      exams: [],
      absences: [],
      subjectConfigs: {},
      hidden: NO_HIDDEN,
    }
    const { hidden, ...rest } = initial
    await db.insert(plannerData).values({ userId, ...rest, hiddenSubjects: hidden }).onConflictDoNothing()
    return initial
  }

  const row = rows[0]
  return {
    subjects: (row.subjects as Subject[]) ?? [],
    classes: (row.classes as ClassSession[]) ?? [],
    grades: (row.grades as Record<string, Grade[]>) ?? {},
    exams: (row.exams as Exam[]) ?? [],
    absences: (row.absences as Absence[]) ?? [],
    subjectConfigs: (row.subjectConfigs as Record<string, SubjectConfig>) ?? {},
    hidden: normalizeHidden(row.hiddenSubjects),
  }
}

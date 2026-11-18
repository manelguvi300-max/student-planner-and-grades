"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, EyeOff, Eye, Target, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Ring } from "@/components/ui/ring"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSheetBack } from "@/lib/use-sheet-back"
import { CountUp } from "@/components/ui/count-up"
import { cn } from "@/lib/utils"
import {
  PASSING_GRADE,
  accumulatedPoints,
  averageOf,
  goalPlan,
  coveredWeight,
  type Subject,
  type Grade,
  type SubjectConfig,
} from "@/lib/horario-data"

type GradesMap = Record<string, Grade[]>

type Props = {
  subjects: Subject[]
  grades: GradesMap
  setGrades: React.Dispatch<React.SetStateAction<GradesMap>>
  subjectConfigs: Record<string, SubjectConfig>
  setSubjectConfigs: React.Dispatch<React.SetStateAction<Record<string, SubjectConfig>>>
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

export function NotasTab({ subjects, grades, setGrades, subjectConfigs, setSubjectConfigs, hiddenSubjects, onToggleHidden }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Todas las materias inician contraídas (en móvil y en escritorio).
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false
      const next = { ...prev }
      for (const s of subjects) {
        if (!(s.id in next)) {
          next[s.id] = false
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [subjects])

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }))
  }

  const visibleSubjects = subjects.filter((s) => !hiddenSubjects.includes(s.id))
  const hiddenSubjectsList = subjects.filter((s) => hiddenSubjects.includes(s.id))

  // Promedio del ACUMULADO de las materias visibles (las ocultas no cuentan; las que aún no tienen notas tampoco).
  // El estado "aprobando / en riesgo" sí mira el promedio de lo ya calificado de cada materia.
  const graded = visibleSubjects.filter((s) => coveredWeight(grades[s.id] ?? []) > 0)
  const { avg, weighted } = averageOf(visibleSubjects, grades)
  const passing = graded.filter((s) => {
    const g = grades[s.id]
    return accumulatedPoints(g) / (coveredWeight(g) / 100) >= PASSING_GRADE
  }).length
  const failing = graded.length - passing
  const noGrades = visibleSubjects.length - graded.length

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4 rounded-xl border bg-card p-4 sm:gap-5 sm:p-5">
        {avg !== null && (
          // el anillo cambia de color según vayas: verde si el acumulado ya alcanza para aprobar, ámbar si no
          <Ring value={avg / 5} size={76} stroke={6} className={avg >= PASSING_GRADE ? "text-emerald-500" : "text-amber-500"}>
            <span className="text-center leading-none">
              <CountUp value={avg} decimals={2} className="text-lg font-bold" />
              <span className="mt-1 block text-[10px] text-muted-foreground">de 5</span>
            </span>
          </Ring>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">Mis notas</h2>
          <p className={cn("mt-0.5 text-xs text-muted-foreground sm:text-sm", avg !== null && "hidden sm:block")}>
            {avg === null ? "Agrega notas a tus materias para ver tu promedio." : weighted ? "Promedio ponderado por créditos de tus materias visibles." : "Promedio del acumulado de tus materias visibles."}
          </p>
          {avg !== null && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium sm:mt-3">
              <span className="rounded-full bg-foreground/10 px-2.5 py-1">{passing} aprobando</span>
              {failing > 0 && <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-destructive">{failing} en riesgo</span>}
              {noGrades > 0 && <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-muted-foreground">{noGrades} sin notas</span>}
            </div>
          )}
        </div>
      </section>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-lg bg-card animate-scale-in">
          <p className="text-sm text-muted-foreground">
            No tienes materias creadas. Ve al horario y crea tus materias para poder agregar notas.
          </p>
        </div>
      ) : (
        <>
          {/* Materias visibles */}
          <>
            {/* Móvil: una sola lista en el orden original */}
            <div className="space-y-4 sm:hidden animate-slide-up">
              {visibleSubjects.map((s) => (
                <SubjectGrades
                  key={s.id}
                  subjectId={s.id}
                  name={s.name}
                  bg={s.bg}
                  border={s.border}
                  grades={grades[s.id] ?? []}
                  setGrades={setGrades}
                  expanded={expanded[s.id] ?? false}
                  onToggle={() => toggleExpanded(s.id)}
                  onToggleHidden={() => onToggleHidden(s.id)}
                  isHidden={false}
                  goal={subjectConfigs[s.id]?.goal ?? PASSING_GRADE}
                  onGoal={(g) => setSubjectConfigs((prev) => ({ ...prev, [s.id]: { ...prev[s.id], goal: g } }))}
                />
              ))}
            </div>

            {/* Escritorio: dos columnas independientes, conservando el mismo orden/emparejamiento de siempre */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-2 sm:items-start animate-slide-up">
              <div className="space-y-4">
                {visibleSubjects
                  .filter((_, i) => i % 2 === 0)
                  .map((s) => (
                    <SubjectGrades
                      key={s.id}
                      subjectId={s.id}
                      name={s.name}
                      bg={s.bg}
                      border={s.border}
                      grades={grades[s.id] ?? []}
                      setGrades={setGrades}
                      expanded={expanded[s.id] ?? false}
                      onToggle={() => toggleExpanded(s.id)}
                      onToggleHidden={() => onToggleHidden(s.id)}
                      isHidden={false}
                  goal={subjectConfigs[s.id]?.goal ?? PASSING_GRADE}
                  onGoal={(g) => setSubjectConfigs((prev) => ({ ...prev, [s.id]: { ...prev[s.id], goal: g } }))}
                    />
                  ))}
              </div>
              <div className="space-y-4">
                {visibleSubjects
                  .filter((_, i) => i % 2 === 1)
                  .map((s) => (
                    <SubjectGrades
                      key={s.id}
                      subjectId={s.id}
                      name={s.name}
                      bg={s.bg}
                      border={s.border}
                      grades={grades[s.id] ?? []}
                      setGrades={setGrades}
                      expanded={expanded[s.id] ?? false}
                      onToggle={() => toggleExpanded(s.id)}
                      onToggleHidden={() => onToggleHidden(s.id)}
                      isHidden={false}
                  goal={subjectConfigs[s.id]?.goal ?? PASSING_GRADE}
                  onGoal={(g) => setSubjectConfigs((prev) => ({ ...prev, [s.id]: { ...prev[s.id], goal: g } }))}
                    />
                  ))}
              </div>
            </div>
          </>

          {/* Materias ocultas (colapsadas con opción de restaurar) */}
          {hiddenSubjectsList.length > 0 && (
            <div className="stagger space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Materias ocultas en esta vista</p>
              <div className="flex flex-wrap gap-2">
                {hiddenSubjectsList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onToggleHidden(s.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    style={{ borderColor: s.border, backgroundColor: s.bg + "60" }}
                  >
                    <Eye className="size-3" />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SubjectGrades({
  subjectId,
  name,
  bg,
  border,
  grades,
  setGrades,
  expanded,
  onToggle,
  onToggleHidden,
  goal,
  onGoal,
}: {
  subjectId: string
  name: string
  bg: string
  border: string
  grades: Grade[]
  setGrades: React.Dispatch<React.SetStateAction<GradesMap>>
  expanded: boolean
  onToggle: () => void
  onToggleHidden: () => void
  isHidden: boolean
  goal: number
  onGoal: (goal: number) => void
}) {
  // La hoja de agregar/editar se mantiene montada: al cerrarse solo cambia `open`, así no parpadea al salir.
  const [sheet, setSheet] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const editing = sheet.id ? grades.find((g) => g.id === sheet.id) ?? null : null

  const usedWeight = coveredWeight(grades)
  const remainingWeight = 100 - usedWeight
  const points = accumulatedPoints(grades)

  function save(v: { name: string; score: number; weight: number }) {
    if (editing) {
      setGrades((prev) => ({ ...prev, [subjectId]: (prev[subjectId] ?? []).map((g) => (g.id === editing.id ? { ...g, ...v } : g)) }))
    } else {
      setGrades((prev) => ({ ...prev, [subjectId]: [...(prev[subjectId] ?? []), { id: crypto.randomUUID(), ...v }] }))
    }
    setSheet((s) => ({ ...s, open: false }))
  }

  function remove() {
    if (!editing) return
    setGrades((prev) => ({ ...prev, [subjectId]: (prev[subjectId] ?? []).filter((g) => g.id !== editing.id) }))
    setSheet((s) => ({ ...s, open: false }))
  }

  return (
    <Card className="gap-0 overflow-hidden p-0 animate-pop">
      {/* Header (clic para contraer/expandir) */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggle()
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="flex min-h-[4.5rem] cursor-pointer select-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-foreground/[0.03]"
      >
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: border }} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight">{name}</h3>
          <p className="num text-xs text-muted-foreground">{grades.length > 0 ? `${usedWeight}% calificado` : "Sin notas"}</p>
        </div>
        {grades.length > 0 && (
          <Ring value={usedWeight / 100} size={42} stroke={4}>
            <span className="num text-[10px] font-semibold">{points.toFixed(1)}</span>
          </Ring>
        )}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", expanded && "rotate-180")} />
      </div>

      {/* Cuerpo colapsable (animación fluida con CSS grid) */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t px-4 pb-4 pt-4">
            {/* Lo importante primero: cuánto necesitas y qué pasaría si… */}
            {grades.length > 0 && <GoalPanel grades={grades} goal={goal} onGoal={onGoal} />}

            {/* Evaluaciones: tocar una fila la edita; agregar abre la misma hoja */}
            <section className={cn(grades.length > 0 && "border-t pt-3")}>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluaciones</h4>
              {grades.length > 0 && (
                <ul className="stagger divide-y divide-border/60">
                  {grades.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => setSheet({ open: true, id: g.id })}
                        aria-label={`Editar ${g.name}`}
                        className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition active:scale-[0.99] active:bg-foreground/[0.05] hover:bg-foreground/[0.03]"
                      >
                        <span className={cn("num grid h-9 w-12 shrink-0 place-items-center rounded-xl text-base font-semibold", g.score >= PASSING_GRADE ? "bg-foreground/10" : "bg-destructive/15 text-destructive")}>
                          {g.score.toFixed(1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{g.name}</span>
                          <span className="num block text-xs text-muted-foreground">vale {g.weight}% · aporta {fmt((g.score * g.weight) / 100)}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {grades.length === 0 ? (
                <div className="space-y-3 py-3 text-center">
                  <p className="text-sm text-muted-foreground">Aún no hay notas. Agrega la primera para ver cuánto necesitas.</p>
                  <Button onClick={() => setSheet({ open: true, id: null })} className="min-h-11 w-full"><Plus className="size-4" />Agregar la primera nota</Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSheet({ open: true, id: null })}
                  disabled={remainingWeight <= 0}
                  className="-mx-2 mt-1 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-medium transition active:scale-[0.99] active:bg-foreground/[0.05] enabled:hover:bg-foreground/[0.03] disabled:opacity-60"
                >
                  <span className="grid h-9 w-12 shrink-0 place-items-center rounded-xl border border-dashed border-foreground/30 text-brand"><Plus className="size-4" /></span>
                  <span className="flex-1">Agregar nota</span>
                  <span className="num text-xs font-normal text-muted-foreground">{remainingWeight > 0 ? `queda ${remainingWeight}%` : "100% asignado"}</span>
                </button>
              )}
            </section>

            <button type="button" onClick={onToggleHidden} className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <EyeOff className="size-3.5" />Ocultar de esta vista
            </button>
          </div>
        </div>
      </div>

      <GradeSheet
        open={sheet.open}
        isNew={sheet.id === null}
        grade={editing}
        subjectName={name}
        maxWeight={remainingWeight + (editing?.weight ?? 0)}
        fallbackName={`Nota ${grades.length + 1}`}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={save}
        onDelete={remove}
      />
    </Card>
  )
}

/** Hoja para agregar o editar una nota: dos números grandes, un atajo para «el resto» y cuánto aporta a la nota final. */
function GradeSheet({ open, isNew, grade, subjectName, maxWeight, fallbackName, onClose, onSave, onDelete }: {
  open: boolean
  isNew: boolean
  grade: Grade | null
  subjectName: string
  maxWeight: number
  fallbackName: string
  onClose: () => void
  onSave: (v: { name: string; score: number; weight: number }) => void
  onDelete: () => void
}) {
  const [gName, setGName] = useState("")
  const [score, setScore] = useState("")
  const [weight, setWeight] = useState("")
  const [error, setError] = useState("")
  const [confirm, setConfirm] = useState(false)
  useSheetBack(open, onClose)

  // Cada vez que se abre arranca con los datos de la nota (o vacío si es nueva)
  useEffect(() => {
    if (!open) return
    setGName(grade?.name ?? ""); setScore(grade ? String(grade.score).replace(".", ",") : ""); setWeight(grade ? String(grade.weight) : "")
    setError(""); setConfirm(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, grade?.id])

  const s = Number(score.replace(",", "."))
  const w = Number(weight.replace(",", "."))
  const scoreOk = score.trim() !== "" && Number.isFinite(s) && s >= 0 && s <= 5
  const weightOk = weight.trim() !== "" && Number.isFinite(w) && w > 0 && w <= maxWeight

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!scoreOk) return setError("La nota va de 0 a 5.")
    if (!(Number.isFinite(w) && w > 0)) return setError("Indica cuánto vale (mayor a 0%).")
    if (w > maxWeight) return setError(`Solo queda ${maxWeight}% por asignar.`)
    onSave({ name: gName.trim() || fallbackName, score: Math.round(s * 100) / 100, weight: Math.round(w * 100) / 100 })
  }

  const field = "num h-14 rounded-xl text-center text-2xl font-semibold"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="gap-5 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nueva nota" : "Editar nota"}</DialogTitle>
          <DialogDescription>{subjectName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="grade-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</label>
            <Input id="grade-name" value={gName} onChange={(e) => setGName(e.target.value)} placeholder={fallbackName} maxLength={40} className="h-11 text-base" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="grade-score" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nota (0–5)</label>
              <Input id="grade-score" value={score} onChange={(e) => { setScore(e.target.value); setError("") }} placeholder="3,5" inputMode="decimal" enterKeyHint="next" maxLength={4} className={field} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="grade-weight" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vale (%)</label>
              <Input id="grade-weight" value={weight} onChange={(e) => { setWeight(e.target.value); setError("") }} placeholder="20" inputMode="decimal" enterKeyHint="done" maxLength={5} className={field} />
            </div>
          </div>

          <p aria-live="polite" className={cn("num min-h-5 text-sm", error ? "font-medium text-destructive" : "text-muted-foreground")}>
            {error || (scoreOk && weightOk ? <>Aporta <b className="text-foreground">{fmt((s * w) / 100)}</b> a tu nota final.</> : `Queda ${maxWeight}% por asignar en esta materia.`)}
          </p>

          <div className="sheet-actions flex items-center gap-2">
            {!isNew && (confirm ? (
              <>
                <span className="mr-auto text-sm text-muted-foreground">¿Eliminar esta nota?</span>
                <Button type="button" variant="ghost" onClick={() => setConfirm(false)}>No</Button>
                <Button type="button" variant="destructive" onClick={onDelete}>Eliminar</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => setConfirm(true)} aria-label="Eliminar nota" className="mr-auto text-destructive hover:text-destructive"><Trash2 className="size-4" />Eliminar</Button>
                <Button type="submit">Guardar</Button>
              </>
            ))}
            {isNew && (
              <>
                <Button type="button" variant="ghost" onClick={onClose} className="ml-auto">Cancelar</Button>
                <Button type="submit">Agregar nota</Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",")
const fmtGoal = (n: number) => (Number.isInteger(n * 10) ? n.toFixed(1) : n.toFixed(2)).replace(".", ",")
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Número que se desliza hasta su nuevo valor (sin empezar de cero). */
function useTween(target: number, ms = 240) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const a = from.current
    if (a === target) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const cur = a + (target - a) * (1 - Math.pow(1 - k, 3))
      from.current = cur
      setV(cur)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]"

/**
 * Meta de nota y simulador en un solo panel: un campo para la meta, una cifra grande que responde
 * («Necesitas…» o, al simular, «Quedarías en…») y una barra 0–5 donde se arrastra el punto para probar escenarios.
 */
function GoalPanel({ grades, goal, onGoal }: { grades: Grade[]; goal: number; onGoal: (g: number) => void }) {
  const inputId = useId()
  const plan = goalPlan(grades, goal)
  const { points, remaining, maxPossible } = plan
  const part = remaining / 100 // fracción de la nota que aún no se califica
  const [sim, setSim] = useState<number | null>(null) // nota que se simula en lo que falta (0–5); null = lo necesario para la meta
  const [draft, setDraft] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [mounted, setMounted] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id) }, [])

  const guess = sim ?? (part > 0 ? clamp((goal - points) / part, 0, 5) : 0)
  const result = points + part * guess
  const hit = result >= goal - 1e-9
  const simulating = sim !== null && part > 0
  const pct = (v: number) => `${(clamp(v, 0, 5) / 5) * 100}%`

  // Vibración corta al cruzar la meta arrastrando
  const wasHit = useRef(hit)
  useEffect(() => {
    if (drag && hit && !wasHit.current) { try { navigator.vibrate?.(10) } catch {} }
    wasHit.current = hit
  }, [hit, drag])

  const move = (x: number) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (!r || part <= 0) return
    const v = clamp(((x - r.left) / r.width) * 5, points, maxPossible)
    setSim(clamp(Math.round(((v - points) / part) * 10) / 10, 0, 5))
  }
  const nudge = (d: number) => setSim(clamp(Math.round((guess + d) * 10) / 10, 0, 5))

  // Qué dice la cifra grande
  type Tone = "neutral" | "good" | "bad"
  let tone: Tone = "neutral", label: string, value: number, sub: string, verdict = ""
  if (simulating) {
    label = "Quedarías en"; value = result
    sub = `sacando ${guess.toFixed(1).replace(".", ",")} en lo que falta`
    tone = hit ? "good" : "neutral"
    verdict = hit ? "¡meta cumplida!" : `te faltan ${fmt(goal - result)}`
  } else if (plan.state === "open") {
    label = "Necesitas"; value = plan.needed; sub = `de promedio en el ${remaining}% que falta`
  } else if (plan.state === "secured") {
    label = "Meta asegurada"; value = points; tone = "good"; sub = `llegas aunque saques 0 en el ${remaining}% que falta`
  } else if (plan.state === "out") {
    label = "Ya no alcanza"; value = maxPossible; tone = "bad"; sub = "es lo máximo que puedes lograr"
  } else {
    label = "Terminaste en"; value = points
    tone = plan.state === "done" ? "good" : "bad"; sub = plan.state === "done" ? "¡Meta alcanzada!" : "Por debajo de tu meta"
  }
  const toneClass = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-destructive" : "text-foreground"
  const shown = useTween(value)

  return (
    <section aria-label="Meta de nota" className="stagger space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold"><Target className="size-4 text-brand" />Mi meta</label>
        <input id={inputId} type="text" inputMode="decimal" enterKeyHint="done" maxLength={4} placeholder="3,0" aria-label="Meta de nota (0,1 a 5)"
          value={draft ?? fmtGoal(goal)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value.replace(",", "."))
            if (e.target.value.trim() && Number.isFinite(n) && n > 0 && n <= 5) { onGoal(Math.round(n * 100) / 100); setSim(null) }
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
          className="num h-9 w-16 rounded-lg border bg-muted/40 text-center text-base font-semibold outline-none transition focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/25" />
      </div>

      {/* Cifra principal */}
      <div>
        <div className="flex h-4 items-center justify-between gap-2">
          <p key={label} className="animate-fade-in text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {part > 0 && (simulating ? (
            <button type="button" onClick={() => setSim(null)} className="tap -mr-1 flex items-center gap-1 rounded-md px-1 text-xs text-muted-foreground transition hover:text-foreground active:scale-95">
              <RotateCcw className="size-3" />Restablecer
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">Arrastra el punto para simular</span>
          ))}
        </div>
        <p className={cn("num text-3xl font-semibold tracking-tight transition-colors duration-300", toneClass)}>{fmt(shown)}</p>
        <p key={simulating ? "sim" : plan.state} className="animate-fade-in min-h-8 text-xs text-muted-foreground">
          {sub}{verdict && <span className={cn("block font-medium first-letter:uppercase", toneClass)}>{verdict}</span>}
        </p>
      </div>

      {/* Barra 0–5: lo que llevas, lo que aún puedes sumar, la meta y el punto de simulación */}
      <div>
        <div
          ref={trackRef}
          role={part > 0 ? "slider" : undefined}
          tabIndex={part > 0 ? 0 : undefined}
          aria-label="Simular la nota en lo que falta"
          aria-valuemin={0} aria-valuemax={5} aria-valuenow={Number(guess.toFixed(1))}
          aria-valuetext={`Sacando ${guess.toFixed(1)} quedarías en ${fmt(result)}`}
          className={cn("group relative h-9 touch-pan-y select-none outline-none", part > 0 && (drag ? "cursor-grabbing" : "cursor-grab"))}
          onPointerDown={(e) => { if (part <= 0) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); move(e.clientX) }}
          onPointerMove={(e) => { if (drag) move(e.clientX) }}
          onPointerUp={() => setDrag(false)}
          onPointerCancel={() => setDrag(false)}
          onKeyDown={(e) => {
            if (part <= 0) return
            const k = e.key
            if (k === "ArrowRight" || k === "ArrowUp") nudge(0.1)
            else if (k === "ArrowLeft" || k === "ArrowDown") nudge(-0.1)
            else if (k === "Home") setSim(0)
            else if (k === "End") setSim(5)
            else return
            e.preventDefault()
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/10">
            {/* hasta dónde se puede llegar */}
            <div aria-hidden className="absolute inset-y-0 text-foreground" style={{ left: pct(points), width: pct(maxPossible - points), backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in oklab, currentColor 16%, transparent) 4px 8px)" }} />
            {/* lo que sumarías con la nota simulada */}
            <div aria-hidden className={cn("absolute inset-y-0 transition-colors duration-300", hit ? "bg-emerald-500" : "bg-brand", !drag && `transition-[width,background-color] duration-500 ${EASE}`)}
              style={{ left: pct(points), width: mounted ? pct(result - points) : 0 }} />
            {/* lo que ya llevas */}
            <div aria-hidden className={cn("absolute inset-y-0 left-0 rounded-full bg-foreground transition-[width] duration-700", EASE)} style={{ width: mounted ? pct(points) : 0 }} />
          </div>

          {/* meta */}
          <span aria-hidden className={cn("absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-500", EASE)} style={{ left: pct(goal) }} />

          {/* punto de simulación */}
          {part > 0 && (
            <span aria-hidden
              className={cn(
                "absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-background shadow-md shadow-black/30 group-focus-visible:ring-3 group-focus-visible:ring-brand/40",
                hit ? "border-emerald-500" : "border-brand",
                drag ? "scale-110 transition-transform duration-150" : `transition-[left,transform] duration-500 ${EASE}`
              )}
              style={{ left: pct(result) }}
            >
              <span className={cn("size-1.5 rounded-full transition-colors", hit ? "bg-emerald-500" : "bg-brand")} />
              {simulating && hit && <span key="ripple" className="ripple absolute inset-0 rounded-full bg-emerald-500/50" />}
            </span>
          )}
        </div>

        <div className="relative -mt-0.5 h-3.5">
          <span className={cn("num absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground transition-[left] duration-500", EASE)}
            style={{ left: `clamp(1.5rem, ${pct(goal)}, calc(100% - 1.5rem))` }}>meta {fmtGoal(goal)}</span>
        </div>
      </div>

      <div className="num flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Llevas <b className="font-semibold text-foreground">{fmt(points)}</b> · {100 - remaining}% calificado</span>
        {part > 0 && <span>Máx. {fmt(maxPossible)}</span>}
      </div>
    </section>
  )
}

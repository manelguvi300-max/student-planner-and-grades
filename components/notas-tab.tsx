"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, Plus, Trash2, Pencil, Check, X, EyeOff, Eye, Target, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Ring } from "@/components/ui/ring"
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
  const [gName, setGName] = useState("")
  const [gScore, setGScore] = useState("")
  const [gWeight, setGWeight] = useState("")
  const [error, setError] = useState("")

  // Estado de edición inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ name: string; score: string; weight: string }>({
    name: "",
    score: "",
    weight: "",
  })

  const usedWeight = coveredWeight(grades)
  const remainingWeight = 100 - usedWeight

  function add() {
    const score = Number(gScore)
    const weight = Number(gWeight)
    if (!gName.trim() || Number.isNaN(score) || Number.isNaN(weight)) return
    if (weight <= 0) {
      setError("El porcentaje debe ser mayor a 0.")
      return
    }
    if (usedWeight + weight > 100) {
      setError(
        `Te queda ${remainingWeight}% por asignar. No puedes superar el 100%.`,
      )
      return
    }
    const grade: Grade = {
      id: crypto.randomUUID(),
      name: gName.trim(),
      score,
      weight,
    }
    setGrades((prev) => ({ ...prev, [subjectId]: [...(prev[subjectId] ?? []), grade] }))
    setGName("")
    setGScore("")
    setGWeight("")
    setError("")
  }

  function remove(id: string) {
    setGrades((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] ?? []).filter((g) => g.id !== id),
    }))
    if (editingId === id) setEditingId(null)
  }

  function startEdit(g: Grade) {
    setEditingId(g.id)
    setEditDraft({ name: g.name, score: String(g.score), weight: String(g.weight) })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft({ name: "", score: "", weight: "" })
  }

  function saveEdit(id: string) {
    const score = Number(editDraft.score)
    const weight = Number(editDraft.weight)
    if (!editDraft.name.trim() || Number.isNaN(score) || Number.isNaN(weight) || weight <= 0) return

    // Verificar que el peso no supere el 100% (excluyendo el peso actual de esta nota)
    const currentGrade = grades.find((g) => g.id === id)
    const otherWeight = usedWeight - (currentGrade?.weight ?? 0)
    if (otherWeight + weight > 100) return

    setGrades((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] ?? []).map((g) =>
        g.id === id ? { ...g, name: editDraft.name.trim(), score, weight } : g
      ),
    }))
    setEditingId(null)
  }

  const points = accumulatedPoints(grades)
  const covered = coveredWeight(grades)

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
          <p className="num text-xs text-muted-foreground">{grades.length > 0 ? `${covered}% calificado` : "Sin notas"}</p>
        </div>
        {grades.length > 0 && (
          <Ring value={covered / 100} size={42} stroke={4}>
            <span className="num text-[10px] font-semibold">{points.toFixed(1)}</span>
          </Ring>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleHidden() }}
          aria-label="Ocultar materia de esta vista"
          className="tap rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          title="Ocultar de esta vista"
        >
          <EyeOff className="size-4" />
        </button>
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
          <div className="space-y-3 p-4">
            {grades.length > 0 ? (
              <ul className="space-y-1.5">
                {grades.map((g) => (
                  <li key={g.id}>
                    {editingId === g.id ? (
                      /* Modo edición inline */
                      <div className="flex flex-col gap-2 rounded-md bg-muted/60 px-3 py-2 animate-in fade-in duration-150">
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="text-xs text-muted-foreground">Nombre</label>
                            <Input
                              value={editDraft.name}
                              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                              className="h-8 text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="w-20 space-y-1">
                              <label className="text-xs text-muted-foreground">Nota</label>
                              <Input
                                value={editDraft.score}
                                onChange={(e) => setEditDraft((d) => ({ ...d, score: e.target.value }))}
                                inputMode="decimal"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="w-20 space-y-1">
                              <label className="text-xs text-muted-foreground">Vale %</label>
                              <Input
                                value={editDraft.weight}
                                onChange={(e) => setEditDraft((d) => ({ ...d, weight: e.target.value }))}
                                inputMode="numeric"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex gap-1 pb-0.5">
                              <Button
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => saveEdit(g.id)}
                                aria-label="Guardar cambios"
                              >
                                <Check className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={cancelEdit}
                                aria-label="Cancelar edición"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Modo visualización */
                      <div className="flex animate-fade-in items-center gap-3 rounded-lg bg-muted/50 px-2.5 py-2 text-sm">
                        <span className={cn("num grid h-8 w-11 shrink-0 place-items-center rounded-lg text-sm font-semibold", g.score >= PASSING_GRADE ? "bg-foreground/10" : "bg-destructive/15 text-destructive")}>
                          {g.score.toFixed(1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{g.name}</span>
                          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-foreground/10">
                            <span className="block h-full rounded-full bg-foreground/50" style={{ width: `${Math.min(g.weight, 100)}%` }} />
                          </span>
                        </span>
                        <span className="flex items-center gap-4 whitespace-nowrap text-muted-foreground shrink-0 sm:gap-2">
                          <span className="num text-xs">{g.weight}%</span>
                          <button
                            type="button"
                            onClick={() => startEdit(g)}
                            aria-label={`Editar ${g.name}`}
                            className="tap text-muted-foreground transition hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(g.id)}
                            aria-label={`Eliminar ${g.name}`}
                            className="tap text-muted-foreground transition hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no hay notas registradas.</p>
            )}

            {/* Form para agregar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="Parcial 1"
                  className="h-9"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="w-20 space-y-1">
                  <label className="text-xs text-muted-foreground">Nota</label>
                  <Input
                    value={gScore}
                    onChange={(e) => setGScore(e.target.value)}
                    placeholder="3.5"
                    inputMode="decimal"
                    className="h-9"
                  />
                </div>
                <div className="w-20 space-y-1">
                  <label className="text-xs text-muted-foreground">Vale %</label>
                  <Input
                    value={gWeight}
                    onChange={(e) => setGWeight(e.target.value)}
                    placeholder="20"
                    inputMode="numeric"
                    className="h-9"
                  />
                </div>
                <Button
                  onClick={add}
                  size="icon"
                  className="h-9 w-10 shrink-0"
                  aria-label="Agregar nota"
                  disabled={remainingWeight <= 0}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {error ? (
              <p className="text-xs font-medium text-destructive">{error}</p>
            ) : (
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-foreground/60 transition-[width] duration-700" style={{ width: `${usedWeight}%` }} />
                </div>
                <p className="num mt-1.5 text-xs text-muted-foreground">
                  {remainingWeight > 0
                    ? `Queda ${remainingWeight}% por asignar.`
                    : "Ya asignaste el 100%"}
                </p>
              </div>
            )}

            <GoalPanel grades={grades} goal={goal} onGoal={onGoal} />
          </div>
        </div>
      </div>
    </Card>
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
    <section aria-label="Meta de nota" className="stagger space-y-4 rounded-2xl bg-muted/40 p-4">
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
          className="num h-11 w-24 rounded-xl border bg-background text-center text-xl font-semibold outline-none transition focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/25" />
      </div>

      {/* Cifra principal */}
      <div>
        <div className="flex h-5 items-center justify-between gap-2">
          <p key={label} className="animate-fade-in text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {part > 0 && (simulating ? (
            <button type="button" onClick={() => setSim(null)} className="tap -mr-1 flex items-center gap-1 rounded-md px-1 text-xs text-muted-foreground transition hover:text-foreground active:scale-95">
              <RotateCcw className="size-3" />Restablecer
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">Arrastra el punto para simular</span>
          ))}
        </div>
        <p className={cn("num text-5xl font-semibold tracking-tight transition-colors duration-300", toneClass)}>{fmt(shown)}</p>
        <p key={simulating ? "sim" : plan.state} className="animate-fade-in min-h-10 text-sm text-muted-foreground">
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
          className={cn("group relative h-12 touch-pan-y select-none outline-none", part > 0 && (drag ? "cursor-grabbing" : "cursor-grab"))}
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
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/10">
            {/* hasta dónde se puede llegar */}
            <div aria-hidden className="absolute inset-y-0 text-foreground" style={{ left: pct(points), width: pct(maxPossible - points), backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in oklab, currentColor 16%, transparent) 4px 8px)" }} />
            {/* lo que sumarías con la nota simulada */}
            <div aria-hidden className={cn("absolute inset-y-0 transition-colors duration-300", hit ? "bg-emerald-500" : "bg-brand", !drag && `transition-[width,background-color] duration-500 ${EASE}`)}
              style={{ left: pct(points), width: mounted ? pct(result - points) : 0 }} />
            {/* lo que ya llevas */}
            <div aria-hidden className={cn("absolute inset-y-0 left-0 rounded-full bg-foreground transition-[width] duration-700", EASE)} style={{ width: mounted ? pct(points) : 0 }} />
          </div>

          {/* meta */}
          <span aria-hidden className={cn("absolute top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-500", EASE)} style={{ left: pct(goal) }} />

          {/* punto de simulación */}
          {part > 0 && (
            <span aria-hidden
              className={cn(
                "absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-background shadow-md shadow-black/30 group-focus-visible:ring-3 group-focus-visible:ring-brand/40",
                hit ? "border-emerald-500" : "border-brand",
                drag ? "scale-110 transition-transform duration-150" : `transition-[left,transform] duration-500 ${EASE}`
              )}
              style={{ left: pct(result) }}
            >
              <span className={cn("size-2 rounded-full transition-colors", hit ? "bg-emerald-500" : "bg-brand")} />
              {simulating && hit && <span key="ripple" className="ripple absolute inset-0 rounded-full bg-emerald-500/50" />}
            </span>
          )}
        </div>

        <div className="relative -mt-1 h-4">
          <span className={cn("num absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted-foreground transition-[left] duration-500", EASE)}
            style={{ left: `clamp(1.5rem, ${pct(goal)}, calc(100% - 1.5rem))` }}>meta {fmtGoal(goal)}</span>
        </div>
      </div>

      <div className="num flex items-center justify-between text-xs text-muted-foreground">
        <span>Llevas <b className="font-semibold text-foreground">{fmt(points)}</b> · {100 - remaining}% calificado</span>
        {part > 0 && <span>Máx. {fmt(maxPossible)}</span>}
      </div>
    </section>
  )
}

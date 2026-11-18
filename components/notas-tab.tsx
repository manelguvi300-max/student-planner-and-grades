"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Plus, Trash2, Pencil, Check, X, EyeOff, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Ring } from "@/components/ui/ring"
import { CountUp } from "@/components/ui/count-up"
import { cn } from "@/lib/utils"
import {
  FINAL_WEIGHT,
  PASSING_GRADE,
  accumulatedPoints,
  averageOf,
  goalPlan,
  coveredWeight,
  neededOnFinal,
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
  const needed = neededOnFinal(grades, goal)
  const alreadyPassed = needed <= 0
  const impossible = needed > 5

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

            <GoalSimulator grades={grades} goal={goal} onGoal={onGoal} />

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Acumulado actual</p>
                <p className="num mt-1 text-2xl font-semibold">{points.toFixed(2)}</p>
                <p className="num text-[11px] text-muted-foreground">{covered}% calificado</p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-3",
                  alreadyPassed
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : impossible
                      ? "bg-destructive/15 text-destructive"
                      : "bg-foreground text-background"
                )}
              >
                <p className="text-xs font-medium opacity-80">Necesitas en el final ({FINAL_WEIGHT}%)</p>
                {alreadyPassed ? (
                  <p className="mt-1 text-lg font-semibold leading-tight">Ya ganaste la materia 🎉</p>
                ) : (
                  <p className="num mt-1 text-2xl font-semibold">{needed.toFixed(2)}{impossible && " 💀"}</p>
                )}
                <p className="text-[11px] opacity-80">para quedar en {Number.isInteger(goal * 10) ? goal.toFixed(1) : goal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

const GOALS = [3, 3.5, 4, 4.5, 5]
const fmt = (n: number) => n.toFixed(2).replace(".", ",")

/** Meta de nota + simulador: «¿cuánto necesito?» y «¿qué pasa si saco X?» sobre lo que aún no se califica. */
function GoalSimulator({ grades, goal, onGoal }: { grades: Grade[]; goal: number; onGoal: (g: number) => void }) {
  const plan = goalPlan(grades, goal)
  const [sim, setSim] = useState<number | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const guess = sim ?? Math.round(Math.min(5, Math.max(0, plan.state === "open" ? plan.needed : PASSING_GRADE)) * 10) / 10
  const result = plan.points + (plan.remaining / 100) * guess
  const hit = result >= goal - 1e-9

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Mi meta</h4>
        <div className="flex gap-1" role="radiogroup" aria-label="Meta de nota">
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={goal === g} onClick={() => { onGoal(g); setSim(null); setDraft(null) }}
              className={cn("num h-8 min-w-10 rounded-lg border px-2 text-xs font-semibold transition active:scale-95", goal === g ? "border-transparent bg-foreground text-background" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}>
              {g.toFixed(1)}
            </button>
          ))}
          {/* Meta personalizada: cualquier nota entre 0,1 y 5 (acepta coma o punto) */}
          <input type="text" inputMode="decimal" aria-label="Otra meta" placeholder="Otra" maxLength={4}
            value={draft ?? (GOALS.includes(goal) ? "" : String(goal).replace(".", ","))}
            onChange={(e) => {
              setDraft(e.target.value)
              const n = Number(e.target.value.replace(",", "."))
              if (e.target.value.trim() && Number.isFinite(n) && n > 0 && n <= 5) { onGoal(Math.round(n * 100) / 100); setSim(null) }
            }}
            onBlur={() => setDraft(null)}
            className={cn("num h-8 w-14 rounded-lg border bg-transparent px-2 text-center text-xs font-semibold outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-foreground/40", !GOALS.includes(goal) && "border-transparent bg-foreground text-background")} />
        </div>
      </div>

      <p className={cn("text-sm", plan.state === "out" || plan.state === "lost" ? "text-destructive" : plan.state === "open" ? "" : "text-emerald-600 dark:text-emerald-400")}>
        {plan.state === "open" && <>Necesitas promediar <b className="num">{fmt(plan.needed)}</b> en el {plan.remaining}% que falta.</>}
        {plan.state === "secured" && <>¡Meta asegurada! Aunque saques 0 en lo que falta, llegas a <b className="num">{fmt(plan.points)}</b>.</>}
        {plan.state === "out" && <>Con esta meta ya no alcanza: lo máximo que puedes lograr es <b className="num">{fmt(plan.maxPossible)}</b>.</>}
        {plan.state === "done" && <>Terminaste en <b className="num">{fmt(plan.points)}</b>: ¡meta alcanzada!</>}
        {plan.state === "lost" && <>Terminaste en <b className="num">{fmt(plan.points)}</b>, por debajo de la meta.</>}
      </p>

      {plan.remaining > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <label htmlFor={`sim-${goal}`}>Si saco en lo que falta…</label>
            <span className="num text-sm font-semibold text-foreground">{guess.toFixed(1)}</span>
          </div>
          <input id={`sim-${goal}`} type="range" min={0} max={5} step={0.1} value={guess} onChange={(e) => setSim(Number(e.target.value))} className="w-full accent-brand" />
          <p className="num text-xs text-muted-foreground">
            quedarías en <b className={cn("text-sm", hit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{fmt(result)}</b>
            {hit ? " · cumples tu meta" : ` · te faltan ${fmt(goal - result)}`}
          </p>
        </div>
      )}
    </div>
  )
}

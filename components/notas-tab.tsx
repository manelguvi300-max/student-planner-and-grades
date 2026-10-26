"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Plus, Trash2, Pencil, Check, X, EyeOff, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  FINAL_WEIGHT,
  PASSING_GRADE,
  accumulatedPoints,
  coveredWeight,
  neededOnFinal,
  type Subject,
  type Grade,
} from "@/lib/horario-data"

type GradesMap = Record<string, Grade[]>

type Props = {
  subjects: Subject[]
  grades: GradesMap
  setGrades: React.Dispatch<React.SetStateAction<GradesMap>>
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

export function NotasTab({ subjects, grades, setGrades, hiddenSubjects, onToggleHidden }: Props) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mis notas</h2>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-card animate-scale-in">
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
                    />
                  ))}
              </div>
            </div>
          </>

          {/* Materias ocultas (colapsadas con opción de restaurar) */}
          {hiddenSubjectsList.length > 0 && (
            <div className="space-y-2">
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
  const needed = neededOnFinal(grades)
  const alreadyPassed = needed <= 0
  const impossible = needed > 5

  return (
    <Card className="overflow-hidden p-0 animate-pop">
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
        className="flex items-center justify-between gap-2 px-4 py-3 text-neutral-900 cursor-pointer select-none"
        style={{
          backgroundColor: bg,
          borderBottom: expanded ? `1px solid ${border}` : "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform duration-300", expanded && "rotate-180")}
          />
          <h3 className="font-semibold leading-tight truncate">{name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold rounded-full bg-black/10 px-2 py-0.5">
            {grades.length > 0 ? `${points.toFixed(1)} pts · ${covered}%` : "Sin notas"}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleHidden() }}
            aria-label="Ocultar materia de esta vista"
            className="rounded-full p-1 text-neutral-600 hover:bg-black/10 transition-colors"
            title="Ocultar de esta vista"
          >
            <EyeOff className="size-3.5" />
          </button>
        </div>
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
                      <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-1.5 text-sm animate-fade-in">
                        <span className="truncate">{g.name}</span>
                        <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground shrink-0">
                          <span className="font-medium text-foreground">{g.score.toFixed(1)}</span>
                          <span>{g.weight}%</span>
                          <button
                            type="button"
                            onClick={() => startEdit(g)}
                            aria-label={`Editar ${g.name}`}
                            className="text-muted-foreground transition hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(g.id)}
                            aria-label={`Eliminar ${g.name}`}
                            className="text-muted-foreground transition hover:text-destructive"
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
              <p className="text-xs text-muted-foreground">
                {remainingWeight > 0
                  ? `Queda ${remainingWeight}% por asignar.`
                  : "Ya asignaste el 100%"}
              </p>
            )}

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">Acumulado actual</p>
                <p className="text-xl font-semibold">{points.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground">{covered}% calificado</p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: alreadyPassed
                    ? "#DCDCDC"
                    : impossible
                      ? "#676767"
                      : "#AEAEAE",
                }}
              >
                <p className="text-xs font-semibold text-neutral-900">Necesitas en el final ({FINAL_WEIGHT}%)</p>
                {alreadyPassed ? (
                  <p className="text-xl font-semibold text-neutral-900">Ya ganaste la materia</p>
                ) : impossible ? (
                  <p className="text-xl font-semibold text-neutral-900">{needed.toFixed(2)} (💀)</p>
                ) : (
                  <p className="text-xl font-semibold text-neutral-900">{needed.toFixed(2)}</p>
                )}
                <p className="text-[11px] font-semibold text-neutral-900">para quedar en {PASSING_GRADE.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
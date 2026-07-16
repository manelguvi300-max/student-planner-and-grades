"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
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
}

export function NotasTab({ subjects, grades, setGrades }: Props) {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mis notas</h2>
        <p className="text-sm text-muted-foreground">
          Agrega cada nota con su porcentaje. El final siempre vale {FINAL_WEIGHT}% y abajo
          verás cuánto necesitas sacar en el final para que la materia te quede en {PASSING_GRADE.toFixed(1)}.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-card animate-scale-in">
          <p className="text-sm text-muted-foreground">
            No tienes materias creadas. Ve al horario y crea tus materias para poder agregar notas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 animate-slide-up">
          {subjects.map((s) => (
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
            />
          ))}
        </div>
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
}: {
  subjectId: string
  name: string
  bg: string
  border: string
  grades: Grade[]
  setGrades: React.Dispatch<React.SetStateAction<GradesMap>>
  expanded: boolean
  onToggle: () => void
}) {
  const [gName, setGName] = useState("")
  const [gScore, setGScore] = useState("")
  const [gWeight, setGWeight] = useState("")
  const [error, setError] = useState("")

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
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform duration-300", expanded && "rotate-180")}
          />
          <h3 className="font-semibold leading-tight truncate">{name}</h3>
        </div>
        <span className="shrink-0 text-[11px] font-bold rounded-full bg-black/10 px-2 py-0.5">
          {grades.length > 0 ? `${points.toFixed(1)} pts · ${covered}%` : "Sin notas"}
        </span>
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
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-1.5 text-sm animate-fade-in"
                  >
                    <span className="truncate">{g.name}</span>
                    <span className="flex items-center gap-3 whitespace-nowrap text-muted-foreground">
                      <span className="font-medium text-foreground">{g.score.toFixed(1)}</span>
                      <span>{g.weight}%</span>
                      <button
                        type="button"
                        onClick={() => remove(g.id)}
                        aria-label={`Eliminar ${g.name}`}
                        className="text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no hay notas registradas.</p>
            )}

            {/* Form para agregar */}
            <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] items-stretch sm:items-end gap-3 sm:gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <Input
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="Parcial 1"
                  className="h-9"
                />
              </div>
              <div className="w-16 space-y-1">
                <label className="text-xs text-muted-foreground">Nota</label>
                <Input
                  value={gScore}
                  onChange={(e) => setGScore(e.target.value)}
                  placeholder="3.5"
                  inputMode="decimal"
                  className="h-9"
                />
              </div>
              <div className="w-16 space-y-1">
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
                className="h-9 w-9"
                aria-label="Agregar nota"
                disabled={remainingWeight <= 0}
              >
                <Plus className="size-4" />
              </Button>
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
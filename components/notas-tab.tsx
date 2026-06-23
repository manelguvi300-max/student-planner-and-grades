"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  SUBJECTS,
  FINAL_WEIGHT,
  PASSING_GRADE,
  accumulatedPoints,
  coveredWeight,
  neededOnFinal,
  type Grade,
} from "@/lib/horario-data"

type GradesMap = Record<string, Grade[]>

type Props = {
  grades: GradesMap
  setGrades: React.Dispatch<React.SetStateAction<GradesMap>>
}

export function NotasTab({ grades, setGrades }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mis notas</h2>
        <p className="text-sm text-muted-foreground">
          Agrega cada nota con su porcentaje. El final siempre vale {FINAL_WEIGHT}% y abajo
          verás cuánto necesitas en él para quedar mínimo en {PASSING_GRADE.toFixed(1)}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 animate-slide-up">
        {SUBJECTS.map((s) => (
          <SubjectGrades
            key={s.id}
            subjectId={s.id}
            name={s.name}
            bg={s.bg}
            border={s.border}
            grades={grades[s.id] ?? []}
            setGrades={setGrades}
          />
        ))}
      </div>
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
}: {
  subjectId: string
  name: string
  bg: string
  border: string
  grades: Grade[]
  setGrades: React.Dispatch<React.SetStateAction<GradesMap>>
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
      <div
        className="px-4 py-3 text-neutral-900"
        style={{ backgroundColor: bg, borderBottom: `1px solid ${border}` }}
      >
        <h3 className="font-semibold leading-tight">{name}</h3>
      </div>

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
              ? `Disponible: ${remainingWeight}% por asignar.`
              : "Ya asignaste el 100% de las notas."}
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
                ? "#dcfce7"
                : impossible
                  ? "#fee2e2"
                  : "#fef9c3",
            }}
          >
            <p className="text-xs text-neutral-700">Necesitas en el final ({FINAL_WEIGHT}%)</p>
            {alreadyPassed ? (
              <p className="text-xl font-semibold text-neutral-900">¡Ya pasaste! 🎉</p>
            ) : impossible ? (
              <p className="text-xl font-semibold text-neutral-900">{needed.toFixed(2)} (imposible)</p>
            ) : (
              <p className="text-xl font-semibold text-neutral-900">{needed.toFixed(2)}</p>
            )}
            <p className="text-[11px] text-neutral-700">para quedar en {PASSING_GRADE.toFixed(1)}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

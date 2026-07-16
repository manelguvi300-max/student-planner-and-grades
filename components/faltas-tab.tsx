"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, UserX, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type Subject, type Absence, type SubjectConfig, absenceLimit } from "@/lib/horario-data"

type Props = {
  subjects: Subject[]
  absences: Absence[]
  setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>
  subjectConfigs: Record<string, SubjectConfig>
  setSubjectConfigs: React.Dispatch<React.SetStateAction<Record<string, SubjectConfig>>>
}

export function FaltasTab({ subjects, absences, setAbsences, subjectConfigs, setSubjectConfigs }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [draftSubjectId, setDraftSubjectId] = useState<string>("")
  const [draftDate, setDraftDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [configSubjectId, setConfigSubjectId] = useState<string>("")
  const [draftHours, setDraftHours] = useState<string>("")

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

  function openAdd() {
    setDraftSubjectId(subjects[0]?.id ?? "")
    setDraftDate(new Date().toISOString().split("T")[0])
    setAddOpen(true)
  }

  function handleAddAbsence() {
    if (!draftSubjectId || !draftDate) return
    const newAbsence: Absence = {
      id: crypto.randomUUID(),
      subjectId: draftSubjectId,
      date: draftDate,
    }
    setAbsences((prev) => [...prev, newAbsence])
    setAddOpen(false)
  }

  function handleDeleteAbsence(id: string) {
    setAbsences((prev) => prev.filter((a) => a.id !== id))
  }

  function openConfig(subjectId: string) {
    setConfigSubjectId(subjectId)
    setDraftHours(String(subjectConfigs[subjectId]?.directHours ?? ""))
    setConfigOpen(true)
  }

  function handleSaveConfig() {
    const hours = parseFloat(draftHours)
    if (isNaN(hours) || hours <= 0) return
    setSubjectConfigs((prev) => ({
      ...prev,
      [configSubjectId]: { directHours: hours },
    }))
    setConfigOpen(false)
  }

  function getAbsencesForSubject(subjectId: string) {
    return absences
      .filter((a) => a.subjectId === subjectId)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  function formatDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-card animate-scale-in">
        <div className="bg-primary/10 p-3 rounded-full mb-4">
          <UserX className="size-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Sin materias</h3>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Primero crea tus materias en la pestaña de Horario para poder registrar faltas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Faltas</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Registra tus faltas por materia y mira cuántas faltas te quedan antes de cancelar.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="rounded-full shadow-sm">
          <Plus className="size-4 mr-1" /> Registrar falta
        </Button>
      </div>

      <div className="columns-1 gap-4 sm:columns-2">
        {subjects.map((subject) => {
          const config = subjectConfigs[subject.id]
          const subjectAbsences = getAbsencesForSubject(subject.id)
          const count = subjectAbsences.length
          const limit = config ? absenceLimit(config.directHours) : null
          const safeRemaining = limit !== null ? limit - count : null
          const isCancelled = limit !== null && count > limit
          const isAtRisk = limit !== null && !isCancelled && safeRemaining !== null && safeRemaining <= 1
          const isExpanded = expanded[subject.id] ?? false

          return (
            <div
              key={subject.id}
              className="mb-4 break-inside-avoid rounded-xl border bg-card shadow-sm overflow-hidden"
            >
              {/* Header de la materia (clic para contraer/expandir) */}
              <div
                onClick={() => toggleExpanded(subject.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    toggleExpanded(subject.id)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none"
                style={{
                  backgroundColor: subject.bg,
                  borderBottom: isExpanded ? `1px solid ${subject.border}` : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-neutral-700 transition-transform duration-300",
                      isExpanded && "rotate-180"
                    )}
                  />
                  <span className="font-semibold text-sm text-neutral-900 truncate">{subject.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {config && (
                    <span
                      className={cn(
                        "text-[11px] font-bold rounded-full px-2 py-0.5",
                        isCancelled
                          ? "bg-red-500 text-white"
                          : isAtRisk
                            ? "bg-amber-500 text-white"
                            : "bg-white/70 text-neutral-800"
                      )}
                    >
                      {isCancelled ? "Cancelada" : `${count}/${limit}`}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openConfig(subject.id)
                    }}
                    className="shrink-0 text-[11px] font-medium text-neutral-700 bg-black/10 hover:bg-black/20 rounded-full px-2.5 py-1 transition-colors"
                  >
                    {config ? `${config.directHours}h` : "Configurar horas"}
                  </button>
                </div>
              </div>

              {/* Cuerpo colapsable (animación fluida con CSS grid) */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-in-out",
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="p-4 space-y-4">
                    {/* Indicador de estado */}
                    {config === undefined ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                        <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                        <span>Configura las horas de clase para calcular el límite de faltas.</span>
                      </div>
                    ) : isCancelled ? (
                      <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                        <XCircle className="size-4 shrink-0" />
                        <span className="font-semibold">Materia cancelada — te pasaste del límite de {limit} falta{limit !== 1 ? "s" : ""}.</span>
                      </div>
                    ) : isAtRisk ? (
                      <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>
                          ¡Cuidado! Solo te queda{safeRemaining === 1 ? "" : "n"} <strong>{safeRemaining}</strong> falta{safeRemaining !== 1 ? "s" : ""}.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>
                          {safeRemaining !== null
                            ? <>Te quedan <strong>{safeRemaining}</strong> falta{safeRemaining !== 1 ? "s" : ""} segura{safeRemaining !== 1 ? "s" : ""}.</>
                            : "Sin faltas registradas."}
                        </span>
                      </div>
                    )}

                    {/* Contador */}
                    {config && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Faltas registradas</span>
                        <span className="font-semibold">
                          {count} / {limit}
                          <span className="text-muted-foreground font-normal ml-1 text-xs">(límite)</span>
                        </span>
                      </div>
                    )}

                    {/* Barra de progreso */}
                    {config && limit !== null && limit > 0 && (
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCancelled ? "bg-red-500" : isAtRisk ? "bg-amber-400" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min((count / (limit + 1)) * 100, 100)}%` }}
                        />
                      </div>
                    )}

                    {/* Historial de faltas */}
                    {subjectAbsences.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Historial</p>
                        <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {subjectAbsences.map((absence, index) => (
                            <li
                              key={absence.id}
                              className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-1.5 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-5 shrink-0">#{index + 1}</span>
                                <span>{formatDate(absence.date)}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteAbsence(absence.id)}
                                className="p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Eliminar falta"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-2">
                        Sin faltas registradas.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog: Registrar falta */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[380px] animate-scale-in">
          <DialogHeader>
            <DialogTitle>Registrar falta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Materia</Label>
              <Select value={draftSubjectId} onValueChange={(v) => v && setDraftSubjectId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una materia">
                    {draftSubjectId &&
                      (() => {
                        const s = subjects.find((s) => s.id === draftSubjectId)
                        return s ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{
                                backgroundColor: s.bg,
                                border: `1px solid ${s.border}`,
                              }}
                            />
                            {s.name}
                          </div>
                        ) : null
                      })()}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{
                            backgroundColor: s.bg,
                            border: `1px solid ${s.border}`,
                          }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
            <div className="space-y-2">
              <Label htmlFor="absence-date">Fecha de la falta</Label>
              <Input
                id="absence-date"
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddAbsence} className="w-full rounded-full" disabled={!draftSubjectId || !draftDate}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar horas de la materia */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[380px] animate-scale-in">
          <DialogHeader>
            <DialogTitle>Configurar horas de clase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {configSubjectId && (
              <p className="text-sm text-muted-foreground">
                Materia: <span className="font-semibold text-foreground">{subjects.find(s => s.id === configSubjectId)?.name}</span>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="direct-hours">Horas de trabajo directo del semestre</Label>
              <Input
                id="direct-hours"
                type="number"
                min="1"
                placeholder="Ej: 48"
                value={draftHours}
                onChange={(e) => setDraftHours(e.target.value)}
              />
            </div>
            {draftHours && !isNaN(parseFloat(draftHours)) && parseFloat(draftHours) > 0 && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">20% de {draftHours}h</span>
                  <span className="font-medium">{(parseFloat(draftHours) * 0.2).toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Límite de faltas</span>
                  <span className="font-bold text-primary">{absenceLimit(parseFloat(draftHours))} faltas</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Con {absenceLimit(parseFloat(draftHours)) + 1} faltas la materia queda cancelada.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveConfig}
              className="w-full rounded-full"
              disabled={!draftHours || isNaN(parseFloat(draftHours)) || parseFloat(draftHours) <= 0}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
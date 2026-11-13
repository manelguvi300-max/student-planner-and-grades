"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, UserX, ChevronDown, EyeOff, Eye } from "lucide-react"
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
import { Ring } from "@/components/ui/ring"
import { CountUp } from "@/components/ui/count-up"
import { type Subject, type Absence, type SubjectConfig, absenceLimit } from "@/lib/horario-data"

type Props = {
  subjects: Subject[]
  absences: Absence[]
  setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>
  subjectConfigs: Record<string, SubjectConfig>
  setSubjectConfigs: React.Dispatch<React.SetStateAction<Record<string, SubjectConfig>>>
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

export function FaltasTab({ subjects, absences, setAbsences, subjectConfigs, setSubjectConfigs, hiddenSubjects, onToggleHidden }: Props) {
  const [configOpen, setConfigOpen] = useState(false)
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

  function handleAddAbsence(subjectId: string) {
    if (!draftDate) return
    const newAbsence: Absence = {
      id: crypto.randomUUID(),
      subjectId,
      date: draftDate,
    }
    setAbsences((prev) => [...prev, newAbsence])
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

      </div>
    )
  }

  // resumen de las materias visibles
  const visible = subjects.filter((s) => !hiddenSubjects.includes(s.id))
  let atRisk = 0, cancelled = 0, unconfigured = 0, totalAbsences = 0
  for (const s of visible) {
    const cfg = subjectConfigs[s.id]
    const n = absences.filter((a) => a.subjectId === s.id).length
    totalAbsences += n
    if (!cfg) { unconfigured++; continue }
    const left = absenceLimit(cfg.directHours) - n
    if (left < 0) cancelled++
    else if (left <= 1) atRisk++
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative animate-rise overflow-hidden rounded-3xl border bg-card p-4 shadow-(--card-shadow) sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-foreground/10 blur-3xl" />
        <h2 className="relative text-xl font-semibold tracking-tight">Faltas</h2>
        <p className="relative mt-0.5 hidden text-sm text-muted-foreground sm:block">
          Configura las horas de trabajo directo [HD] de cada materia (las ves en el pensum) y registra tus faltas.
        </p>
        <div className="relative mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Registradas", value: totalAbsences, tone: "" },
            { label: "En riesgo", value: atRisk + cancelled, tone: atRisk + cancelled ? "text-amber-500" : "" },
            { label: "Sin configurar", value: unconfigured, tone: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted/50 px-3 py-3">
              <p className={cn("text-3xl font-light", s.tone)}><CountUp value={s.value} /></p>
              <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {(() => {
        const renderCard = (subject: Subject) => {
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
              className="animate-pop overflow-hidden rounded-2xl border bg-card shadow-(--card-shadow)"
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
                className="flex min-h-[4.5rem] cursor-pointer select-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-foreground/[0.03]"
                style={{ backgroundImage: `linear-gradient(90deg, ${subject.bg}40, transparent 65%)` }}
              >
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: subject.border }} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">{subject.name}</span>
                  <span className="num block text-xs text-muted-foreground">{config ? `${config.directHours} h de trabajo directo` : "Sin horas configuradas"}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {config && (
                    <span
                      className={cn(
                        "num rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        isCancelled
                          ? "bg-destructive text-white"
                          : isAtRisk
                            ? "bg-amber-500 text-white"
                            : "bg-foreground/10"
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
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      config ? "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/10 hover:text-foreground" : "bg-foreground text-background hover:opacity-90"
                    )}
                  >
                    {config ? "Editar HD" : "Configurar horas"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleHidden(subject.id) }}
                    aria-label="Ocultar materia de esta vista"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    title="Ocultar de esta vista"
                  >
                    <EyeOff className="size-4" />
                  </button>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
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
                    {/* Estado: anillo + mensaje + una marca por cada falta permitida */}
                    {config === undefined || limit === null ? (
                      <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
                        <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                        <span>Configura las horas de trabajo directo para calcular tu límite de faltas.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <Ring
                          value={limit > 0 ? count / limit : count > 0 ? 1 : 0}
                          size={76}
                          stroke={7}
                          className={isCancelled ? "text-destructive" : isAtRisk ? "text-amber-500" : "text-emerald-500"}
                        >
                          <span className="text-center leading-none">
                            <CountUp value={count} className="text-2xl font-bold" />
                            <span className="num mt-0.5 block text-[10px] text-muted-foreground">de {limit}</span>
                          </span>
                        </Ring>
                        <div className="min-w-0 flex-1 space-y-2.5">
                          <p className={cn("flex items-start gap-1.5 text-sm", isCancelled ? "font-semibold text-destructive" : isAtRisk ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                            {isCancelled ? <XCircle className="mt-0.5 size-4 shrink-0" /> : isAtRisk ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />}
                            <span>
                              {isCancelled
                                ? <>Materia cancelada: pasaste el límite de {limit} falta{limit !== 1 ? "s" : ""}.</>
                                : isAtRisk
                                  ? <>¡Cuidado! {safeRemaining === 0 ? "No te quedan faltas." : <>Solo te queda <strong>1</strong> falta.</>}</>
                                  : <>Te quedan <strong>{safeRemaining}</strong> falta{safeRemaining !== 1 ? "s" : ""} segura{safeRemaining !== 1 ? "s" : ""}.</>}
                            </span>
                          </p>
                          {limit > 0 && limit <= 24 && (
                            <div className="flex flex-wrap gap-1" aria-hidden>
                              {Array.from({ length: limit }, (_, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "h-2 w-5 rounded-full transition-colors duration-500",
                                    i < count ? (isCancelled ? "bg-destructive" : isAtRisk ? "bg-amber-500" : "bg-emerald-500") : "bg-foreground/10"
                                  )}
                                  style={{ transitionDelay: `${i * 50}ms` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Historial de faltas */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground">Historial</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={draftDate}
                            onChange={(e) => setDraftDate(e.target.value)}
                            className="h-7 px-2 text-[11px] w-[115px]"
                          />
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7 rounded-md shrink-0"
                            onClick={() => handleAddAbsence(subject.id)}
                            title="Agregar falta"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {subjectAbsences.length > 0 ? (
                        <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {subjectAbsences.map((absence, index) => (
                            <li
                              key={absence.id}
                              className="flex animate-fade-in items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="num grid size-6 shrink-0 place-items-center rounded-md bg-foreground/10 text-[11px] font-semibold">{index + 1}</span>
                                <span className="num">{formatDate(absence.date)}</span>
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
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center py-2">
                          Sin faltas registradas.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        return (
          <>
            {/* Móvil: una sola lista en el orden original */}
            <div className="space-y-4 sm:hidden">
              {subjects.filter(s => !hiddenSubjects.includes(s.id)).map((subject) => renderCard(subject))}
            </div>

            {/* Escritorio: dos columnas independientes, conservando el mismo orden/emparejamiento de siempre */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-2 sm:items-start">
              <div className="space-y-4">
                {subjects.filter(s => !hiddenSubjects.includes(s.id)).filter((_, i) => i % 2 === 0).map((subject) => renderCard(subject))}
              </div>
              <div className="space-y-4">
                {subjects.filter(s => !hiddenSubjects.includes(s.id)).filter((_, i) => i % 2 === 1).map((subject) => renderCard(subject))}
              </div>
            </div>

            {/* Materias ocultas */}
            {subjects.filter(s => hiddenSubjects.includes(s.id)).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Materias ocultas en esta vista</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.filter(s => hiddenSubjects.includes(s.id)).map((s) => (
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
        )
      })()}

      {/* Dialog: Configurar horas de la materia */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[380px]">
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
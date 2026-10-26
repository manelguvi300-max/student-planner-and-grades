"use client"

import { useEffect, useState } from "react"
import {
  Plus, Trash2, Users, User, FileText, Presentation,
  StickyNote, ChevronDown, CalendarPlus, List, Calendar,
  ChevronLeft, ChevronRight, EyeOff, Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getSubject, type Subject, type Exam } from "@/lib/horario-data"

type Props = {
  subjects: Subject[]
  exams: Exam[]
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

// Detecta si el viewport es móvil (breakpoint sm de Tailwind = 640px)
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [breakpoint])

  return isMobile
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function CalendarView({
  exams,
  subjects,
  hiddenSubjects,
}: {
  exams: Exam[]
  subjects: Subject[]
  hiddenSubjects: string[]
}) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Index exams by date string "YYYY-MM-DD" within this month
  const examsByDay: Record<number, Exam[]> = {}
  for (const exam of exams) {
    if (hiddenSubjects.includes(exam.subjectId)) continue
    const [y, m, d] = exam.date.split("-").map(Number)
    if (y === currentYear && m - 1 === currentMonth) {
      examsByDay[d] = examsByDay[d] ?? []
      examsByDay[d].push(exam)
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm animate-in fade-in duration-300">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <button
          onClick={prevMonth}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-semibold text-sm">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-[11px] font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-y">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-16 sm:h-20 bg-muted/10" />
          }
          const dayExams = examsByDay[day] ?? []
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr

          return (
            <div
              key={day}
              className={cn(
                "h-16 sm:h-20 p-1 flex flex-col gap-0.5 overflow-hidden",
                isPast && "bg-muted/5",
                isToday && "bg-primary/5"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium self-end w-5 h-5 flex items-center justify-center rounded-full shrink-0",
                  isToday && "bg-primary text-primary-foreground font-bold",
                  !isToday && isPast && "text-muted-foreground/50",
                  !isToday && !isPast && "text-foreground"
                )}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {dayExams.slice(0, 3).map((exam) => {
                  const subject = getSubject(subjects, exam.subjectId)
                  if (!subject) return null
                  return (
                    <div
                      key={exam.id}
                      className="rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold leading-tight truncate text-neutral-900"
                      style={{ backgroundColor: subject.bg, borderLeft: `2px solid ${subject.border}` }}
                      title={`${subject.name} — ${exam.weight}%`}
                    >
                      <span className="hidden sm:inline">{subject.name}</span>
                      <span className="sm:hidden">{subject.name.slice(0, 6)}</span>
                    </div>
                  )
                })}
                {dayExams.length > 3 && (
                  <span className="text-[9px] text-muted-foreground pl-1">+{dayExams.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ExamenesTab({ subjects, exams, setExams, hiddenSubjects, onToggleHidden }: Props) {
  const [subjectId, setSubjectId] = useState(subjects.length > 0 ? subjects[0].id : "")
  const [date, setDate] = useState("")
  const [group, setGroup] = useState<Exam["group"]>("individual")
  const [kind, setKind] = useState<Exam["kind"]>("examen")
  const [weight, setWeight] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [draftNote, setDraftNote] = useState("")

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")

  // El formulario de "agregar examen" inicia abierto en PC y cerrado en móvil
  const isMobile = useIsMobile()
  const [formOpen, setFormOpen] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)
  useEffect(() => {
    if (isMobile === null || formInitialized) return
    setFormOpen(!isMobile)
    setFormInitialized(true)
  }, [isMobile, formInitialized])

  // Estado de expansión y borrador de nota por examen ya creado
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [noteDraftById, setNoteDraftById] = useState<Record<string, string>>({})

  function add() {
    if (!date) return
    const exam: Exam = {
      id: crypto.randomUUID(),
      subjectId,
      date,
      group,
      kind,
      weight: Number(weight) || 0,
      notes: draftNote.trim() || undefined,
    }
    setExams((prev) => [...prev, exam])
    setDate("")
    setWeight("")
    setDraftNote("")
    setShowNoteInput(false)
    if (isMobile) setFormOpen(false)
  }

  function remove(id: string) {
    setExams((prev) => prev.filter((e) => e.id !== id))
    setExpandedIds((prev) => { const next = { ...prev }; delete next[id]; return next })
    setNoteDraftById((prev) => { const next = { ...prev }; delete next[id]; return next })
  }

  function toggleExpand(id: string, currentNotes?: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
    setNoteDraftById((prev) => (id in prev ? prev : { ...prev, [id]: currentNotes ?? "" }))
  }

  function saveNote(id: string) {
    const value = (noteDraftById[id] ?? "").trim()
    setExams((prev) => prev.map((ex) => (ex.id === id ? { ...ex, notes: value || undefined } : ex)))
  }

  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))
  const visibleSorted = sorted.filter((e) => !hiddenSubjects.includes(e.subjectId))
  const hiddenSubjectsList = subjects.filter((s) => hiddenSubjects.includes(s.id))

  function formatDate(d: string) {
    const date = new Date(d + "T00:00:00")
    return date.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Fechas de exámenes</h2>
          <p className="text-sm text-muted-foreground">Anota las fechas de los exámenes.</p>
        </div>
        {/* Toggle lista / calendario */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
              viewMode === "list"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
              viewMode === "calendar"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="size-3.5" />
            <span className="hidden sm:inline">Calendario</span>
          </button>
        </div>
      </div>

      {/* Form (colapsable) */}
      <Card className="overflow-hidden p-0 animate-slide-up">
        <div
          onClick={() => setFormOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setFormOpen((o) => !o)
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={formOpen}
          className="flex items-center justify-between gap-2 px-4 py-4 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarPlus className="size-4 shrink-0 text-muted-foreground" />
            <h3 className="m-0 font-semibold leading-none">Agregar examen</h3>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
              formOpen && "rotate-180"
            )}
          />
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border-t px-4 pb-4 pt-4 sm:px-6">
              <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-12 lg:items-end">
                <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-4">
                  <Label>Materia</Label>
                  <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
                    <SelectTrigger disabled={subjects.length === 0}>
                      <SelectValue placeholder="Selecciona una materia">{() => getSubject(subjects, subjectId)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No hay materias</div>
                      ) : (
                        subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <Label htmlFor="exam-date">Fecha</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <Label>Modalidad</Label>
                  <Select value={group} onValueChange={(v) => v && setGroup(v as Exam["group"])}>
                    <SelectTrigger>
                      <SelectValue>{(v) => (v === "grupal" ? "Grupal" : "Individual")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="grupal">Grupal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <Label>Tipo</Label>
                  <Select value={kind} onValueChange={(v) => v && setKind(v as Exam["kind"])}>
                    <SelectTrigger>
                      <SelectValue>{(v) => (v === "presentacion" ? "Presentación" : "Examen")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="presentacion">Presentación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5 lg:col-span-2">
                  <Label htmlFor="exam-weight">Vale %</Label>
                  <div className="flex gap-2">
                    <Input
                      id="exam-weight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="25"
                      inputMode="numeric"
                    />
                    <Button onClick={add} size="icon" aria-label="Agregar examen" className="shrink-0" disabled={subjects.length === 0}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Nota / descripción opcional al crear */}
              <div className="mx-auto mt-3 max-w-3xl border-t pt-3">
                {showNoteInput ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="exam-note">Nota o descripción (opcional)</Label>
                      <button
                        type="button"
                        onClick={() => { setShowNoteInput(false); setDraftNote("") }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Quitar
                      </button>
                    </div>
                    <textarea
                      id="exam-note"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      rows={2}
                      placeholder="Ej: Trae calculadora, tema: derivadas e integrales..."
                      className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNoteInput(true)}
                    disabled={subjects.length === 0}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    <StickyNote className="size-3.5" /> Agregar nota o descripción
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Vista calendario */}
      {viewMode === "calendar" && (
        <CalendarView exams={sorted} subjects={subjects} hiddenSubjects={hiddenSubjects} />
      )}

      {/* Vista lista */}
      {viewMode === "list" && (
        <>
          {visibleSorted.length > 0 ? (
            <div className="mx-auto max-w-5xl space-y-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
              {visibleSorted.map((e) => {
                const subject = getSubject(subjects, e.subjectId)
                const isExpanded = expandedIds[e.id] ?? false
                const hasNotes = Boolean(e.notes && e.notes.trim())

                return (
                  <div key={e.id} className="rounded-xl border bg-card overflow-hidden animate-pop">
                    {/* Fila principal (clic para ver/editar la nota) */}
                    <div
                      onClick={() => toggleExpand(e.id, e.notes)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault()
                          toggleExpand(e.id, e.notes)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      className="flex flex-wrap items-center gap-3 p-3 cursor-pointer select-none"
                    >
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: subject?.border }}
                        aria-hidden
                      />
                      <div className="min-w-35 flex-1">
                        <p className="font-medium leading-tight flex items-center gap-1.5">
                          {subject?.name}
                          {hasNotes && (
                            <StickyNote className="size-3.5 text-muted-foreground" aria-label="Tiene nota" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">{formatDate(e.date)}</p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        {e.group === "grupal" ? <Users className="size-3" /> : <User className="size-3" />}
                        {e.group === "grupal" ? "Grupal" : "Individual"}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        {e.kind === "presentacion" ? (
                          <Presentation className="size-3" />
                        ) : (
                          <FileText className="size-3" />
                        )}
                        {e.kind === "presentacion" ? "Presentación" : "Examen"}
                      </Badge>
                      <Badge className="tabular-nums">{e.weight}%</Badge>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                          isExpanded && "rotate-180"
                        )}
                      />
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); remove(e.id) }}
                        aria-label="Eliminar examen"
                        className="text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {/* Nota colapsable */}
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-in-out",
                        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-2 border-t px-3 pb-3 pt-3">
                          <Label className="text-xs text-muted-foreground">Nota o descripción</Label>
                          <textarea
                            value={noteDraftById[e.id] ?? e.notes ?? ""}
                            onChange={(ev) =>
                              setNoteDraftById((prev) => ({ ...prev, [e.id]: ev.target.value }))
                            }
                            rows={3}
                            placeholder="Agrega detalles del examen: temas, materiales permitidos, etc."
                            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" variant="secondary" onClick={() => saveNote(e.id)}>
                              Guardar nota
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {exams.length > 0 ? "No hay exámenes visibles (todas las materias están ocultas)." : "No has agregado fechas todavía."}
            </p>
          )}

          {/* Materias ocultas en esta vista */}
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
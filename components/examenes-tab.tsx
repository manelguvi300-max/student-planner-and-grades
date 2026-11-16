"use client"

import { useState } from "react"
import {
  Plus, Trash2, Users, User, FileText, Presentation, StickyNote, ChevronDown,
  List, Calendar, ChevronLeft, ChevronRight, Eye, Pencil, Check, Clock,
  ClipboardList, CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getSubject, minutesToLabel, timeToMinutes, type Subject, type Exam } from "@/lib/horario-data"
import { useSettings } from "@/lib/settings"

type Props = {
  subjects: Subject[]
  exams: Exam[]
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const TEXTAREA = "w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const dateOf = (s: string) => new Date(s + "T00:00:00")
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() }
const daysUntil = (s: string) => Math.round((dateOf(s).getTime() - startOfToday()) / 86_400_000)
const byDateTime = (a: Exam, b: Exam) => (a.date + (a.time ?? "99:99")).localeCompare(b.date + (b.time ?? "99:99"))

function dueLabel(n: number) {
  if (n === 0) return "Hoy"
  if (n === 1) return "Mañana"
  if (n === -1) return "Ayer"
  return n > 0 ? `En ${n} días` : `Hace ${-n} días`
}

function dueTone(n: number, done?: boolean) {
  if (done || n < 0) return "bg-foreground/[0.07] text-muted-foreground"
  if (n <= 1) return "bg-red-500/15 text-red-600 dark:text-red-400"
  if (n <= 3) return "bg-amber-500/15 text-amber-600 dark:text-amber-400"
  return "bg-foreground/[0.07] text-muted-foreground"
}

/* ───────────── Formulario (crear / editar) ───────────── */

function Seg<T extends string>({ value, onChange, options, label }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon: React.ComponentType<{ className?: string }> }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <o.icon className="size-3.5" />{o.label}
        </button>
      ))}
    </div>
  )
}

function ExamForm({ subjects, initial, defaultDate, onSave, onCancel }: {
  subjects: Subject[]
  initial?: Exam
  defaultDate?: string
  onSave: (e: Omit<Exam, "id" | "done"> & { id?: string }) => void
  onCancel: () => void
}) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? "")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? "")
  const [time, setTime] = useState(initial?.time ?? "")
  const [kind, setKind] = useState<Exam["kind"]>(initial?.kind ?? "examen")
  const [group, setGroup] = useState<Exam["group"]>(initial?.group ?? "individual")
  const [weight, setWeight] = useState(initial ? String(initial.weight) : "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [tried, setTried] = useState(false)

  const w = weight.trim() === "" ? 0 : Number(weight)
  const weightBad = Number.isNaN(w) || w < 0 || w > 100
  const dateBad = !date
  const subjectBad = !getSubject(subjects, subjectId)

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setTried(true)
    if (weightBad || dateBad || subjectBad) return
    onSave({
      id: initial?.id,
      subjectId, date, kind, group,
      weight: w,
      title: title.trim() || undefined,
      time: time || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Materia</Label>
        <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
          <SelectTrigger aria-invalid={tried && subjectBad}>
            <SelectValue placeholder="Selecciona una materia">{() => getSubject(subjects, subjectId)?.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Seg label="Tipo" value={kind} onChange={setKind} options={[
          { value: "examen", label: "Examen", icon: FileText },
          { value: "presentacion", label: "Presentación", icon: Presentation },
        ]} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exam-title">Título <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Parcial 1, Quiz, Exposición final…" maxLength={60} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="exam-date">Fecha</Label>
          <Input id="exam-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={tried && dateBad} />
          {tried && dateBad && <p className="text-xs text-destructive">Elige una fecha.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exam-time">Hora <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <Input id="exam-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Modalidad</Label>
          <Seg label="Modalidad" value={group} onChange={setGroup} options={[
            { value: "individual", label: "Individual", icon: User },
            { value: "grupal", label: "Grupal", icon: Users },
          ]} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exam-weight">Vale %</Label>
          <Input id="exam-weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="25" inputMode="decimal" aria-invalid={tried && weightBad} />
          {tried && weightBad && <p className="text-xs text-destructive">Entre 0 y 100.</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exam-note">Nota o temas <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <textarea id="exam-note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Temas, materiales permitidos, salón…" className={TEXTAREA} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{initial ? "Guardar cambios" : "Agregar"}</Button>
      </div>
    </form>
  )
}

/* ───────────── Tarjeta de examen ───────────── */

function ExamCard({ exam, subject, onToggleDone, onEdit, onDelete }: {
  exam: Exam
  subject: Subject
  onToggleDone: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const n = daysUntil(exam.date)
  const d = dateOf(exam.date)
  const hasNotes = Boolean(exam.notes?.trim())
  const whenRaw = d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")
  const when = whenRaw.charAt(0).toUpperCase() + whenRaw.slice(1)

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card transition-opacity animate-pop", exam.done && "opacity-60")}>
      <div className="flex items-start gap-3 p-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl text-neutral-900" style={{ background: subject.bg, boxShadow: `inset 3px 0 0 ${subject.border}` }}>
          <span className="text-center leading-none">
            <span className="num block text-lg font-bold">{d.getDate()}</span>
            <span className="block text-[9px] font-semibold uppercase">{d.toLocaleDateString("es", { month: "short" }).replace(".", "")}</span>
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("truncate font-medium leading-tight", exam.done && "line-through")}>{exam.title || subject.name}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", dueTone(n, exam.done))}>
              {exam.done ? "Hecho" : dueLabel(n)}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {exam.title && <span>{subject.name} ·</span>}
            <span>{when}</span>
            {exam.time && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{minutesToLabel(timeToMinutes(exam.time), settings.timeFormat)}</span>}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{exam.kind === "presentacion" ? <Presentation /> : <FileText />}{exam.kind === "presentacion" ? "Presentación" : "Examen"}</Badge>
            <Badge variant="secondary">{exam.group === "grupal" ? <Users /> : <User />}{exam.group === "grupal" ? "Grupal" : "Individual"}</Badge>
            {exam.weight > 0 && <Badge className="tabular-nums">{exam.weight}%</Badge>}
            {hasNotes && (
              <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
                <StickyNote className="size-3.5" />Nota
                <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} />
              </button>
            )}
          </div>
        </div>
      </div>

      {hasNotes && (
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-in-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <p className="whitespace-pre-wrap border-t px-3 py-2.5 text-sm text-muted-foreground">{exam.notes}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 border-t bg-muted/20 px-2 py-1.5">
        {confirming ? (
          <>
            <span className="mr-auto pl-1 text-xs text-muted-foreground">¿Eliminar este examen?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Eliminar</Button>
          </>
        ) : (
          <>
            <button type="button" onClick={onToggleDone} aria-pressed={Boolean(exam.done)}
              className={cn("mr-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition hover:bg-foreground/[0.06]", exam.done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground")}>
              <Check className="size-4" />{exam.done ? "Hecho" : "Marcar hecho"}
            </button>
            <button type="button" onClick={onEdit} aria-label="Editar examen" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
              <Pencil className="size-4" />
            </button>
            <button type="button" onClick={() => setConfirming(true)} aria-label="Eliminar examen" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ───────────── Calendario ───────────── */

function CalendarView({ exams, subjects, renderExam, onAdd }: {
  exams: Exam[]
  subjects: Subject[]
  renderExam: (e: Exam) => React.ReactNode
  onAdd: (date: string) => void
}) {
  const today = new Date()
  const todayStr = ymd(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string>(todayStr)
  const { settings } = useSettings()

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr) }

  const mondayFirst = settings.weekStart === "mon"
  const dayNames = mondayFirst ? [...DAY_NAMES.slice(1), DAY_NAMES[0]] : DAY_NAMES
  const firstDay = (new Date(year, month, 1).getDay() + (mondayFirst ? 6 : 0)) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const byDate: Record<string, Exam[]> = {}
  for (const e of exams) (byDate[e.date] ??= []).push(e)
  const dayList = (byDate[selected] ?? []).slice().sort(byDateTime)
  const selRaw = dateOf(selected).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
  const selLabel = selRaw.charAt(0).toUpperCase() + selRaw.slice(1)
  const monthCount = exams.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2.5">
          <button onClick={prev} className="rounded-full p-1.5 transition-colors hover:bg-muted" aria-label="Mes anterior"><ChevronLeft className="size-4" /></button>
          <div className="text-center">
            <p className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</p>
            <p className="text-[11px] text-muted-foreground">{monthCount === 0 ? "Sin exámenes" : `${monthCount} ${monthCount === 1 ? "examen" : "exámenes"}`}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goToday} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Hoy</button>
            <button onClick={next} className="rounded-full p-1.5 transition-colors hover:bg-muted" aria-label="Mes siguiente"><ChevronRight className="size-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b text-center">
          {dayNames.map((d) => <div key={d} className="py-2 text-[11px] font-semibold text-muted-foreground">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} className="h-14 bg-muted/10 sm:h-20" />
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const list = byDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isPast = dateStr < todayStr
            const isSel = dateStr === selected
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(dateStr)}
                aria-pressed={isSel}
                aria-label={`${day} de ${MONTH_NAMES[month]}${list.length ? `, ${list.length} ${list.length === 1 ? "examen" : "exámenes"}` : ""}`}
                className={cn(
                  "flex h-14 flex-col gap-0.5 overflow-hidden p-1 text-left transition-colors sm:h-20 hover:bg-foreground/[0.04]",
                  isPast && "bg-muted/5",
                  isSel && "bg-primary/10 ring-1 ring-inset ring-primary/40"
                )}
              >
                <span className={cn(
                  "flex size-5 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium",
                  isToday ? "bg-primary font-bold text-primary-foreground" : isPast ? "text-muted-foreground/50" : "text-foreground"
                )}>{day}</span>

                {/* móvil: puntos · escritorio: etiquetas */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {list.slice(0, 4).map((e) => (
                    <span key={e.id} className={cn("size-1.5 rounded-full", e.done && "opacity-40")} style={{ background: getSubject(subjects, e.subjectId)?.border }} />
                  ))}
                </span>
                <span className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                  {list.slice(0, 2).map((e) => {
                    const s = getSubject(subjects, e.subjectId)
                    return (
                      <span key={e.id} className={cn("truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight text-neutral-900", e.done && "line-through opacity-50")}
                        style={{ backgroundColor: s?.bg, borderLeft: `2px solid ${s?.border}` }}>
                        {e.title || s?.name}
                      </span>
                    )
                  })}
                  {list.length > 2 && <span className="pl-1 text-[10px] text-muted-foreground">+{list.length - 2} más</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Panel del día elegido */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{selLabel}</p>
          <Button size="sm" variant="secondary" onClick={() => onAdd(selected)}><Plus className="size-3.5" />Agregar aquí</Button>
        </div>
        {dayList.length ? (
          <div className="space-y-3">{dayList.map(renderExam)}</div>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nada programado este día.</p>
        )}
      </div>
    </div>
  )
}

/* ───────────── Pestaña ───────────── */

export function ExamenesTab({ subjects, exams, setExams, hiddenSubjects, onToggleHidden }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [filter, setFilter] = useState<string>("all")
  const [showPast, setShowPast] = useState(false)
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Exam; date?: string }>({ open: false })

  const closeDialog = () => setDialog((d) => ({ ...d, open: false }))
  const hiddenSubjectsList = subjects.filter((s) => hiddenSubjects.includes(s.id))

  function save(data: Omit<Exam, "id" | "done"> & { id?: string }) {
    if (data.id) {
      setExams((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data, id: e.id } : e)))
    } else {
      setExams((prev) => [...prev, { ...data, id: crypto.randomUUID() }])
    }
    closeDialog()
  }
  const remove = (id: string) => setExams((prev) => prev.filter((e) => e.id !== id))
  const toggleDone = (id: string) => setExams((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)))

  // Solo exámenes de materias existentes y no ocultas en esta vista
  const visible = exams.filter((e) => getSubject(subjects, e.subjectId) && !hiddenSubjects.includes(e.subjectId)).sort(byDateTime)
  const shown = filter === "all" ? visible : visible.filter((e) => e.subjectId === filter)

  const todayStr = ymd(new Date())
  const upcoming = shown.filter((e) => e.date >= todayStr)
  const past = shown.filter((e) => e.date < todayStr).reverse()
  const thisWeek = upcoming.filter((e) => daysUntil(e.date) <= 7)
  const later = upcoming.filter((e) => daysUntil(e.date) > 7)

  const pending = visible.filter((e) => e.date >= todayStr && !e.done)
  const next = pending[0]
  const weekCount = pending.filter((e) => daysUntil(e.date) <= 7).length
  const subjectsWithExams = subjects.filter((s) => visible.some((e) => e.subjectId === s.id))

  const openNew = (date?: string) => setDialog({ open: true, date })
  const card = (e: Exam) => (
    <ExamCard key={e.id} exam={e} subject={getSubject(subjects, e.subjectId)!}
      onToggleDone={() => toggleDone(e.id)} onEdit={() => setDialog({ open: true, editing: e })} onDelete={() => remove(e.id)} />
  )
  const group = (title: string, list: Exam[], note?: string) => list.length > 0 && (
    <section className="space-y-3">
      <h3 className="flex items-baseline gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}<span className="font-normal normal-case tracking-normal">{note ?? list.length}</span>
      </h3>
      <div className="space-y-3">{list.map(card)}</div>
    </section>
  )

  const subtitle = pending.length === 0
    ? "Sin exámenes pendientes."
    : `${pending.length} ${pending.length === 1 ? "pendiente" : "pendientes"}${next ? ` · el próximo ${dueLabel(daysUntil(next.date)).toLowerCase()}` : ""}`

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Exámenes</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1" role="group" aria-label="Vista">
            {([["list", List, "Lista"], ["calendar", Calendar, "Calendario"]] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setViewMode(v)} aria-pressed={viewMode === v} aria-label={label}
                className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all", viewMode === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="size-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openNew()} disabled={subjects.length === 0}><Plus className="size-4" /><span className="hidden sm:inline">Nuevo</span></Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Primero agrega una materia para poder programar exámenes.</p>
      ) : (
        <>
          {/* Resumen */}
          {visible.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-card p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><ClipboardList className="size-3.5" />Próximo</p>
                <p className="mt-2 text-lg font-semibold leading-none tracking-tight">{next ? dueLabel(daysUntil(next.date)) : "Libre"}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{next ? (next.title || getSubject(subjects, next.subjectId)?.name) : "Nada a la vista"}</p>
              </div>
              <div className="rounded-2xl border bg-card p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><CalendarDays className="size-3.5" />Esta semana</p>
                <p className="num mt-2 text-lg font-semibold leading-none">{weekCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">próximos 7 días</p>
              </div>
              <div className="rounded-2xl border bg-card p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Check className="size-3.5" />Hechos</p>
                <p className="num mt-2 text-lg font-semibold leading-none">{visible.filter((e) => e.done).length}<span className="text-sm font-normal text-muted-foreground">/{visible.length}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">en total</p>
              </div>
            </div>
          )}

          {/* Filtro por materia */}
          {subjectsWithExams.length > 1 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por materia">
              <button onClick={() => setFilter("all")} aria-pressed={filter === "all"}
                className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition", filter === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                Todas
              </button>
              {subjectsWithExams.map((s) => (
                <button key={s.id} onClick={() => setFilter(filter === s.id ? "all" : s.id)} aria-pressed={filter === s.id}
                  className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition", filter === s.id ? "text-neutral-900" : "text-muted-foreground hover:text-foreground")}
                  style={filter === s.id ? { background: s.bg, borderColor: s.border } : undefined}>
                  <span className="size-2 rounded-full" style={{ background: s.border }} />{s.name}
                </button>
              ))}
            </div>
          )}

          {viewMode === "calendar" ? (
            <CalendarView exams={shown} subjects={subjects} renderExam={card} onAdd={openNew} />
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <ClipboardList className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-3 font-medium">{exams.length > 0 ? "Todas las materias están ocultas" : "Aún no hay exámenes"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{exams.length > 0 ? "Muéstralas de nuevo abajo." : "Agrega fechas para ver cuánto falta y no olvidar nada."}</p>
              {exams.length === 0 && <Button className="mt-4" onClick={() => openNew()}><Plus className="size-4" />Agregar el primero</Button>}
            </div>
          ) : (
            <div className="space-y-6">
              {upcoming.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No hay exámenes próximos{filter !== "all" ? " en esta materia" : ""}.</p>}
              {group("Esta semana", thisWeek)}
              {group("Más adelante", later)}
              {past.length > 0 && (
                <section className="space-y-3">
                  <button onClick={() => setShowPast((o) => !o)} aria-expanded={showPast}
                    className="flex w-full items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground">
                    Pasados<span className="font-normal normal-case tracking-normal">{past.length}</span>
                    <ChevronDown className={cn("ml-auto size-4 transition-transform duration-300", showPast && "rotate-180")} />
                  </button>
                  {showPast && <div className="space-y-3">{past.map(card)}</div>}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Materias ocultas en esta vista */}
      {hiddenSubjectsList.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-muted-foreground">Materias ocultas en esta vista</p>
          <div className="flex flex-wrap gap-2">
            {hiddenSubjectsList.map((s) => (
              <button key={s.id} onClick={() => onToggleHidden(s.id)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                style={{ borderColor: s.border, backgroundColor: s.bg + "60" }}>
                <Eye className="size-3" />{s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Editar examen" : "Nuevo examen"}</DialogTitle>
            <DialogDescription>{dialog.editing ? "Cambia lo que necesites." : "Fecha, peso y notas opcionales."}</DialogDescription>
          </DialogHeader>
          <ExamForm subjects={subjects} initial={dialog.editing} defaultDate={dialog.date} onSave={save} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  Plus, Trash2, Users, User, FileText, Presentation, Handshake, Puzzle, ListChecks, PackageCheck, Tag, StickyNote, ChevronDown,
  List, Calendar, ChevronLeft, ChevronRight, Eye, Pencil, Check, Clock,
  ClipboardList, CalendarDays, SlidersHorizontal, X, CalendarPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { SubjectPicker } from "@/components/subject-picker"
import { useSheetBack } from "@/lib/use-sheet-back"
import { cn } from "@/lib/utils"
import { getSubject, minutesToLabel, timeToMinutes, allKinds, findKind, KIND_COLORS, type KindColor, type EventKind, type Subject, type Exam } from "@/lib/horario-data"
import { useSettings } from "@/lib/settings"
import { downloadIcs, googleCalendarUrl, type IcsEvent } from "@/lib/ics"

type Props = {
  subjects: Subject[]
  exams: Exam[]
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
  kinds: EventKind[]
  setKinds: (u: EventKind[] | ((prev: EventKind[]) => EventKind[])) => void
  hiddenSubjects: string[]
  onToggleHidden: (subjectId: string) => void
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const TEXTAREA = "w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

const KIND_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  examen: FileText, presentacion: Presentation, tarea: ListChecks, entrega: PackageCheck, reunion: Handshake, actividad: Puzzle,
}
const tint = (c: KindColor, pct = 14) => `color-mix(in oklab, ${KIND_COLORS[c]} ${pct}%, transparent)`
const ink = (c: KindColor) => `color-mix(in oklab, ${KIND_COLORS[c]} 75%, var(--foreground))`

const NONE = "__none" // en los filtros: eventos sin materia

/** Colores de un evento: los de su materia o, si no tiene, los de su categoría. */
function eventTone(subject: Subject | undefined, kind: EventKind) {
  return subject
    ? { bg: subject.bg, border: subject.border, text: "#171717" }
    : { bg: tint(kind.color, 24), border: KIND_COLORS[kind.color], text: ink(kind.color) }
}

type KindsApi = {
  kinds: EventKind[]
  create: (name: string, color: KindColor) => string
  update: (id: string, name: string, color: KindColor) => void
  remove: (id: string) => void
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const dateOf = (s: string) => new Date(s + "T00:00:00")
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() }
const daysUntil = (s: string) => Math.round((dateOf(s).getTime() - startOfToday()) / 86_400_000)
const byDateTime = (a: Exam, b: Exam) => (a.date + (a.time ?? "99:99")).localeCompare(b.date + (b.time ?? "99:99"))

const WD_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MON_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

/** Encabezado de un día de la lista: «Hoy», «Mañana», «Jueves»… con la fecha como apoyo. */
function dayTitle(date: string) {
  const d = dateOf(date), n = daysUntil(date)
  const short = `${d.getDate()} ${MON_SHORT[d.getMonth()]}`
  if (n === 0) return { title: "Hoy", sub: `${WD_LONG[d.getDay()]} ${short}` }
  if (n === 1) return { title: "Mañana", sub: `${WD_LONG[d.getDay()]} ${short}` }
  return { title: WD_LONG[d.getDay()], sub: n < 7 ? short : `${short} · en ${n} días` }
}

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
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/30 p-1">
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

/** Chips de categoría + «Nueva». Las propias se pueden renombrar, recolorear o borrar desde el mismo panelito. */
function KindPicker({ value, onChange, api }: { value: string; onChange: (id: string) => void; api: KindsApi }) {
  const list = allKinds(api.kinds)
  const current = list.find((k) => k.id === value)
  const [panel, setPanel] = useState<null | "new" | "edit">(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState<KindColor>("indigo")
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")

  const open = (mode: "new" | "edit") => {
    setPanel(mode); setConfirming(false); setError("")
    setName(mode === "edit" ? current?.name ?? "" : "")
    setColor(mode === "edit" ? current?.color ?? "indigo" : "indigo")
  }
  function apply() {
    const n = name.trim()
    if (!n) return setError("Ponle un nombre.")
    if (list.some((k) => k.id !== (panel === "edit" ? value : "") && k.name.toLowerCase() === n.toLowerCase())) return setError("Ya existe una con ese nombre.")
    if (panel === "edit") api.update(value, n, color)
    else onChange(api.create(n, color))
    setPanel(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label id="kind-label">Categoría</Label>
        {current && !current.builtin && panel === null && (
          <button type="button" onClick={() => open("edit")} className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
            <Pencil className="size-3" />Editar
          </button>
        )}
      </div>

      <div role="radiogroup" aria-labelledby="kind-label" className="grid grid-cols-3 gap-2">
        {list.map((k) => {
          const on = value === k.id
          const Icon = KIND_ICON[k.id] ?? Tag
          return (
            <button key={k.id} type="button" role="radio" aria-checked={on} onClick={() => { onChange(k.id); setPanel(null) }}
              className={cn("relative flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition active:scale-[0.97]", on ? "border-transparent" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}
              style={on ? { background: tint(k.color, 14), color: ink(k.color), boxShadow: `inset 0 0 0 1.5px ${tint(k.color, 70)}` } : undefined}>
              <span className="grid size-7 place-items-center rounded-md" style={{ background: tint(k.color, on ? 30 : 16), color: KIND_COLORS[k.color] }}><Icon className="size-4" /></span>
              <span className="max-w-full truncate">{k.name}</span>
              {on && <Check className="absolute right-1.5 top-1.5 size-3" />}
            </button>
          )
        })}
        <button type="button" onClick={() => open("new")} aria-expanded={panel === "new"}
          className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-dashed px-1 py-2 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground active:scale-[0.97]">
          <span className="grid size-7 place-items-center rounded-md bg-foreground/[0.06]"><Plus className="size-4" /></span>
          Nueva
        </button>
      </div>

      {panel && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3 animate-fade-in">
          <p className="text-xs font-medium text-muted-foreground">{panel === "new" ? "Nueva categoría" : "Editar categoría"}</p>
          <Input value={name} onChange={(e) => { setName(e.target.value); setError("") }} maxLength={20} autoFocus placeholder="Laboratorio, Asesoría, Quiz…" aria-label="Nombre de la categoría" aria-invalid={Boolean(error)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply() } }} />
          {error && <p className="-mt-1.5 text-xs text-destructive">{error}</p>}
          <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
            {(Object.keys(KIND_COLORS) as KindColor[]).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)}
                className={cn("grid size-7 place-items-center rounded-full transition pointer-coarse:size-8", color === c && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background")}
                style={{ background: KIND_COLORS[c] }}>
                {color === c && <Check className="size-3.5 text-white" />}
              </button>
            ))}
          </div>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="mr-auto text-xs text-muted-foreground">Pasarán a «Actividad».</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => { api.remove(value); onChange("actividad"); setPanel(null) }}>Eliminar</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {panel === "edit" && (
                <button type="button" onClick={() => setConfirming(true)} aria-label="Eliminar categoría" className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>Cancelar</Button>
                <Button type="button" size="sm" onClick={apply}>{panel === "new" ? "Crear" : "Guardar"}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExamForm({ subjects, kindsApi, initial, defaultDate, onSave, onCancel, onDelete, calendarUrl }: {
  subjects: Subject[]
  kindsApi: KindsApi
  initial?: Exam
  defaultDate?: string
  onSave: (e: Omit<Exam, "id" | "done"> & { id?: string }) => void
  onCancel: () => void
  onDelete?: () => void
  /** Enlace para añadir el evento (ya guardado) a Google Calendar; solo al editar */
  calendarUrl?: string
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? subjects[0]?.id ?? "")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? "")
  const [time, setTime] = useState(initial?.time ?? "")
  const [kind, setKind] = useState<string>(initial?.kind ?? "examen")
  const [group, setGroup] = useState<Exam["group"]>(initial?.group ?? "individual")
  const [weight, setWeight] = useState(initial ? String(initial.weight) : "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [tried, setTried] = useState(false)

  const w = weight.trim() === "" ? 0 : Number(weight)
  const weightBad = Number.isNaN(w) || w < 0 || w > 100
  const dateBad = !date
  const subjectBad = subjectId !== "" && !getSubject(subjects, subjectId)

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    setTried(true)
    if ((weightBad && kind !== "reunion") || dateBad || subjectBad) return
    onSave({
      id: initial?.id,
      subjectId, date, kind, group,
      weight: kind === "reunion" ? 0 : w, // una reunión no vale nota
      title: title.trim() || undefined,
      time: time || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Materia <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} invalid={tried && subjectBad} noneLabel="Sin materia" />
      </div>

      <KindPicker value={kind} onChange={setKind} api={kindsApi} />

      <div className="space-y-1.5">
        <Label htmlFor="exam-title">Título <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Parcial 1, Reunión de grupo, Taller…" maxLength={60} />
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

      <div className={cn("grid gap-3", kind === "reunion" ? "grid-cols-1" : "grid-cols-2")}>
        <div className="space-y-1.5">
          <Label>Modalidad</Label>
          <Seg label="Modalidad" value={group} onChange={setGroup} options={[
            { value: "individual", label: "Individual", icon: User },
            { value: "grupal", label: "Grupal", icon: Users },
          ]} />
        </div>
        {kind !== "reunion" && (
          <div className="space-y-1.5">
            <Label htmlFor="exam-weight">Vale %</Label>
            <Input id="exam-weight" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="25" inputMode="decimal" aria-invalid={tried && weightBad} />
            {tried && weightBad && <p className="text-xs text-destructive">Entre 0 y 100.</p>}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="exam-note">Nota o temas <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <textarea id="exam-note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Temas, materiales, salón, enlace…" className={TEXTAREA} />
      </div>

      {calendarUrl && (
        <a href={calendarUrl} target="_blank" rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition hover:bg-foreground/[0.05] active:scale-[0.99]">
          <CalendarPlus className="size-4" />Añadir a Google Calendar
        </a>
      )}

      <div className="sheet-actions flex items-center gap-2 pt-1">
        {onDelete && (confirmDelete ? (
          <>
            <span className="mr-auto text-sm text-muted-foreground">¿Eliminar este evento?</span>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>No</Button>
            <Button type="button" variant="destructive" onClick={onDelete}>Eliminar</Button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Eliminar evento" className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-4" />
          </button>
        ))}
        {!confirmDelete && (
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button type="submit">{initial ? "Guardar cambios" : "Agregar"}</Button>
          </div>
        )}
      </div>
    </form>
  )
}

/* ───────────── Tarjeta de examen ───────────── */

function ExamCard({ exam, subject, kind, showDate, overdue, onToggleDone, onEdit }: {
  exam: Exam
  subject?: Subject
  kind: EventKind
  /** Muestra la fecha en la fila (atrasados y pasados; en la lista por días no hace falta) */
  showDate?: boolean
  overdue?: boolean
  onToggleDone: () => void
  onEdit: () => void
}) {
  const { settings } = useSettings()
  const tone = eventTone(subject, kind)
  const Icon = KIND_ICON[kind.id] ?? Tag
  const title = exam.title || subject?.name || kind.name
  const time = exam.time ? minutesToLabel(timeToMinutes(exam.time), settings.timeFormat) : ""
  const dateText = showDate ? (() => { const d = dateOf(exam.date); return `${WD_LONG[d.getDay()].slice(0, 3)} ${d.getDate()} ${MON_SHORT[d.getMonth()]}` })() : ""
  const meta = [kind.name, exam.title && subject ? subject.name : "", exam.group === "grupal" ? "Grupal" : "", exam.weight > 0 ? `${exam.weight}%` : ""].filter(Boolean).join(" · ")

  return (
    <div className={cn("lift flex overflow-hidden rounded-xl border bg-card transition-opacity", exam.done && "opacity-60")}>
      <button type="button" onClick={onEdit} aria-label={`Editar: ${title}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 pr-1 text-left transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.06]">
        <span className="w-12 shrink-0 text-center">
          {time
            ? <span className="num text-xs font-semibold leading-tight">{time}</span>
            : <span className="mx-auto grid size-8 place-items-center rounded-lg" style={{ background: tint(kind.color, 18), color: KIND_COLORS[kind.color] }}><Icon className="size-4" /></span>}
        </span>
        <span aria-hidden className="h-9 w-1 shrink-0 rounded-full" style={{ background: tone.border }} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-medium leading-tight transition-colors", exam.done && "text-muted-foreground line-through")}>{title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5 shrink-0" style={{ color: KIND_COLORS[kind.color] }} />
            <span className="truncate">
              {dateText && <span className={cn("font-medium", overdue ? "text-destructive" : "text-foreground/70")}>{dateText} · </span>}
              {meta}
            </span>
            {exam.notes?.trim() && <StickyNote className="size-3 shrink-0" aria-label="Tiene notas" />}
          </span>
        </span>
      </button>

      <button type="button" onClick={onToggleDone} aria-pressed={Boolean(exam.done)} aria-label={exam.done ? "Marcar como pendiente" : "Marcar como hecho"}
        className="grid w-12 shrink-0 place-items-center transition-colors hover:bg-foreground/[0.04] active:bg-foreground/[0.08]">
        <span className={cn("grid size-6 place-items-center rounded-full border-2 transition-[transform,background-color,border-color] duration-300", exam.done ? "scale-100 border-emerald-500 bg-emerald-500 text-white" : "border-foreground/25")}>
          {exam.done && <Check className="size-3.5 animate-pop" strokeWidth={3} />}
        </span>
      </button>
    </div>
  )
}

/** Los próximos 7 días de un vistazo: cuántos eventos hay y de qué categoría. Tocar un día salta a él en la lista. */
type StripDay = { date: string; label: string; num: number; today: boolean; count: number; dots: string[] }
function WeekStrip({ days, active, onPick }: { days: StripDay[]; active: string | null; onPick: (date: string) => void }) {
  const idx = days.findIndex((d) => d.date === active)
  return (
    <nav aria-label="Próximos 7 días"
      className="sticky top-[var(--appbar-h)] z-20 -mx-4 border-b bg-background px-3 py-2 md:bg-background/90 md:backdrop-blur-xl sm:-mx-6 sm:px-5 lg:static lg:mx-0 lg:rounded-xl lg:border lg:bg-card lg:p-3 lg:backdrop-blur-none">
      <p className="mb-2 hidden text-xs font-medium text-muted-foreground lg:block">Próximos 7 días</p>
      <div className="relative grid grid-cols-7">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[calc(100%/7)] rounded-lg bg-foreground/[0.08] transition-[transform,opacity] duration-300 ease-out"
          style={{ transform: `translateX(${Math.max(idx, 0) * 100}%)`, opacity: idx >= 0 ? 1 : 0 }} />
        {days.map((d) => (
          <button key={d.date} type="button" disabled={d.count === 0} onClick={() => onPick(d.date)} aria-current={d.today ? "date" : undefined}
            aria-label={`${d.label} ${d.num}: ${d.count === 0 ? "sin eventos" : d.count === 1 ? "1 evento" : `${d.count} eventos`}`}
            className={cn("relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition active:scale-95 disabled:cursor-default disabled:active:scale-100", d.count === 0 && "opacity-55")}>
            <span className="text-[10px] font-medium uppercase text-muted-foreground">{d.label}</span>
            <span className={cn("num grid size-7 place-items-center rounded-full text-sm font-semibold transition-colors", d.today && "bg-primary text-primary-foreground")}>{d.num}</span>
            <span className="flex h-1.5 items-center gap-0.5">
              {d.dots.map((c, i) => <span key={i} className="size-1.5 rounded-full" style={{ background: c }} />)}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

/* ───────────── Calendario ───────────── */

function CalendarView({ exams, subjects, kinds, renderExam, onAdd }: {
  exams: Exam[]
  subjects: Subject[]
  kinds: EventKind[]
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
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2.5">
          <button onClick={prev} className="rounded-full p-1.5 transition-colors hover:bg-muted" aria-label="Mes anterior"><ChevronLeft className="size-4" /></button>
          <div className="text-center">
            <p className="text-sm font-semibold">{MONTH_NAMES[month]} {year}</p>
            <p className="text-[11px] text-muted-foreground">{monthCount === 0 ? "Sin eventos" : `${monthCount} ${monthCount === 1 ? "evento" : "eventos"}`}</p>
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
                aria-label={`${day} de ${MONTH_NAMES[month]}${list.length ? `, ${list.length} ${list.length === 1 ? "evento" : "eventos"}` : ""}`}
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
                    <span key={e.id} className={cn("size-1.5 rounded-full", e.done && "opacity-40")} style={{ background: eventTone(getSubject(subjects, e.subjectId), findKind(kinds, e.kind)).border }} />
                  ))}
                </span>
                <span className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                  {list.slice(0, 2).map((e) => {
                    const s = getSubject(subjects, e.subjectId)
                    const k = findKind(kinds, e.kind)
                    const t = eventTone(s, k)
                    return (
                      <span key={e.id} className={cn("truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight", e.done && "line-through opacity-50")}
                        style={{ backgroundColor: t.bg, color: t.text, borderLeft: `2px solid ${t.border}` }}>
                        {e.title || s?.name || k.name}
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
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nada programado este día.</p>
        )}
      </div>
    </div>
  )
}

/* ───────────── Filtros ───────────── */

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function FilterSheet({ open, onClose, subjects, kinds, hasNone, subjectCount, kindCount, selSubjects, selKinds, setSelSubjects, setSelKinds, resultCount }: {
  open: boolean
  onClose: () => void
  subjects: Subject[]
  kinds: EventKind[]
  hasNone: boolean
  subjectCount: Record<string, number>
  kindCount: Record<string, number>
  selSubjects: string[]
  selKinds: string[]
  setSelSubjects: (v: string[]) => void
  setSelKinds: (v: string[]) => void
  resultCount: number
}) {
  const none = selSubjects.length + selKinds.length === 0
  const chip = "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition pointer-coarse:h-9"
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtrar agenda</DialogTitle>
          <DialogDescription>Elige una o varias. Sin selección se muestra todo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {kinds.length > 1 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Categoría</h3>
              <div className="flex flex-wrap gap-1.5">
                {kinds.map((k) => {
                  const on = selKinds.includes(k.id)
                  const Icon = KIND_ICON[k.id] ?? Tag
                  return (
                    <button key={k.id} type="button" aria-pressed={on} onClick={() => setSelKinds(toggleIn(selKinds, k.id))}
                      className={cn(chip, on ? "border-transparent" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}
                      style={on ? { background: tint(k.color, 18), color: ink(k.color), boxShadow: `inset 0 0 0 1px ${tint(k.color, 55)}` } : undefined}>
                      <Icon className="size-3.5" style={{ color: KIND_COLORS[k.color] }} />{k.name}
                      <span className="num opacity-60">{kindCount[k.id]}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {subjects.length + (hasNone ? 1 : 0) > 1 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Materia</h3>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((sub) => {
                  const on = selSubjects.includes(sub.id)
                  return (
                    <button key={sub.id} type="button" aria-pressed={on} onClick={() => setSelSubjects(toggleIn(selSubjects, sub.id))}
                      className={cn(chip, "max-w-full", on ? "text-neutral-900" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}
                      style={on ? { background: sub.bg, borderColor: sub.border } : undefined}>
                      <span className="size-2 shrink-0 rounded-full" style={{ background: sub.border }} />
                      <span className="truncate">{sub.name}</span>
                      <span className="num shrink-0 opacity-60">{subjectCount[sub.id]}</span>
                    </button>
                  )
                })}
                {hasNone && (
                  <button type="button" aria-pressed={selSubjects.includes(NONE)} onClick={() => setSelSubjects(toggleIn(selSubjects, NONE))}
                    className={cn(chip, selSubjects.includes(NONE) ? "border-transparent bg-foreground/10 text-foreground" : "border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>
                    Sin materia<span className="num opacity-60">{subjectCount[NONE]}</span>
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="sheet-actions flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => { setSelSubjects([]); setSelKinds([]) }} disabled={none}>Limpiar</Button>
          <Button type="button" onClick={onClose}>{resultCount === 0 ? "Sin resultados" : `Ver ${resultCount} ${resultCount === 1 ? "evento" : "eventos"}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ───────────── Pestaña ───────────── */

export function ExamenesTab({ subjects, exams, setExams, kinds, setKinds, hiddenSubjects, onToggleHidden }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [selSubjects, setSelSubjects] = useState<string[]>([])
  const [selKinds, setSelKinds] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Exam; date?: string }>({ open: false })

  const closeDialog = () => setDialog((d) => ({ ...d, open: false }))
  useSheetBack(dialog.open, closeDialog)
  useSheetBack(filtersOpen, () => setFiltersOpen(false))
  const hiddenSubjectsList = subjects.filter((s) => hiddenSubjects.includes(s.id))

  function save(data: Omit<Exam, "id" | "done"> & { id?: string }) {
    if (data.id) {
      setExams((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data, id: e.id } : e)))
    } else {
      setExams((prev) => [...prev, { ...data, id: crypto.randomUUID() }])
    }
    closeDialog()
  }
  const kindsApi: KindsApi = {
    kinds,
    create: (name, color) => { const id = `k_${crypto.randomUUID().slice(0, 8)}`; setKinds((p) => [...p, { id, name, color }]); return id },
    update: (id, name, color) => setKinds((p) => p.map((k) => (k.id === id ? { ...k, name, color } : k))),
    remove: (id) => { setKinds((p) => p.filter((k) => k.id !== id)); setExams((p) => p.map((e) => (e.kind === id ? { ...e, kind: "actividad" } : e))) },
  }
  const remove = (id: string) => setExams((prev) => prev.filter((e) => e.id !== id))
  const toggleDone = (id: string) => setExams((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)))

  // Solo eventos de materias existentes y no ocultas en esta vista (los sin materia siempre se ven)
  const visible = exams.filter((e) => (e.subjectId === "" || getSubject(subjects, e.subjectId)) && !hiddenSubjects.includes(e.subjectId)).sort(byDateTime)
  // filtros: opciones con eventos y su cantidad; lo seleccionado que ya no existe (materia oculta, categoría borrada) se ignora
  const subjectCount: Record<string, number> = {}
  const kindCount: Record<string, number> = {}
  for (const e of visible) { const sk = e.subjectId || NONE; subjectCount[sk] = (subjectCount[sk] ?? 0) + 1; kindCount[e.kind] = (kindCount[e.kind] ?? 0) + 1 }
  const filterSubjects = subjects.filter((x) => subjectCount[x.id])
  const filterKinds = allKinds(kinds).filter((k) => kindCount[k.id])
  const activeSubjects = selSubjects.filter((id) => subjectCount[id])
  const activeKinds = selKinds.filter((id) => kindCount[id])
  const filterCount = activeSubjects.length + activeKinds.length
  const shown = visible.filter((e) => (!activeSubjects.length || activeSubjects.includes(e.subjectId || NONE)) && (!activeKinds.length || activeKinds.includes(e.kind)))

  const todayStr = ymd(new Date())
  const overdue = shown.filter((e) => e.date < todayStr && !e.done)
  const past = shown.filter((e) => e.date < todayStr && e.done).reverse()
  const upcoming = shown.filter((e) => e.date >= todayStr)
  // próximos, agrupados por día (ya vienen ordenados por fecha y hora)
  const dayGroups: { date: string; list: Exam[] }[] = []
  for (const e of upcoming) {
    const last = dayGroups[dayGroups.length - 1]
    if (last && last.date === e.date) last.list.push(e)
    else dayGroups.push({ date: e.date, list: [e] })
  }
  const daysKey = dayGroups.map((g) => g.date).join(",")

  const pending = visible.filter((e) => e.date >= todayStr && !e.done)
  const next = pending[0]
  const weekCount = pending.filter((e) => daysUntil(e.date) <= 7).length

  // franja de la semana: hoy + 6 días
  const stripDays: StripDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i)
    const date = ymd(d)
    const list = shown.filter((e) => e.date === date)
    return {
      date, label: DAY_NAMES[d.getDay()], num: d.getDate(), today: i === 0, count: list.length,
      dots: list.slice(0, 3).map((e) => eventTone(getSubject(subjects, e.subjectId), findKind(kinds, e.kind)).border),
    }
  })

  // qué día se está viendo al desplazar la lista
  useEffect(() => {
    if (viewMode !== "list") return
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-day]"))
    if (els.length === 0) { setActiveDay(null); return }
    const seen = new Set<string>()
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const d = (en.target as HTMLElement).dataset.day!
        if (en.isIntersecting) seen.add(d); else seen.delete(d)
      }
      setActiveDay([...seen].sort()[0] ?? null)
    }, { rootMargin: "-130px 0px -55% 0px" })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [viewMode, daysKey])

  const jumpTo = (date: string) => {
    document.querySelector(`[data-day="${date}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveDay(date)
  }

  const openNew = (date?: string) => setDialog({ open: true, date })

  /** Los pendientes (con los filtros actuales) como archivo de calendario: Google Calendar, Apple, Outlook… */
  function toEvent(e: Exam): IcsEvent {
    const subject = getSubject(subjects, e.subjectId)
    const kind = findKind(kinds, e.kind)
    return {
      uid: e.id, date: e.date, startMin: e.time ? timeToMinutes(e.time) : undefined, alarm: true,
      title: e.title ? (subject ? `${e.title} (${subject.name})` : e.title) : `${kind.name}${subject ? ` · ${subject.name}` : ""}`,
      description: [e.weight > 0 ? `Vale ${e.weight}%` : "", e.group === "grupal" ? "Trabajo grupal" : "", e.notes?.trim() ?? ""].filter(Boolean).join("\n") || undefined,
    }
  }
  function exportCalendar() {
    const events = pending.filter((e) => shown.includes(e)).map(toEvent)
    if (events.length) downloadIcs("agenda.ics", events)
  }
  const card = (e: Exam, opts?: { showDate?: boolean; overdue?: boolean }) => (
    <ExamCard key={e.id} exam={e} subject={getSubject(subjects, e.subjectId)} kind={findKind(kinds, e.kind)} showDate={opts?.showDate} overdue={opts?.overdue}
      onToggleDone={() => toggleDone(e.id)} onEdit={() => setDialog({ open: true, editing: e })} />
  )
  const heading = "flex items-baseline gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"

  const subtitle = pending.length === 0
    ? "Nada pendiente en tu agenda."
    : `${pending.length} ${pending.length === 1 ? "pendiente" : "pendientes"}${next ? ` · próximo ${dueLabel(daysUntil(next.date)).toLowerCase()}` : ""}`

  const summary = visible.length > 0 && (
    <div className="hidden grid-cols-3 gap-3 sm:grid lg:grid-cols-1">
      <div className="rounded-xl border bg-card p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><ClipboardList className="size-3.5" />Próximo</p>
        <p className="mt-2 text-lg font-semibold leading-none tracking-tight">{next ? dueLabel(daysUntil(next.date)) : "Libre"}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{next ? (next.title || getSubject(subjects, next.subjectId)?.name || findKind(kinds, next.kind).name) : "Nada a la vista"}</p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><CalendarDays className="size-3.5" />Esta semana</p>
        <p className="num mt-2 text-lg font-semibold leading-none">{weekCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">próximos 7 días</p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Check className="size-3.5" />Hechos</p>
        <p className="num mt-2 text-lg font-semibold leading-none">{visible.filter((e) => e.done).length}<span className="text-sm font-normal text-muted-foreground">/{visible.length}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">en total</p>
      </div>
    </div>
  )

  return (
    <>
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-16 animate-fade-in md:pb-0 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-x-8">
      <div className="flex items-start justify-between gap-3 lg:col-start-1">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Agenda</h2>
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
          {pending.length > 0 && (
            <button type="button" onClick={exportCalendar} aria-label="Agregar pendientes al calendario" title="Agregar pendientes al calendario (.ics)"
              className="grid size-9 place-items-center rounded-lg border text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground active:scale-95">
              <CalendarPlus className="size-4" />
            </button>
          )}
          <Button size="sm" onClick={() => openNew()} className="hidden md:inline-flex"><Plus className="size-4" />Nuevo</Button>
        </div>
      </div>

      {/* Panel lateral en PC (resumen + próximos 7 días); en móvil y tablet sus piezas se apilan en el flujo y la franja queda fija arriba */}
      <div className="contents lg:sticky lg:top-10 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
        {summary}
        {viewMode === "list" && visible.length > 0 && <WeekStrip days={stripDays} active={activeDay} onPick={jumpTo} />}
      </div>

      {/* Filtros: un solo botón; lo activo se ve como chips que se pueden quitar */}
      {(filterSubjects.length + (subjectCount[NONE] ? 1 : 0) > 1 || filterKinds.length > 1) && (
        <div className="flex flex-wrap items-center gap-2 lg:col-start-1">
          <Button size="sm" variant="outline" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" className="relative">
            <SlidersHorizontal className="size-3.5" />Filtros
            {filterCount > 0 && <span className="num grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground animate-pop">{filterCount}</span>}
          </Button>
          {activeKinds.map((id) => {
            const k = findKind(kinds, id)
            return (
              <button key={id} type="button" onClick={() => setSelKinds(selKinds.filter((x) => x !== id))} aria-label={`Quitar filtro ${k.name}`}
                className="inline-flex h-7 animate-pop items-center gap-1 rounded-md pl-2 pr-1.5 text-xs font-medium transition hover:brightness-110" style={{ background: tint(k.color, 18), color: ink(k.color) }}>
                {k.name}<X className="size-3 opacity-70" />
              </button>
            )
          })}
          {activeSubjects.map((id) => {
            const sub = id === NONE ? undefined : getSubject(subjects, id)
            const label = sub?.name ?? "Sin materia"
            return (
              <button key={id} type="button" onClick={() => setSelSubjects(selSubjects.filter((x) => x !== id))} aria-label={`Quitar filtro ${label}`}
                className={cn("inline-flex h-7 max-w-[11rem] animate-pop items-center gap-1.5 rounded-md border pl-2 pr-1.5 text-xs font-medium transition hover:brightness-95", sub ? "text-neutral-900" : "bg-foreground/10 text-foreground")}
                style={sub ? { background: sub.bg, borderColor: sub.border } : undefined}>
                <span className="truncate">{label}</span><X className="size-3 shrink-0 opacity-60" />
              </button>
            )
          })}
          {filterCount > 2 && (
            <button type="button" onClick={() => { setSelSubjects([]); setSelKinds([]) }} className="h-7 px-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline">Limpiar</button>
          )}
        </div>
      )}

      <div className="min-w-0 lg:col-start-1">
        {viewMode === "calendar" ? (
          <CalendarView exams={shown} subjects={subjects} kinds={kinds} renderExam={(e) => card(e)} onAdd={openNew} />
        ) : visible.length === 0 ? (
          <div className="animate-scale-in rounded-xl border border-dashed p-10 text-center">
            <ClipboardList className="mx-auto size-8 text-muted-foreground/60" />
            <p className="mt-3 font-medium">{exams.length > 0 ? "Todas las materias están ocultas" : "Tu agenda está vacía"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{exams.length > 0 ? "Muéstralas de nuevo abajo." : "Agrega exámenes, reuniones, actividades… y no olvides nada."}</p>
            {exams.length === 0 && <Button className="mt-4" onClick={() => openNew()}><Plus className="size-4" />Agregar el primero</Button>}
          </div>
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <section>
                <h3 className={cn(heading, "text-destructive")}>Atrasados<span className="font-normal normal-case tracking-normal">{overdue.length}</span></h3>
                <div className="stagger space-y-2">{overdue.map((e) => card(e, { showDate: true, overdue: true }))}</div>
              </section>
            )}

            {dayGroups.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No hay eventos próximos{filterCount > 0 ? " con estos filtros" : ""}.</p>}
            {dayGroups.map((g) => {
              const t = dayTitle(g.date)
              return (
                <section key={g.date} data-day={g.date} className="scroll-mt-[calc(var(--appbar-h)+5.25rem)] lg:scroll-mt-6">
                  <h3 className="flex items-baseline gap-2 px-1 pb-2">
                    <span className={cn("text-sm font-semibold", t.title === "Hoy" && "text-brand")}>{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.sub}</span>
                    <span className="num ml-auto text-xs text-muted-foreground">{g.list.length}</span>
                  </h3>
                  <div className="stagger space-y-2">{g.list.map((e) => card(e))}</div>
                </section>
              )
            })}

            {past.length > 0 && (
              <section>
                <button onClick={() => setShowPast((o) => !o)} aria-expanded={showPast}
                  className="flex w-full items-center gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground">
                  Hechos antes<span className="font-normal normal-case tracking-normal">{past.length}</span>
                  <ChevronDown className={cn("ml-auto size-4 transition-transform duration-300", showPast && "rotate-180")} />
                </button>
                {showPast && <div className="stagger space-y-2">{past.map((e) => card(e, { showDate: true }))}</div>}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Materias ocultas en esta vista */}
      {hiddenSubjectsList.length > 0 && (
        <div className="space-y-2 lg:col-start-1">
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

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} subjects={filterSubjects} kinds={filterKinds}
        subjectCount={subjectCount} kindCount={kindCount} hasNone={Boolean(subjectCount[NONE])} selSubjects={activeSubjects} selKinds={activeKinds}
        setSelSubjects={setSelSubjects} setSelKinds={setSelKinds} resultCount={shown.length} />

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
            <DialogDescription>{dialog.editing ? "Cambia lo que necesites." : "Fecha, peso y notas opcionales."}</DialogDescription>
          </DialogHeader>
          <ExamForm subjects={subjects} kindsApi={kindsApi} initial={dialog.editing} defaultDate={dialog.date} onSave={save} onCancel={closeDialog}
            calendarUrl={dialog.editing ? googleCalendarUrl(toEvent(dialog.editing)) : undefined}
            onDelete={dialog.editing ? () => { remove(dialog.editing!.id); closeDialog() } : undefined} />
        </DialogContent>
      </Dialog>
    </div>
      {/* Móvil: botón flotante. Va en un portal al body: las pestañas animan con transform y eso rompe `fixed` */}
      {mounted && createPortal(
        <button type="button" onClick={() => openNew()} aria-label="Nuevo evento"
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 grid size-14 animate-pop place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-90 md:hidden">
          <Plus className="size-6" />
        </button>,
        document.body
      )}
    </>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import {
  Plus, Pencil, Trash2, Mail, Phone, MapPin, Clock, Copy, Check, X, ArrowLeft, UserPlus,
  CalendarPlus, GraduationCap, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  COLORS_PALETTE, DAYS, TEACHER_ROLES,
  borderFromBg, getTeachers, initials, loadCustomColors, removeCustomColor, saveCustomColor, withTeachers, minutesToTime, timeToMinutes,
  type Absence, type ClassSession, type ColorSwatch, type Exam, type Grade, type OfficeSlot, type Subject, type SubjectConfig, type Teacher,
} from "@/lib/horario-data"

const DAY_SHORT = ["L", "M", "Mi", "J", "V"]
const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"]

/** Primer color de la paleta que aún no usa ninguna materia (si todos se usan, vuelve a empezar). */
export function pickDefaultColor(subjects: Subject[]): ColorSwatch {
  return COLORS_PALETTE.find((c) => !subjects.some((s) => s.bg === c.bg)) ?? COLORS_PALETTE[subjects.length % COLORS_PALETTE.length]
}

const hoursText = (min: number) => { const h = min / 60; return `${Number.isInteger(h) ? h : h.toFixed(1)} h` }

/* ───────────── Selector de color (paleta + personalizados) ───────────── */

export function ColorPicker({ value, onChange }: { value: ColorSwatch; onChange: (c: ColorSwatch) => void }) {
  const [custom, setCustom] = useState<ColorSwatch[]>([])
  const [picking, setPicking] = useState(false)
  const [hex, setHex] = useState("#c9b8f0")
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => setCustom(loadCustomColors()), [])

  const dot = (c: ColorSwatch, key: string, removable = false) => (
    <div key={key} className="group relative">
      <button
        type="button"
        onClick={() => onChange(c)}
        aria-label="Elegir color"
        aria-pressed={value.bg === c.bg}
        className={cn("size-7 rounded-full transition-transform", value.bg === c.bg ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-popover" : "hover:scale-110")}
        style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
      />
      {removable && (
        <button
          type="button"
          onClick={() => { setCustom(removeCustomColor(c.bg)); if (value.bg === c.bg) onChange(COLORS_PALETTE[0]) }}
          aria-label="Quitar color"
          className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-neutral-800 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {COLORS_PALETTE.map((c, i) => dot(c, `p${i}`))}
      {custom.length > 0 && <span className="mx-0.5 h-5 w-px bg-border" />}
      {custom.map((c, i) => dot(c, `c${i}`, true))}
      {picking ? (
        <div className="flex animate-scale-in items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-1 pr-2">
          <button type="button" onClick={() => inputRef.current?.click()} aria-label="Elegir tono" className="size-6 rounded-full ring-1 ring-border" style={{ backgroundColor: hex }} />
          <input ref={inputRef} type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="sr-only" />
          <button
            type="button"
            className="px-1 text-xs font-medium"
            onClick={() => {
              const sw = { bg: hex, border: borderFromBg(hex) }
              setCustom(saveCustomColor(sw))
              onChange(sw)
              setPicking(false)
            }}
          >
            Guardar
          </button>
          <button type="button" onClick={() => setPicking(false)} aria-label="Cancelar" className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} aria-label="Color personalizado" title="Color personalizado"
          className="grid size-7 place-items-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground transition hover:scale-110 hover:border-foreground hover:text-foreground">
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/* ───────────── Pequeños bloques reutilizables ───────────── */

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* sin portapapeles */ }
      }}
      className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground"
    >
      {done ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function Avatar({ name, subject, size = "size-10" }: { name: string; subject: Subject; size?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full text-xs font-bold text-neutral-900", size)} style={{ backgroundColor: subject.bg, boxShadow: `inset 0 0 0 1.5px ${subject.border}` }} aria-hidden>
      {initials(name)}
    </span>
  )
}

/* ───────────── Formulario de materia ───────────── */

function SubjectForm({ subject, subjects, onSave, onCancel }: {
  subject?: Subject
  subjects: Subject[]
  onSave: (name: string, color: ColorSwatch) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(subject?.name ?? "")
  const [color, setColor] = useState<ColorSwatch>(subject ? { bg: subject.bg, border: subject.border } : pickDefaultColor(subjects))
  const ok = name.trim().length > 0

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (ok) onSave(name.trim(), color) }}
      className="space-y-5"
    >
      {/* Vista previa */}
      <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ backgroundColor: color.bg, borderColor: color.border }}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/10 text-neutral-900"><GraduationCap className="size-5" /></span>
        <p className="min-w-0 truncate font-semibold text-neutral-900">{name.trim() || "Nombre de la materia"}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject-name">Nombre</Label>
        <Input id="subject-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Cálculo diferencial" maxLength={60} />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker value={color} onChange={setColor} />
        <p className="text-xs text-muted-foreground">Es el color de sus clases en el horario, las notas y los exámenes.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={!ok}>{subject ? "Guardar cambios" : "Crear materia"}</Button>
      </div>
    </form>
  )
}

/* ───────────── Horarios de asesoría ───────────── */

const slotSort = (a: OfficeSlot, b: OfficeSlot) => a.day - b.day || a.start - b.start
export const slotText = (sl: OfficeSlot, timeLabel: (m: number) => string) => `${SHORT[sl.day]} ${timeLabel(sl.start)}–${timeLabel(sl.end)}`

function OfficeHoursEditor({ slots, setSlots, note, setNote, timeLabel, pendingRef }: {
  slots: OfficeSlot[]
  setSlots: (s: OfficeSlot[]) => void
  note: string
  setNote: (n: string) => void
  timeLabel: (m: number) => string
  pendingRef: React.MutableRefObject<(() => OfficeSlot[]) | null>
}) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState(14 * 60)
  const [end, setEnd] = useState(16 * 60)
  const valid = days.length > 0 && end > start
  const draft = (): OfficeSlot[] => (open && valid ? days.map((day) => ({ id: crypto.randomUUID(), day, start, end })) : [])
  pendingRef.current = draft // si guardan el profesor con el panel abierto, no se pierde lo escrito

  function add() {
    if (!valid) return
    setSlots([...slots, ...draft()].sort(slotSort))
    setDays([])
    setOpen(false)
  }
  function changeStart(v: number) {
    setEnd(end > start ? v + (end - start) : v + 120) // conserva la duración
    setStart(v)
  }

  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-1.5"><Clock className="size-3.5" />Asesorías <span className="font-normal text-muted-foreground">(opcional)</span></Label>
      {slots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((sl) => (
            <span key={sl.id} className="num inline-flex animate-pop items-center gap-1 rounded-full border bg-muted/40 py-1 pl-2.5 pr-1 text-xs">
              {slotText(sl, timeLabel)}
              <button type="button" aria-label={`Quitar ${slotText(sl, timeLabel)}`} onClick={() => setSlots(slots.filter((x) => x.id !== sl.id))}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}
      {open ? (
        <div className="animate-rise space-y-3 rounded-2xl border bg-muted/30 p-3">
          <div className="flex gap-1.5" role="group" aria-label="Días de la asesoría">
            {DAYS.map((name, i) => {
              const on = days.includes(i)
              return (
                <button key={name} type="button" aria-pressed={on} aria-label={name} title={name}
                  onClick={() => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
                  className={cn("grid h-9 flex-1 place-items-center rounded-lg border text-sm font-semibold transition active:scale-95", on ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground")}>
                  {DAY_SHORT[i]}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input type="time" aria-label="Desde" value={minutesToTime(start)} onChange={(e) => e.target.value && changeStart(timeToMinutes(e.target.value))} />
            <span className="text-sm text-muted-foreground">a</span>
            <Input type="time" aria-label="Hasta" value={minutesToTime(Math.max(0, Math.min(end, 24 * 60 - 1)))} onChange={(e) => e.target.value && setEnd(timeToMinutes(e.target.value))} />
          </div>
          {end <= start && <p className="text-xs text-destructive">La hora de fin debe ser después de la de inicio.</p>}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Elige uno o varios días con la misma hora.</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" size="sm" onClick={add} disabled={!valid}>Agregar</Button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
          <Plus className="size-3.5" />Agregar horario de asesoría
        </button>
      )}
      <Input id="t-hours" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional): previa cita por correo…" aria-label="Nota de asesorías" />
    </div>
  )
}

/* ───────────── Formulario de profesor ───────────── */

function TeacherForm({ teacher, subject, timeLabel, onSave, onCancel }: {
  teacher?: Teacher
  subject: Subject
  timeLabel: (m: number) => string
  onSave: (t: Omit<Teacher, "id">) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(teacher?.name ?? "")
  const [role, setRole] = useState(teacher?.role ?? "")
  const [email, setEmail] = useState(teacher?.email ?? "")
  const [phone, setPhone] = useState(teacher?.phone ?? "")
  const [office, setOffice] = useState(teacher?.office ?? "")
  const [hours, setHours] = useState(teacher?.hours ?? "")
  const [slots, setSlots] = useState<OfficeSlot[]>(teacher?.slots ?? [])
  const pendingRef = useRef<(() => OfficeSlot[]) | null>(null)
  const [tried, setTried] = useState(false)

  const nameOk = name.trim().length > 0
  const emailOk = email.trim() === "" || /^\S+@\S+\.\S+$/.test(email.trim())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!nameOk || !emailOk) return
    const clean = (v: string) => v.trim() || undefined
    const all = [...slots, ...(pendingRef.current?.() ?? [])].sort(slotSort)
    onSave({ name: name.trim(), role: clean(role), email: clean(email), phone: clean(phone), office: clean(office), hours: clean(hours), slots: all.length ? all : undefined })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={name || "?"} subject={subject} size="size-12" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="t-name">Nombre</Label>
          <Input id="t-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María Pérez" aria-invalid={tried && !nameOk} />
        </div>
      </div>
      {tried && !nameOk && <p className="-mt-2 text-xs text-destructive">Escribe el nombre del profesor.</p>}

      <div className="space-y-1.5">
        <Label htmlFor="t-role">Rol <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input id="t-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Teoría, laboratorio, monitor…" maxLength={30} />
        <div className="flex flex-wrap gap-1.5">
          {TEACHER_ROLES.map((r) => (
            <button key={r} type="button" onClick={() => setRole(role === r ? "" : r)} aria-pressed={role === r}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", role === r ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="t-email" className="flex items-center gap-1.5"><Mail className="size-3.5" />Correo</Label>
          <Input id="t-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="profe@universidad.edu.co" aria-invalid={tried && !emailOk} />
          {tried && !emailOk && <p className="text-xs text-destructive">Revisa el correo.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-phone" className="flex items-center gap-1.5"><Phone className="size-3.5" />Teléfono</Label>
          <Input id="t-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-office" className="flex items-center gap-1.5"><MapPin className="size-3.5" />Oficina</Label>
          <Input id="t-office" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="Ej: Bloque B, 305" />
        </div>
        <div className="sm:col-span-2">
          <OfficeHoursEditor slots={slots} setSlots={setSlots} note={hours} setNote={setHours} timeLabel={timeLabel} pendingRef={pendingRef} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{teacher ? "Guardar cambios" : "Agregar profesor"}</Button>
      </div>
    </form>
  )
}

/* ───────────── Tarjeta de profesor ───────────── */

function TeacherCard({ teacher, subject, classCount, timeLabel, onEdit, onDelete }: {
  teacher: Teacher
  subject: Subject
  classCount: number
  timeLabel: (m: number) => string
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const row = (icon: React.ReactNode, content: React.ReactNode, copy?: { text: string; label: string }) => (
    <div className="flex min-h-7 items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{content}</span>
      {copy && <CopyButton text={copy.text} label={copy.label} />}
    </div>
  )
  const hasContact = teacher.email || teacher.phone || teacher.office || teacher.hours || teacher.slots?.length

  return (
    <div className="animate-pop rounded-2xl border bg-card p-3">
      <div className="flex items-start gap-3">
        <Avatar name={teacher.name} subject={subject} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{teacher.name || "Sin nombre"}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {teacher.role && <span className="rounded-full bg-foreground/10 px-2 py-0.5 font-medium text-foreground/80">{teacher.role}</span>}
            {classCount > 0 && <span>Da {classCount} clase{classCount === 1 ? "" : "s"}</span>}
          </p>
        </div>
        {!confirming && (
          <div className="flex shrink-0 gap-0.5">
            <button type="button" onClick={onEdit} aria-label={`Editar a ${teacher.name}`} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground"><Pencil className="size-4" /></button>
            <button type="button" onClick={() => setConfirming(true)} aria-label={`Quitar a ${teacher.name}`} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        )}
      </div>

      {confirming ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm">
          <span className="mr-auto">¿Quitar a este profesor?</span>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>Quitar</Button>
        </div>
      ) : hasContact ? (
        <div className="mt-2.5 space-y-0.5 border-t pt-2.5">
          {teacher.email && row(<Mail className="size-4" />, <a href={`mailto:${teacher.email}`} className="underline-offset-4 hover:underline">{teacher.email}</a>, { text: teacher.email, label: "Copiar correo" })}
          {teacher.phone && row(<Phone className="size-4" />, <a href={`tel:${teacher.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">{teacher.phone}</a>, { text: teacher.phone, label: "Copiar teléfono" })}
          {teacher.office && row(<MapPin className="size-4" />, teacher.office)}
          {teacher.slots && teacher.slots.length > 0 ? (
            <div className="flex items-start gap-2 pt-1.5 text-sm">
              <Clock className="mt-1 size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">Asesorías</p>
                <div className="flex flex-wrap gap-1.5">
                  {teacher.slots.map((sl) => (
                    <span key={sl.id} className="num rounded-full px-2.5 py-1 text-xs font-medium text-neutral-900" style={{ backgroundColor: subject.bg, boxShadow: `inset 0 0 0 1px ${subject.border}` }}>{slotText(sl, timeLabel)}</span>
                  ))}
                </div>
                {teacher.hours && <p className="text-xs text-muted-foreground">{teacher.hours}</p>}
              </div>
            </div>
          ) : (
            teacher.hours && row(<Clock className="size-4" />, <>Asesorías: {teacher.hours}</>)
          )}
        </div>
      ) : (
        <button type="button" onClick={onEdit} className="mt-2.5 w-full rounded-xl border border-dashed py-2 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
          Agregar correo, teléfono o asesorías
        </button>
      )}
    </div>
  )
}

/* ───────────── Pestaña Materias ───────────── */

type Props = {
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
  setGrades: React.Dispatch<React.SetStateAction<Record<string, Grade[]>>>
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
  setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>
  setSubjectConfigs: React.Dispatch<React.SetStateAction<Record<string, SubjectConfig>>>
  timeLabel: (min: number) => string
  onAddClass: (subjectId: string) => void
  onEditClass: (c: ClassSession) => void
  request: MateriasRequest | null // algo que abrir apenas se muestre (nueva materia, o la ficha de una materia / profesor)
  onRequestHandled: () => void
}

export type MateriasRequest = { kind: "new" } | { kind: "open"; subjectId: string; teacherId?: string }

type Dlg = { subjectId: string | null; view: "detail" | "subject" | "teacher"; teacherId?: string; fresh?: boolean }

export function MateriasTab({
  subjects, setSubjects, classes, setClasses, setGrades, setExams, setAbsences, setSubjectConfigs,
  timeLabel, onAddClass, onEditClass, request, onRequestHandled,
}: Props) {
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // peticiones de fuera (botón del horario vacío, tocar una asesoría): se atienden una vez y se avisa
  useEffect(() => {
    if (!request) return
    setConfirmDelete(false)
    if (request.kind === "new") setDlg({ subjectId: null, view: "subject" })
    else setDlg(request.teacherId ? { subjectId: request.subjectId, view: "teacher", teacherId: request.teacherId } : { subjectId: request.subjectId, view: "detail" })
    onRequestHandled()
  }, [request, onRequestHandled])

  const current = dlg?.subjectId ? subjects.find((s) => s.id === dlg.subjectId) : undefined
  const close = () => { setDlg(null); setConfirmDelete(false) }
  const open = (next: Dlg) => { setConfirmDelete(false); setDlg(next) }

  const classesOf = (id: string) => classes.filter((c) => c.subjectId === id).sort((a, b) => a.day - b.day || a.startTime - b.startTime)
  const setTeachers = (id: string, fn: (list: Teacher[]) => Teacher[]) =>
    setSubjects((prev) => prev.map((s) => (s.id === id ? withTeachers(s, fn(getTeachers(s))) : s)))

  function saveSubject(name: string, color: ColorSwatch) {
    if (current) {
      setSubjects((prev) => prev.map((s) => (s.id === current.id ? { ...s, name, bg: color.bg, border: color.border } : s)))
      open({ subjectId: current.id, view: "detail" })
    } else {
      const id = crypto.randomUUID()
      setSubjects((prev) => [...prev, { id, name, bg: color.bg, border: color.border }])
      open({ subjectId: id, view: "detail", fresh: true })
    }
  }

  function saveTeacher(data: Omit<Teacher, "id">) {
    if (!current) return
    if (dlg?.teacherId && dlg.teacherId !== "new") {
      setTeachers(current.id, (list) => list.map((t) => (t.id === dlg.teacherId ? { ...t, ...data } : t)))
    } else {
      setTeachers(current.id, (list) => [...list, { id: crypto.randomUUID(), ...data }])
    }
    open({ subjectId: current.id, view: "detail" })
  }

  function removeTeacher(subjectId: string, teacherId: string) {
    setTeachers(subjectId, (list) => list.filter((t) => t.id !== teacherId))
    setClasses((prev) => prev.map((c) => (c.teacherId === teacherId ? { ...c, teacherId: undefined } : c)))
  }

  function deleteSubject(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setClasses((prev) => prev.filter((c) => c.subjectId !== id))
    setExams((prev) => prev.filter((e) => e.subjectId !== id))
    setAbsences((prev) => prev.filter((a) => a.subjectId !== id))
    setGrades((prev) => { const copy = { ...prev }; delete copy[id]; return copy })
    setSubjectConfigs((prev) => { const copy = { ...prev }; delete copy[id]; return copy })
    close()
  }

  /* ── tarjetas ── */

  const card = (s: Subject) => {
    const cl = classesOf(s.id)
    const teachers = getTeachers(s)
    const weekMin = cl.reduce((n, c) => n + (c.endTime - c.startTime), 0)
    const days = new Set(cl.map((c) => c.day))
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => open({ subjectId: s.id, view: "detail" })}
        className="group animate-pop flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-(--card-shadow) transition duration-200 hover:-translate-y-0.5 hover:border-foreground/25 active:scale-[0.99]"
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full" style={{ background: s.border }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-tight">{s.name}</span>
            <span className="num mt-0.5 block text-xs text-muted-foreground">
              {cl.length === 0 ? "Sin clases aún" : `${cl.length} clase${cl.length === 1 ? "" : "s"} · ${hoursText(weekMin)} por semana`}
            </span>
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </span>

        <span className="flex items-center justify-between gap-3">
          {teachers.length > 0 ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex -space-x-2">
                {teachers.slice(0, 3).map((t) => <Avatar key={t.id} name={t.name} subject={s} size="size-7 ring-2 ring-card" />)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {teachers[0].name || "Profesor"}{teachers.length > 1 ? ` +${teachers.length - 1}` : ""}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs italic text-muted-foreground/70"><UserPlus className="size-3.5" />Agregar profesor</span>
          )}
          <span className="flex shrink-0 gap-1" aria-label="Días con clase">
            {DAY_SHORT.map((d, i) => (
              <span key={d} className={cn("grid size-5 place-items-center rounded-full text-[9px] font-semibold", days.has(i) ? "text-neutral-900" : "bg-foreground/[0.06] text-muted-foreground/60")}
                style={days.has(i) ? { backgroundColor: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` } : undefined}>
                {d}
              </span>
            ))}
          </span>
        </span>
      </button>
    )
  }

  /* ── contenido del diálogo ── */

  const header = (title: string, desc?: string, back?: () => void) => (
    <DialogHeader className="space-y-1">
      <div className="flex items-center gap-2">
        {back && (
          <button type="button" onClick={back} aria-label="Volver" className="-ml-1 grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <DialogTitle className="min-w-0 truncate">{title}</DialogTitle>
      </div>
      <DialogDescription className={desc ? undefined : "sr-only"}>{desc ?? title}</DialogDescription>
    </DialogHeader>
  )

  let body: React.ReactNode = null
  if (dlg?.view === "subject") {
    body = (
      <>
        {header(current ? "Editar materia" : "Nueva materia", current ? "Cambia su nombre o su color." : "Después podrás agregar sus profesores y sus clases.", current ? () => open({ subjectId: current.id, view: "detail" }) : undefined)}
        <SubjectForm key={current?.id ?? "new"} subject={current} subjects={subjects} onSave={saveSubject} onCancel={() => (current ? open({ subjectId: current.id, view: "detail" }) : close())} />
      </>
    )
  } else if (dlg?.view === "teacher" && current) {
    const t = dlg.teacherId && dlg.teacherId !== "new" ? getTeachers(current).find((x) => x.id === dlg.teacherId) : undefined
    body = (
      <>
        {header(t ? "Editar profesor" : "Nuevo profesor", current.name, () => open({ subjectId: current.id, view: "detail" }))}
        <TeacherForm key={t?.id ?? "new"} teacher={t} subject={current} timeLabel={timeLabel} onSave={saveTeacher} onCancel={() => open({ subjectId: current.id, view: "detail" })} />
      </>
    )
  } else if (dlg?.view === "detail" && current) {
    const s = current
    const teachers = getTeachers(s)
    const cl = classesOf(s.id)
    body = (
      <>
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: s.border }} />
            <DialogTitle className="min-w-0 flex-1 truncate text-lg">{s.name}</DialogTitle>
            <button type="button" onClick={() => open({ subjectId: s.id, view: "subject" })} aria-label="Editar materia" title="Editar nombre y color"
              className="mr-6 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground">
              <Pencil className="size-4" />
            </button>
          </div>
          <DialogDescription className="sr-only">Profesores y clases de {s.name}</DialogDescription>
        </DialogHeader>

        {dlg.fresh && (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            ¡Materia creada! Ahora agrega a su profesor y sus clases.
          </p>
        )}

        {/* Profesores */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profesores <span className="font-normal normal-case tracking-normal">{teachers.length || ""}</span></h3>
            {teachers.length > 0 && <Button size="sm" variant="secondary" onClick={() => open({ subjectId: s.id, view: "teacher", teacherId: "new" })}><Plus className="size-3.5" />Agregar</Button>}
          </div>
          {teachers.length === 0 ? (
            <button type="button" onClick={() => open({ subjectId: s.id, view: "teacher", teacherId: "new" })}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition hover:border-foreground/40 hover:bg-foreground/[0.03]">
              <UserPlus className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Agregar profesor</span>
              <span className="max-w-[17rem] text-xs text-muted-foreground">Guarda su correo, teléfono y asesorías para tenerlos a un toque. Puedes agregar varios (teoría, laboratorio…).</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              {teachers.map((t) => (
                <TeacherCard key={t.id} teacher={t} subject={s} timeLabel={timeLabel} classCount={cl.filter((c) => c.teacherId === t.id).length}
                  onEdit={() => open({ subjectId: s.id, view: "teacher", teacherId: t.id })} onDelete={() => removeTeacher(s.id, t.id)} />
              ))}
            </div>
          )}
        </section>

        {/* Clases */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clases <span className="font-normal normal-case tracking-normal">{cl.length || ""}</span></h3>
            {cl.length > 0 && <Button size="sm" variant="secondary" onClick={() => { close(); onAddClass(s.id) }}><Plus className="size-3.5" />Agregar</Button>}
          </div>
          {cl.length === 0 ? (
            <button type="button" onClick={() => { close(); onAddClass(s.id) }}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition hover:border-foreground/40 hover:bg-foreground/[0.03]">
              <CalendarPlus className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Agregar clase al horario</span>
              <span className="text-xs text-muted-foreground">Elige los días y la hora en que se dicta.</span>
            </button>
          ) : (
            <ul className="space-y-1.5">
              {cl.map((c) => {
                const t = teachers.find((x) => x.id === c.teacherId)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => { close(); onEditClass(c) }}
                      className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition hover:border-foreground/25 active:scale-[0.99]">
                      <span className="grid h-7 w-11 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-neutral-900" style={{ backgroundColor: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` }}>{SHORT[c.day]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="num block text-sm font-medium">{timeLabel(c.startTime)} – {timeLabel(c.endTime)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{[c.room, c.group && `Grupo ${c.group}`, t?.name].filter(Boolean).join(" · ") || "Sin salón asignado"}</span>
                      </span>
                      <Pencil className="size-3.5 shrink-0 text-muted-foreground/60" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Eliminar */}
        <div className="border-t pt-3">
          {confirmDelete ? (
            <div className="space-y-2.5 rounded-xl bg-destructive/10 p-3 text-sm">
              <p>Se eliminarán <b>{s.name}</b> y todo lo suyo: {cl.length} clase{cl.length === 1 ? "" : "s"}, notas, exámenes y faltas. No se puede deshacer.</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteSubject(s.id)}>Eliminar materia</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-destructive">
              <Trash2 className="size-3.5" />Eliminar materia
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {subjects.length === 0 ? (
        <div className="animate-scale-in rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-foreground/10"><GraduationCap className="size-6" /></div>
          <h3 className="text-lg font-semibold">Aún no tienes materias</h3>
          <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-muted-foreground">Crea una materia, ponle un color y agrega a su profesor. Después ubicas sus clases en la semana.</p>
          <Button onClick={() => open({ subjectId: null, view: "subject" })}><Plus className="size-4" />Crear primera materia</Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Toca una materia para ver y editar a sus profesores y sus clases.</p>
            <Button size="sm" onClick={() => open({ subjectId: null, view: "subject" })} className="shrink-0 rounded-full"><Plus className="size-4" />Materia</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{subjects.map(card)}</div>
        </>
      )}

      <Dialog open={dlg !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-[480px]">{body}</DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useRef } from "react"
import { Plus, Mail, Phone, MapPin, Clock, Copy, Check, X } from "lucide-react"
import { MultiPicker } from "./multi-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  DAYS, TEACHER_ROLES, initials, minutesToTime, timeToMinutes, subjectsOf,
  type ClassSession, type OfficeSlot, type Subject, type Teacher,
} from "@/lib/horario-data"

const DAY_SHORT = ["L", "M", "Mi", "J", "V"]
const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"]

/* ───────────── Pequeños bloques reutilizables ───────────── */

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* sin portapapeles */ }
      }}
      className="tap grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground"
    >
      {done ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  )
}

/** Color del avatar de un profesor: el de su primera materia, o gris si aún no tiene. */
export function teacherColor(t: Teacher, subjects: Subject[]) {
  const s = subjectsOf(t.id, subjects)[0]
  return s ? { bg: s.bg, border: s.border } : { bg: "#e5e7eb", border: "#9ca3af" }
}

export function Avatar({ name, color, size = "size-10" }: { name: string; color: { bg: string; border: string }; size?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full text-xs font-bold text-neutral-900", size)} style={{ backgroundColor: color.bg, boxShadow: `inset 0 0 0 1.5px ${color.border}` }} aria-hidden>
      {initials(name)}
    </span>
  )
}

/* ───────────── Operaciones sobre el directorio ───────────── */

export type TeacherOps = {
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  setTeachers: (u: Teacher[] | ((prev: Teacher[]) => Teacher[])) => void
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
}

/** Crea o actualiza un profesor y deja asignadas exactamente las materias elegidas. Devuelve su id. */
export function saveTeacher(ops: TeacherOps, id: string | undefined, data: Omit<Teacher, "id">, subjectIds: string[]): string {
  const tid = id ?? crypto.randomUUID()
  ops.setTeachers((prev) => (prev.some((t) => t.id === tid) ? prev.map((t) => (t.id === tid ? { ...t, ...data, id: tid } : t)) : [...prev, { ...data, id: tid }]))
  ops.setSubjects((prev) => prev.map((s) => {
    const has = s.teacherIds?.includes(tid) ?? false
    const want = subjectIds.includes(s.id)
    if (has === want) return s
    return { ...s, teacherIds: want ? [...(s.teacherIds ?? []), tid] : (s.teacherIds ?? []).filter((x) => x !== tid) }
  }))
  // si lo quitaron de una materia, sus clases ya no lo tienen asignado
  ops.setClasses((prev) => prev.map((c) => (c.teacherId === tid && !subjectIds.includes(c.subjectId) ? { ...c, teacherId: undefined } : c)))
  return tid
}

/** Asigna o quita un profesor de una materia. */
export function toggleAssign(ops: TeacherOps, teacherId: string, subjectId: string, on: boolean) {
  ops.setSubjects((prev) => prev.map((s) => (s.id !== subjectId ? s : { ...s, teacherIds: on ? [...new Set([...(s.teacherIds ?? []), teacherId])] : (s.teacherIds ?? []).filter((x) => x !== teacherId) })))
  if (!on) ops.setClasses((prev) => prev.map((c) => (c.teacherId === teacherId && c.subjectId === subjectId ? { ...c, teacherId: undefined } : c)))
}

/** Borra al profesor del directorio, de todas las materias y de sus clases. */
export function deleteTeacher(ops: TeacherOps, teacherId: string) {
  ops.setTeachers((prev) => prev.filter((t) => t.id !== teacherId))
  ops.setSubjects((prev) => prev.map((s) => (s.teacherIds?.includes(teacherId) ? { ...s, teacherIds: s.teacherIds.filter((x) => x !== teacherId) } : s)))
  ops.setClasses((prev) => prev.map((c) => (c.teacherId === teacherId ? { ...c, teacherId: undefined } : c)))
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
                className="tap grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-3" /></button>
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

export function TeacherForm({ teacher, subjects, presetSubjectIds, timeLabel, onSave, onCancel }: {
  teacher?: Teacher
  subjects: Subject[]
  presetSubjectIds?: string[]
  timeLabel: (m: number) => string
  onSave: (t: Omit<Teacher, "id">, subjectIds: string[]) => void
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
  const [subjectIds, setSubjectIds] = useState<string[]>(() => (teacher ? subjectsOf(teacher.id, subjects).map((s) => s.id) : presetSubjectIds ?? []))
  const [tried, setTried] = useState(false)

  const nameOk = name.trim().length > 0
  const emailOk = email.trim() === "" || /^\S+@\S+\.\S+$/.test(email.trim())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!nameOk || !emailOk) return
    const clean = (v: string) => v.trim() || undefined
    const all = [...slots, ...(pendingRef.current?.() ?? [])].sort(slotSort)
    onSave({ name: name.trim(), role: clean(role), email: clean(email), phone: clean(phone), office: clean(office), hours: clean(hours), slots: all.length ? all : undefined }, subjectIds)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={name || "?"} color={subjects.find((s) => s.id === subjectIds[0]) ?? { bg: "#e5e7eb", border: "#9ca3af" }} size="size-12" />
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div className="space-y-2">
        <Label>Materias <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        {subjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no tienes materias. Podrás asignarlas después.</p>
        ) : (
          <MultiPicker noun="materia" value={subjectIds} onChange={setSubjectIds}
            items={subjects.map((sb) => ({
              id: sb.id, label: sb.name, color: { bg: sb.bg, border: sb.border },
              lead: <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: sb.bg, boxShadow: `0 0 0 1.5px ${sb.border}` }} />,
            }))} />
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{teacher ? "Guardar cambios" : "Agregar profesor"}</Button>
      </div>
    </form>
  )
}


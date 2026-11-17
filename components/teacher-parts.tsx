"use client"

import { useState, useRef } from "react"
import { Plus, Mail, Phone, MapPin, Copy, Check, X } from "lucide-react"
import { MultiPicker } from "./multi-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed px-3 text-sm text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
          <Plus className="size-4" />Agregar horario de asesoría
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
  const [customRole, setCustomRole] = useState(() => !!teacher?.role && !TEACHER_ROLES.includes(teacher.role))

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

  const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>
  const field = (icon: React.ReactNode, input: React.ReactNode) => (
    <div className="flex items-center gap-3"><span className="text-muted-foreground">{icon}</span><div className="min-w-0 flex-1">{input}</div></div>
  )

  // Misma estructura que la ficha del profesor: cabecera → contacto → asesorías → materias
  return (
    <form onSubmit={submit} className="animate-fade-in space-y-5">
      <div className="flex items-start gap-3">
        <Avatar name={name || "?"} color={subjects.find((s) => s.id === subjectIds[0]) ?? { bg: "#e5e7eb", border: "#9ca3af" }} size="size-12" />
        <div className="min-w-0 flex-1 space-y-2 pr-6">
          <Input id="t-name" aria-label="Nombre" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del profesor" aria-invalid={tried && !nameOk} className="h-11 text-base font-semibold" />
          {tried && !nameOk && <p className="text-xs text-destructive">Escribe el nombre del profesor.</p>}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rol">
            {TEACHER_ROLES.map((r) => (
              <button key={r} type="button" onClick={() => { setRole(role === r ? "" : r); setCustomRole(false) }} aria-pressed={role === r && !customRole}
                className={cn("min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition", role === r && !customRole ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {r}
              </button>
            ))}
            <button type="button" onClick={() => { setCustomRole((v) => !v); if (!customRole && TEACHER_ROLES.includes(role)) setRole("") }} aria-pressed={customRole}
              className={cn("min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition", customRole ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              Otro…
            </button>
          </div>
          {customRole && <Input autoFocus value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ej: Asistente, Invitado…" maxLength={30} aria-label="Rol" />}
        </div>
      </div>

      <section className="space-y-2.5 rounded-2xl border bg-card p-3">
        {field(<Mail className="size-4" />, <Input id="t-email" type="email" inputMode="email" aria-label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" aria-invalid={tried && !emailOk} />)}
        {tried && !emailOk && <p className="pl-7 text-xs text-destructive">Revisa el correo.</p>}
        {field(<Phone className="size-4" />, <Input id="t-phone" type="tel" inputMode="tel" aria-label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" />)}
        {field(<MapPin className="size-4" />, <Input id="t-office" aria-label="Oficina" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="Oficina (ej: Bloque B, 305)" />)}
      </section>

      <section className="space-y-2">
        <H>Asesorías</H>
        <OfficeHoursEditor slots={slots} setSlots={setSlots} note={hours} setNote={setHours} timeLabel={timeLabel} pendingRef={pendingRef} />
      </section>

      <section className="space-y-2">
        <H>Materias que da</H>
        {subjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no tienes materias. Podrás asignarlas después.</p>
        ) : (
          <MultiPicker variant="rows" noun="materia" value={subjectIds} onChange={setSubjectIds}
            items={subjects.map((sb) => ({
              id: sb.id, label: sb.name, color: { bg: sb.bg, border: sb.border },
              lead: <span className="mx-1 size-4 shrink-0 rounded-full" style={{ backgroundColor: sb.bg, boxShadow: `0 0 0 2px ${sb.border}` }} />,
            }))} />
        )}
      </section>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{teacher ? "Guardar cambios" : "Agregar profesor"}</Button>
      </div>
    </form>
  )
}

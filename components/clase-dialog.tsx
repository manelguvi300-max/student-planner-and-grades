"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, TriangleAlert, Home, UserRound, Clock, Search, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  DAYS, getSubject, teachersOf, minutesToTime, timeToMinutes,
  type ClassSession, type ColorSwatch, type Subject, type Teacher,
} from "@/lib/horario-data"
import { ColorPicker, pickDefaultColor } from "./materias-tab"

const DAY_SHORT = ["L", "M", "Mi", "J", "V"]
const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"]
const DURATIONS = [60, 90, 120, 180]
const durLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`)

/** null = cerrado; con `cls` se edita esa clase; sin `cls` se crea una nueva en ese día/hora. */
export type ClassDialogState = { cls?: ClassSession; day: number; startMin: number; subjectId?: string }

type Props = {
  state: ClassDialogState | null
  onClose: () => void
  teachers: Teacher[]
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
  timeLabel: (min: number) => string
}

export function ClaseDialog({ state, onClose, ...rest }: Props) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-[460px]">
        {state && <ClaseForm key={state.cls?.id ?? `new-${state.day}-${state.startMin}-${state.subjectId ?? ""}`} state={state} onClose={onClose} {...rest} />}
      </DialogContent>
    </Dialog>
  )
}

function ClaseForm({ state, onClose, teachers: directory, subjects, setSubjects, classes, setClasses, timeLabel }: Omit<Props, "state"> & { state: ClassDialogState }) {
  const editing = state.cls
  const initialDur = editing ? editing.endTime - editing.startTime : 120

  const [subjectId, setSubjectId] = useState(editing?.subjectId ?? state.subjectId ?? subjects[0]?.id ?? "")
  const [days, setDays] = useState<number[]>([editing?.day ?? state.day])
  const [start, setStart] = useState(editing?.startTime ?? state.startMin)
  const [dur, setDur] = useState(initialDur)
  const [customEnd, setCustomEnd] = useState(!DURATIONS.includes(initialDur))
  const [group, setGroup] = useState(editing?.group ?? "")
  const [room, setRoom] = useState(editing?.room ?? "")
  const [perDay, setPerDay] = useState(false)
  const [rooms, setRooms] = useState<Record<number, string>>({})
  const [teacherId, setTeacherId] = useState<string | undefined>(() => {
    if (editing) return editing.teacherId
    const s = getSubject(subjects, state.subjectId ?? subjects[0]?.id ?? "")
    const t = s ? teachersOf(s, directory) : []
    return t.length === 1 ? t[0].id : undefined // un solo profesor → ya queda asignado
  })
  const [creating, setCreating] = useState(subjects.length === 0)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState<ColorSwatch>(() => pickDefaultColor(subjects))
  const [confirmDel, setConfirmDel] = useState(false)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState("")

  const subject = getSubject(subjects, subjectId)
  const teachers = subject ? teachersOf(subject, directory) : []
  const teacher = teachers.find((t) => t.id === teacherId)
  const end = start + dur
  const timeOk = dur > 0 && end <= 24 * 60 - 1
  const canSave = !!subject && days.length > 0 && timeOk

  // choques con otras clases en los días elegidos (aviso, no bloquea)
  const clashes = useMemo(() => {
    if (!timeOk) return []
    return classes
      .filter((c) => c.id !== editing?.id && days.includes(c.day) && c.startTime < end && c.endTime > start)
      .map((c) => ({ c, name: getSubject(subjects, c.subjectId)?.name ?? "Otra clase" }))
  }, [classes, days, start, end, timeOk, editing?.id, subjects])

  const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  const matches = subjects.filter((s) => norm(s.name).includes(norm(query.trim())))
  function choose(id: string) { pickSubject(id); setPicking(false); setQuery("") }

  function pickSubject(id: string) {
    setSubjectId(id)
    const s = getSubject(subjects, id)
    const t = s ? teachersOf(s, directory) : []
    setTeacherId(t.length === 1 ? t[0].id : undefined) // un solo profesor → ya queda asignado
  }

  function toggleDay(d: number) {
    if (editing) return setDays([d])
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  function createSubject() {
    const name = newName.trim()
    if (!name) return
    const id = crypto.randomUUID()
    setSubjects((prev) => [...prev, { id, name, bg: newColor.bg, border: newColor.border }])
    setSubjectId(id)
    setTeacherId(undefined)
    setCreating(false)
    setNewName("")
    setQuery("")
  }

  function save() {
    if (!canSave) return
    const roomFor = (d: number) => (perDay ? rooms[d] ?? "" : room).trim()
    const common = { subjectId, startTime: start, endTime: end, group: group.trim(), teacherId: teacher?.id }
    if (editing) {
      setClasses((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...common, day: days[0], room: roomFor(days[0]) } : c)))
    } else {
      setClasses((prev) => [...prev, ...days.map((day) => ({ id: crypto.randomUUID(), day, room: roomFor(day), ...common }))])
    }
    onClose()
  }

  const section = (label: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{icon}{label}</Label>
      {children}
    </div>
  )

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }} className="contents">
      <DialogHeader className="space-y-1">
        <DialogTitle>{editing ? "Editar clase" : "Nueva clase"}</DialogTitle>
        <DialogDescription>{editing ? "Cambia lo que necesites y guarda." : "Elige la materia, los días y la hora. Puedes crear varias a la vez."}</DialogDescription>
      </DialogHeader>

      {/* Vista previa en vivo */}
      <div
        className="animate-fade-in rounded-2xl p-3 text-neutral-900 shadow-[inset_4px_0_0_var(--c)]"
        style={{ "--c": subject?.border ?? "var(--border)", backgroundColor: subject?.bg ?? "var(--muted)" } as React.CSSProperties}
      >
        <p className="truncate pl-1.5 text-sm font-semibold">{subject?.name ?? "Elige una materia"}</p>
        <p className="num pl-1.5 text-xs opacity-75">
          {days.length ? days.map((d) => SHORT[d]).join(" · ") : "Sin día"} · {timeOk ? `${timeLabel(start)} – ${timeLabel(end)}` : "Hora inválida"}
        </p>
        {(room.trim() || group.trim() || teacher) && (
          <p className="truncate pl-1.5 text-xs opacity-75">{[!perDay && room.trim(), group.trim() && `Grupo ${group.trim()}`, teacher?.name].filter(Boolean).join(" · ")}</p>
        )}
      </div>

      {/* Materia */}
      {section("Materia", null, (
        <div className="space-y-2.5">
          {subject && (
            <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking}
              className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:border-foreground/30 active:scale-[0.99]">
              <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: subject.bg, boxShadow: `0 0 0 1.5px ${subject.border}` }} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{subject.name}</span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}
          {(picking || !subject) && !creating && (
            <div className="animate-rise overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input autoFocus={!!subject} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar materia…" aria-label="Buscar materia"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (matches[0]) choose(matches[0].id) } }} />
              </div>
              <ul className="max-h-48 overflow-y-auto p-1" role="listbox" aria-label="Materias">
                {matches.map((s) => {
                  const n = classes.filter((c) => c.subjectId === s.id).length
                  return (
                    <li key={s.id}>
                      <button type="button" role="option" aria-selected={s.id === subjectId} onClick={() => choose(s.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-foreground/[0.06]">
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.bg, boxShadow: `0 0 0 1.5px ${s.border}` }} />
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                        <span className="num shrink-0 text-xs text-muted-foreground">{n ? `${n} clase${n === 1 ? "" : "s"}` : ""}</span>
                        {s.id === subjectId && <Check className="size-4 shrink-0 text-emerald-500" />}
                      </button>
                    </li>
                  )
                })}
                {matches.length === 0 && <li className="px-3 py-3 text-center text-sm text-muted-foreground">Ninguna materia coincide con «{query.trim()}».</li>}
              </ul>
              <button type="button" onClick={() => { setNewName(query.trim()); setCreating(true); setPicking(false) }}
                className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
                <Plus className="size-4" />{query.trim() && matches.length === 0 ? <>Crear «{query.trim()}»</> : "Nueva materia"}
              </button>
            </div>
          )}
          {creating && (
            <div className="animate-rise space-y-3 rounded-2xl border bg-muted/30 p-3">
              <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la nueva materia" maxLength={60}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createSubject() } }} />
              <ColorPicker value={newColor} onChange={setNewColor} />
              <div className="flex justify-end gap-2">
                {subjects.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>}
                <Button type="button" size="sm" onClick={createSubject} disabled={!newName.trim()}>Crear materia</Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Días */}
      {section(editing ? "Día" : "Días", null, (
        <div className="flex gap-2">
          {DAYS.map((name, i) => {
            const on = days.includes(i)
            return (
              <button key={name} type="button" onClick={() => toggleDay(i)} aria-pressed={on} aria-label={name} title={name}
                className={cn("grid h-11 flex-1 place-items-center rounded-xl border text-sm font-semibold transition active:scale-95", on ? "border-foreground bg-foreground text-background shadow-sm" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}>
                {DAY_SHORT[i]}
              </button>
            )
          })}
        </div>
      ))}

      {/* Hora y duración */}
      {section("Hora", <Clock className="size-3.5" />, (
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <Input type="time" aria-label="Hora de inicio" value={minutesToTime(start)} className="w-36"
              onChange={(e) => e.target.value && setStart(timeToMinutes(e.target.value))} />
            <span className="text-sm text-muted-foreground">
              {customEnd ? "hasta" : timeOk ? <>termina a las <b className="num text-foreground">{timeLabel(end)}</b></> : "—"}
            </span>
            {customEnd && (
              <Input type="time" aria-label="Hora de fin" value={timeOk || end > 0 ? minutesToTime(Math.max(0, Math.min(end, 24 * 60 - 1))) : ""} className="w-36"
                onChange={(e) => e.target.value && setDur(timeToMinutes(e.target.value) - start)} />
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Duración">
            {DURATIONS.map((m) => {
              const on = !customEnd && dur === m
              return (
                <button key={m} type="button" onClick={() => { setDur(m); setCustomEnd(false) }} aria-pressed={on}
                  className={cn("num rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                  {durLabel(m)}
                </button>
              )
            })}
            <button type="button" onClick={() => setCustomEnd(true)} aria-pressed={customEnd}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95", customEnd ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              Otra
            </button>
          </div>
          {!timeOk && <p className="text-xs text-destructive">La clase debe terminar después de empezar y antes de medianoche.</p>}
          {clashes.length > 0 && (
            <p className="flex animate-rise items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>Se cruza con {clashes.map(({ c, name }) => `${name} (${SHORT[c.day]} ${timeLabel(c.startTime)}–${timeLabel(c.endTime)})`).join(", ")}. Puedes guardarla igual.</span>
            </p>
          )}
        </div>
      ))}

      {/* Profesor */}
      {teachers.length > 0 && section("Profesor", <UserRound className="size-3.5" />, (
        <div className="flex flex-wrap gap-2">
          {[{ id: undefined as string | undefined, name: "Sin asignar", role: undefined as string | undefined }, ...teachers].map((t) => {
            const on = teacherId === t.id
            return (
              <button key={t.id ?? "none"} type="button" onClick={() => setTeacherId(t.id)} aria-pressed={on}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                {t.name || "Profesor"}{t.role ? ` · ${t.role}` : ""}
              </button>
            )
          })}
        </div>
      ))}

      {/* Salón y grupo */}
      {section("Salón y grupo", <Home className="size-3.5" />, (
        <div className="space-y-2.5">
          <div className="grid grid-cols-[1fr_6.5rem] gap-2">
            {perDay && days.length > 1 ? (
              <p className="self-center text-xs text-muted-foreground">Un salón por día, abajo.</p>
            ) : (
              <Input aria-label="Salón" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salón (opcional)" />
            )}
            <Input aria-label="Grupo" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Grupo" />
          </div>
          {days.length > 1 && (
            <button type="button" onClick={() => setPerDay((v) => !v)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {perDay ? "Usar el mismo salón todos los días" : "El salón cambia según el día"}
            </button>
          )}
          {perDay && days.length > 1 && (
            <div className="animate-rise space-y-2">
              {days.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-xs font-medium text-muted-foreground">{SHORT[d]}</span>
                  <Input aria-label={`Salón ${DAYS[d]}`} value={rooms[d] ?? ""} onChange={(e) => setRooms((r) => ({ ...r, [d]: e.target.value }))} placeholder={`Salón del ${DAYS[d].toLowerCase()}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Acciones */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {editing ? (
          confirmDel ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">¿Eliminar?</span>
              <Button type="button" size="sm" variant="destructive" onClick={() => { setClasses((p) => p.filter((c) => c.id !== editing.id)); onClose() }}>Sí</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>No</Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 className="mr-1.5 size-4" />Eliminar
            </Button>
          )
        ) : <span />}
        <Button type="submit" className="rounded-full px-6" disabled={!canSave}>
          {editing ? "Guardar" : days.length > 1 ? `Crear ${days.length} clases` : "Crear clase"}
        </Button>
      </div>
    </form>
  )
}

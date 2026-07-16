"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, CalendarDays, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DAYS,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  getSubject,
  minutesToLabel,
  minutesToTime,
  timeToMinutes,
  type ClassSession,
  type Exam,
  type Grade,
  type Subject,
} from "@/lib/horario-data"
import { MateriasDialog } from "./materias-dialog"

// Píxeles por hora en el grid
const PX_PER_HOUR = 64

type Props = {
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
  setGrades: React.Dispatch<React.SetStateAction<Record<string, Grade[]>>>
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
}

type SessionDraft = {
  id: string
  subjectId: string
  day: number
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
  group: string
  rooms: Record<number, string> // day -> room
  days: number[]    // para creación multi-día
}

function timeLabel(minutes: number) {
  return minutesToLabel(minutes)
}

export function HorarioTab({ subjects, setSubjects, classes, setClasses, setGrades, setExams }: Props) {
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [selectedMobileDay, setSelectedMobileDay] = useState(0)

  // Calcular rango horario dinámico
  const { gridStartMin, gridEndMin, hours } = useMemo(() => {
    const startH = DEFAULT_START_HOUR
    let endH = DEFAULT_END_HOUR

    if (classes.length > 0) {
      const maxEnd = Math.max(...classes.map((c) => c.endTime))
      const maxEndHour = Math.ceil(maxEnd / 60)
      if (maxEndHour > endH) endH = maxEndHour
    }

    const startMin = startH * 60
    const endMin = endH * 60
    const hrs: number[] = []
    for (let h = startH; h <= endH; h++) hrs.push(h)

    return { gridStartMin: startMin, gridEndMin: endMin, hours: hrs }
  }, [classes])

  const totalMinutes = gridEndMin - gridStartMin
  const gridHeight = (totalMinutes / 60) * PX_PER_HOUR

  function minutesToPx(minutes: number) {
    return ((minutes - gridStartMin) / 60) * PX_PER_HOUR
  }

  function durationPx(startTime: number, endTime: number) {
    return ((endTime - startTime) / 60) * PX_PER_HOUR
  }

  function openNew() {
    const firstSubjectId = subjects[0]?.id ?? ""
    setDraft({
      id: crypto.randomUUID(),
      subjectId: firstSubjectId,
      day: selectedMobileDay,
      startTime: "06:00",
      endTime: "08:00",
      group: "",
      rooms: {},
      days: [selectedMobileDay],
    })
    setIsNew(true)
    setOpen(true)
  }

  function openEdit(c: ClassSession) {
    setDraft({
      id: c.id,
      subjectId: c.subjectId,
      day: c.day,
      startTime: minutesToTime(c.startTime),
      endTime: minutesToTime(c.endTime),
      group: c.group,
      rooms: { [c.day]: c.room },
      days: [c.day],
    })
    setIsNew(false)
    setOpen(true)
  }

  function toggleDraftDay(day: number) {
    if (!draft) return
    const exists = draft.days.includes(day)
    const nextDays = exists
      ? draft.days.filter((d) => d !== day)
      : [...draft.days, day]
    const nextRooms = { ...draft.rooms }
    if (!exists) nextRooms[day] = nextRooms[day] ?? ""
    else delete nextRooms[day]
    setDraft({ ...draft, days: nextDays, rooms: nextRooms })
  }

  function save() {
    if (!draft) return
    const startMin = timeToMinutes(draft.startTime)
    const endMin = timeToMinutes(draft.endTime)
    if (endMin <= startMin) return

    if (!isNew) {
      // Editar clase existente (solo 1 día)
      setClasses((prev) =>
        prev.map((c) =>
          c.id === draft.id
            ? { ...c, subjectId: draft.subjectId, startTime: startMin, endTime: endMin, group: draft.group, room: draft.rooms[c.day] ?? c.room }
            : c
        )
      )
    } else {
      // Crear en múltiples días
      const newClasses: ClassSession[] = draft.days.map((day) => ({
        id: crypto.randomUUID(),
        subjectId: draft.subjectId,
        day,
        startTime: startMin,
        endTime: endMin,
        group: draft.group,
        room: draft.rooms[day] ?? "",
      }))
      setClasses((prev) => [...prev, ...newClasses])
    }
    setOpen(false)
  }

  function remove(id: string) {
    setClasses((prev) => prev.filter((c) => c.id !== id))
    setOpen(false)
  }

  function classesForDay(day: number) {
    return classes.filter((c) => c.day === day).sort((a, b) => a.startTime - b.startTime)
  }

  const DAY_SHORT = ["L", "M", "Mi", "J", "V"]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mi horario</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">Toca una clase para editarla.</p>
          <p className="text-sm text-muted-foreground sm:hidden">Toca una clase para editarla.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setManageOpen(true)} variant="outline" size="sm" className="rounded-full shadow-sm">
            <Settings2 className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">Materias</span>
          </Button>
          <Button onClick={openNew} size="sm" className="rounded-full shadow-sm hover:shadow" disabled={subjects.length === 0}>
            <Plus className="size-4 mr-1" /> Clase
          </Button>
        </div>
      </div>

      {classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-card animate-scale-in">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <CalendarDays className="size-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Tu horario está vacío</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
            {subjects.length === 0
              ? "Primero crea algunas materias para poder agregarlas al horario."
              : "Agrega tu primera clase para empezar a organizar tu semestre."}
          </p>
          {subjects.length === 0 ? (
            <Button onClick={() => setManageOpen(true)} variant="secondary">Crear primera materia</Button>
          ) : (
            <Button onClick={openNew} variant="secondary">Agregar primera clase</Button>
          )}
        </div>
      )}

      {classes.length > 0 && (
        <>
          {/* Vista móvil */}
          <div className="sm:hidden space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedMobileDay(i)}
                  aria-label={d}
                  className={`snap-center shrink-0 grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition-all ${
                    selectedMobileDay === i
                      ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {DAY_SHORT[i]}
                </button>
              ))}
            </div>

            {/* Grid móvil: columna de horas + columna de eventos */}
            <div className="rounded-xl border bg-card overflow-hidden" key={selectedMobileDay}>
              <div className="flex">
                {/* Columna de horas */}
                <div className="w-14 shrink-0 relative border-r" style={{ height: gridHeight }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute right-0 flex items-center justify-end pr-2 text-[10px] text-muted-foreground"
                      style={{ top: minutesToPx(h * 60) - 8, height: 16 }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Columna de eventos */}
                <div className="flex-1 relative" style={{ height: gridHeight }}>
                  {/* Líneas de hora */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: minutesToPx(h * 60) }}
                    />
                  ))}

                  {classesForDay(selectedMobileDay).map((c) => {
                    const subject = getSubject(subjects, c.subjectId)
                    if (!subject) return null
                    return (
                      <button
                        key={c.id}
                        onClick={() => openEdit(c)}
                        className="absolute left-1 right-1 rounded-lg p-1.5 text-left text-neutral-900 text-xs shadow-sm hover:brightness-95 transition-all overflow-hidden"
                        style={{
                          top: minutesToPx(c.startTime) + 1,
                          height: Math.max(durationPx(c.startTime, c.endTime) - 2, 24),
                          backgroundColor: subject.bg,
                          border: `1px solid ${subject.border}`,
                        }}
                      >
                        <p className="font-semibold leading-tight truncate">{subject.name}</p>
                        <p className="opacity-70 text-[10px]">{timeLabel(c.startTime)}–{timeLabel(c.endTime)}</p>
                        {c.room && <p className="opacity-70 text-[10px] truncate">{c.room}</p>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Vista escritorio */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border bg-card shadow-sm animate-slide-up">
            <div className="min-w-[700px]">
              {/* Cabecera de días */}
              <div className="flex border-b bg-muted/30">
                <div className="w-16 shrink-0 border-r p-3 text-xs font-semibold text-muted-foreground">Hora</div>
                {DAYS.map((d) => (
                  <div key={d} className="flex-1 p-3 text-center text-sm font-semibold border-r last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>

              {/* Cuerpo del grid */}
              <div className="flex" style={{ height: gridHeight }}>
                {/* Columna de horas */}
                <div className="w-16 shrink-0 border-r relative">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute right-0 flex items-center justify-end pr-2 text-[11px] text-muted-foreground"
                      style={{ top: minutesToPx(h * 60) - 9, height: 18 }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Columnas de días */}
                {DAYS.map((d, dayIndex) => (
                  <div key={d} className="flex-1 border-r last:border-r-0 relative">
                    {/* Líneas de hora */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-border/30"
                        style={{ top: minutesToPx(h * 60) }}
                      />
                    ))}

                    {classesForDay(dayIndex).map((c) => {
                      const subject = getSubject(subjects, c.subjectId)
                      if (!subject) return null
                      return (
                        <button
                          key={c.id}
                          onClick={() => openEdit(c)}
                          className="absolute left-1 right-1 rounded-lg p-1.5 text-left text-neutral-900 text-xs shadow-sm hover:brightness-95 transition-all overflow-hidden animate-pop"
                          style={{
                            top: minutesToPx(c.startTime) + 1,
                            height: Math.max(durationPx(c.startTime, c.endTime) - 2, 24),
                            backgroundColor: subject.bg,
                            border: `1px solid ${subject.border}`,
                          }}
                        >
                          <p className="font-semibold leading-tight truncate">{subject.name}</p>
                          <p className="opacity-70 text-[10px]">{timeLabel(c.startTime)}–{timeLabel(c.endTime)}</p>
                          {c.group && <p className="opacity-70 text-[10px]">Gr: {c.group}</p>}
                          {c.room && <p className="opacity-70 text-[10px] truncate">{c.room}</p>}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Leyenda */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {subjects.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-neutral-900 shadow-sm hover:scale-105 transition-transform"
              style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
            >
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Dialog agregar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px] animate-scale-in max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Agregar clase" : "Editar clase"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4 py-2">
              {/* Materia */}
              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={draft.subjectId}
                  onValueChange={(v) => v && setDraft({ ...draft, subjectId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {draft.subjectId && (() => {
                        const s = subjects.find((s) => s.id === draft.subjectId)
                        return s ? (
                          <div className="flex items-center gap-2">
                            <div className="size-3 rounded-full" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }} />
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
                          <div className="size-3 rounded-full" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Días (solo en creación) */}
              {isNew && (
                <div className="space-y-2">
                  <Label>Días</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((dayName, dayIndex) => {
                      const active = draft.days.includes(dayIndex)
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleDraftDay(dayIndex)}
                          className={`grid h-10 min-w-10 place-items-center rounded-full border px-3 text-sm font-semibold transition-all ${
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {DAY_SHORT[dayIndex]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Día (solo en edición) */}
              {!isNew && (
                <div className="space-y-2">
                  <Label>Día</Label>
                  <Select
                    value={String(draft.day)}
                    onValueChange={(v) => v && setDraft({ ...draft, day: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue>{DAYS[draft.day]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d, i) => (
                        <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Hora inicio y fin */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Hora inicio</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={draft.startTime}
                    onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">Hora fin</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={draft.endTime}
                    onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Duración calculada */}
              {draft.startTime && draft.endTime && (() => {
                const start = timeToMinutes(draft.startTime)
                const end = timeToMinutes(draft.endTime)
                const diff = end - start
                if (diff <= 0) return (
                  <p className="text-xs text-destructive">La hora de fin debe ser mayor que la de inicio.</p>
                )
                const h = Math.floor(diff / 60)
                const m = diff % 60
                return (
                  <p className="text-xs text-muted-foreground">
                    Duración: {h > 0 ? `${h}h ` : ""}{m > 0 ? `${m}min` : ""}
                  </p>
                )
              })()}

              {/* Grupo */}
              <div className="space-y-2">
                <Label htmlFor="group">Grupo</Label>
                <Input
                  id="group"
                  value={draft.group}
                  placeholder="Ej: 402"
                  onChange={(e) => setDraft({ ...draft, group: e.target.value })}
                />
              </div>

              {/* Salón(es) */}
              {isNew ? (
                <div className="space-y-2">
                  <Label>Salón por día</Label>
                  {draft.days.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Selecciona al menos un día.</p>
                  ) : (
                    <div className="space-y-2">
                      {draft.days.slice().sort((a, b) => a - b).map((day) => (
                        <div key={day} className="flex items-center gap-2">
                          <span className="text-xs font-medium w-8 shrink-0 text-muted-foreground">{DAY_SHORT[day]}</span>
                          <Input
                            value={draft.rooms[day] ?? ""}
                            placeholder={`Salón ${DAYS[day]}`}
                            onChange={(e) => setDraft({ ...draft, rooms: { ...draft.rooms, [day]: e.target.value } })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="room">Salón</Label>
                  <Input
                    id="room"
                    value={draft.rooms[draft.day] ?? ""}
                    placeholder="Sin asignar"
                    onChange={(e) => setDraft({ ...draft, rooms: { ...draft.rooms, [draft.day]: e.target.value } })}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-row justify-between gap-2 pt-2">
            {!isNew && draft ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => remove(draft.id)}
              >
                <Trash2 className="size-4 mr-1.5" /> Eliminar
              </Button>
            ) : <div />}
            <Button
              onClick={save}
              className="px-6 rounded-full"
              disabled={!draft || !draft.subjectId || (isNew && draft.days.length === 0) || timeToMinutes(draft?.endTime ?? "00:00") <= timeToMinutes(draft?.startTime ?? "00:00")}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MateriasDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        subjects={subjects}
        setSubjects={setSubjects}
        setClasses={setClasses}
        setGrades={setGrades}
        setExams={setExams}
      />
    </div>
  )
}
"use client"

import { useState } from "react"
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
import { BLOCKS, DAYS, getSubject, type Subject, type ClassSession, type Grade, type Exam } from "@/lib/horario-data"
import { MateriasDialog } from "./materias-dialog"
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

type Props = {
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
  setGrades: React.Dispatch<React.SetStateAction<Record<string, Grade[]>>>
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
}

type Draft = {
  id: string
  subjectId: string
  day: number
  block: number
  group: string
  room: string
}

type MultiDraft = {
  subjectId: string
  days: number[]
  block: number
  group: string
  rooms: Record<number, string>
}

function DroppableSlot({ id, children, className = "" }: { id: string; children?: React.ReactNode; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`transition-colors min-h-[60px] h-full ${className} ${
        isOver ? "bg-primary/5 rounded-lg ring-2 ring-primary/20 ring-inset" : ""
      }`}
    >
      {children}
    </div>
  )
}

function DraggableClass({
  c,
  subject,
  onClick,
}: {
  c: ClassSession
  subject: ReturnType<typeof getSubject>
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: c.id,
    data: c,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  }

  if (!subject) return null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group relative flex w-full flex-col gap-0.5 rounded-lg p-2 text-left text-neutral-900 transition touch-none cursor-grab active:cursor-grabbing animate-pop"
      style={{
        ...style,
        backgroundColor: subject.bg,
        border: `1px solid ${subject.border}`,
      }}
      onClick={(e) => {
        // Only trigger edit if we didn't drag
        if (!isDragging) {
          onClick()
        }
      }}
    >
      <span className="text-xs font-semibold leading-tight">{subject.name}</span>
      <span className="text-[11px] opacity-80">Grupo: {c.group || "—"}</span>
      <span className="text-[11px] opacity-80">Salón: {c.room || "—"}</span>
      <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-60 text-neutral-900/50 sm:hidden group-hover:sm:block">
        <Pencil className="size-3" />
      </div>
    </div>
  )
}

function ClassCardOverlay({ c, subjects }: { c: ClassSession, subjects: Subject[] }) {
  const subject = getSubject(subjects, c.subjectId)
  if (!subject) return null
  return (
    <div
      className="flex w-full flex-col gap-0.5 rounded-lg p-2 text-left text-neutral-900 shadow-xl scale-105 cursor-grabbing"
      style={{ backgroundColor: subject.bg, border: `1px solid ${subject.border}` }}
    >
      <span className="text-xs font-semibold leading-tight">{subject.name}</span>
      <span className="text-[11px] opacity-80">Grupo: {c.group || "—"}</span>
      <span className="text-[11px] opacity-80">Salón: {c.room || "—"}</span>
    </div>
  )
}

export function HorarioTab({ subjects, setSubjects, classes, setClasses, setGrades, setExams }: Props) {
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [multiDraft, setMultiDraft] = useState<MultiDraft | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedMobileDay, setSelectedMobileDay] = useState(0)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function openEdit(c: ClassSession) {
    setDraft({ ...c })
    setMultiDraft(null)
    setIsNew(false)
    setOpen(true)
  }

  function openNew() {
    const firstSubjectId = subjects.length > 0 ? subjects[0].id : ""
    setDraft(null)
    setMultiDraft({
      subjectId: firstSubjectId,
      days: [selectedMobileDay],
      block: 0,
      group: "",
      rooms: { [selectedMobileDay]: "" },
    })
    setIsNew(true)
    setOpen(true)
  }

  function save() {
    if (draft) {
      setClasses((prev) =>
        isNew ? [...prev, draft] : prev.map((c) => (c.id === draft.id ? draft : c)),
      )
      setOpen(false)
      return
    }

    if (!multiDraft || multiDraft.days.length === 0) return

    const occupiedDays = multiDraft.days.filter((day) =>
      classes.some((c) => c.day === day && c.block === multiDraft.block),
    )

    const freeDays = multiDraft.days.filter((day) => !occupiedDays.includes(day))
    if (freeDays.length === 0) return

    const newClasses: ClassSession[] = freeDays.map((day) => ({
      id: crypto.randomUUID(),
      subjectId: multiDraft.subjectId,
      day,
      block: multiDraft.block,
      group: multiDraft.group,
      room: multiDraft.rooms[day] ?? "",
    }))

    setClasses((prev) => [...prev, ...newClasses])
    setOpen(false)
  }

  function remove(id: string) {
    setClasses((prev) => prev.filter((c) => c.id !== id))
    setOpen(false)
  }

  function toggleDraftDay(day: number) {
    setMultiDraft((current) => {
      if (!current) return current

      const exists = current.days.includes(day)
      const nextDays = exists ? current.days.filter((selectedDay) => selectedDay !== day) : [...current.days, day]
      const nextRooms = { ...current.rooms }

      if (!exists && nextRooms[day] === undefined) {
        nextRooms[day] = ""
      }

      if (exists) {

  function availableSlotLabel(day: number) {
    const occupied = classes.find((c) => c.day === day && c.block === multiDraft?.block)
    return occupied ? `Ocupado por ${getSubject(subjects, occupied.subjectId)?.name ?? "otra materia"}` : "Disponible"
  }
        delete nextRooms[day]
      }

      return {
        ...current,
        days: nextDays,
        rooms: nextRooms,
      }
    })
  }

  function classAt(day: number, block: number) {
    return classes.find((c) => c.day === day && c.block === block)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const overId = String(over.id)
    if (overId.startsWith("slot-")) {
      const parts = overId.split("-")
      const day = parseInt(parts[1], 10)
      const block = parseInt(parts[2], 10)

      setClasses((prev) =>
        prev.map((c) => {
          if (c.id === active.id) {
            // Check if slot is already occupied
            const occupied = classAt(day, block)
            if (occupied && occupied.id !== c.id) {
              return c // don't move if occupied
            }
            return { ...c, day, block }
          }
          return c
        })
      )
    }
  }

  const activeClass = activeId ? classes.find((c) => c.id === activeId) : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mi horario</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Arrastra las clases para reordenarlas. Toca para editar.
          </p>
          <p className="text-sm text-muted-foreground sm:hidden">
            Toca una clase para editarla o moverla.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setManageOpen(true)} variant="outline" size="sm" className="rounded-full shadow-sm">
            <Settings2 className="size-4 sm:mr-1" /> <span className="hidden sm:inline">Materias</span>
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
              ? "Primero necesitas crear algunas materias para poder agregarlas a tu horario."
              : "Agrega tu primera clase para empezar a organizar tu semestre."}
          </p>
          {subjects.length === 0 ? (
            <Button onClick={() => setManageOpen(true)} variant="secondary">
              Crear primera materia
            </Button>
          ) : (
            <Button onClick={openNew} variant="secondary">
              Agregar primera clase
            </Button>
          )}
        </div>
      )}

      {classes.length > 0 && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Mobile View: Selectable Day Tabs */}
          <div className="sm:hidden space-y-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {DAYS.map((d, i) => {
                const shortLabel = i === 0 ? "L" : i === 1 ? "M" : i === 2 ? "Mi" : i === 3 ? "J" : "V"

                return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedMobileDay(i)}
                  aria-label={d}
                  title={d}
                  className={`snap-center shrink-0 grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition-all ${
                    selectedMobileDay === i
                      ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="leading-none">{shortLabel}</span>
                </button>
                )
              })}
            </div>

            <div className="grid gap-3 animate-slide-up" key={selectedMobileDay}>
              {BLOCKS.map((blockLabel, block) => {
                const c = classAt(selectedMobileDay, block)
                const subject = c ? getSubject(subjects, c.subjectId) : undefined
                const slotId = `slot-${selectedMobileDay}-${block}`
                return (
                  <div key={blockLabel} className="flex gap-3 items-stretch bg-card p-2 rounded-xl border">
                    <div className="w-16 shrink-0 flex items-center justify-center border-r pr-2 py-2 text-xs font-medium text-muted-foreground">
                      {blockLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DroppableSlot id={slotId}>
                        {c && subject ? (
                          <DraggableClass c={c} subject={subject} onClick={() => openEdit(c)} />
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[60px] text-xs text-muted-foreground/50 italic" onClick={() => {
                            setDraft({
                              id: crypto.randomUUID(),
                              subjectId: subjects.length > 0 ? subjects[0].id : "",
                              day: selectedMobileDay,
                              block,
                              group: "",
                              room: "",
                            })
                            setIsNew(true)
                            setOpen(true)
                          }}>
                            Toque para agregar
                          </div>
                        )}
                      </DroppableSlot>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Desktop View: Grid */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border bg-card shadow-sm animate-slide-up">
            <table className="w-full border-collapse text-sm table-fixed min-w-[800px]">
              <thead>
                <tr>
                  <th className="border-b border-r p-3 w-24 text-left font-semibold text-muted-foreground bg-muted/30">
                    Horario
                  </th>
                  {DAYS.map((d) => (
                    <th key={d} className="border-b p-3 text-center font-semibold bg-muted/30 w-[calc((100%-6rem)/5)]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BLOCKS.map((blockLabel, block) => (
                  <tr key={blockLabel} className="group/row">
                    <td className="border-r border-b p-3 text-center font-medium whitespace-nowrap text-muted-foreground bg-muted/10 group-hover/row:bg-muted/20 transition-colors">
                      {blockLabel}
                    </td>
                    {DAYS.map((d, day) => {
                      const c = classAt(day, block)
                      const subject = c ? getSubject(subjects, c.subjectId) : undefined
                      const slotId = `slot-${day}-${block}`
                      return (
                        <td key={d} className="border-b border-r last:border-r-0 p-1.5 align-top h-20">
                          <DroppableSlot id={slotId} className="w-full h-full p-0.5">
                            {c && subject ? (
                              <DraggableClass c={c} subject={subject} onClick={() => openEdit(c)} />
                            ) : null}
                          </DroppableSlot>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ duration: 250 })}>
            {activeClass ? <ClassCardOverlay c={activeClass} subjects={subjects} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Leyenda de materias */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] animate-scale-in">
          <DialogHeader>
            <DialogTitle>{isNew ? "Agregar clase" : "Editar clase"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={draft.subjectId}
                  onValueChange={(v) => v && setDraft({ ...draft, subjectId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{() => getSubject(subjects, draft.subjectId)?.name}</SelectValue>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Día</Label>
                  <Select
                    value={String(draft.day)}
                    onValueChange={(v) => v && setDraft({ ...draft, day: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue>{() => DAYS[draft.day]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d, i) => (
                        <SelectItem key={d} value={String(i)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horario</Label>
                  <Select
                    value={String(draft.block)}
                    onValueChange={(v) => v && setDraft({ ...draft, block: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue>{() => BLOCKS[draft.block]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCKS.map((b, i) => (
                        <SelectItem key={b} value={String(i)}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Grupo</Label>
                <Input
                  id="group"
                  value={draft.group}
                  placeholder="Ej: 402"
                  onChange={(e) => setDraft({ ...draft, group: e.target.value })}
                  className="transition-all focus:scale-[1.01]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">Salón</Label>
                <Input
                  id="room"
                  value={draft.room}
                  placeholder="Sin asignar"
                  onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                  className="transition-all focus:scale-[1.01]"
                />
              </div>
            </div>
          )}
          {multiDraft && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={multiDraft.subjectId}
                  onValueChange={(v) => v && setMultiDraft({ ...multiDraft, subjectId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{() => getSubject(subjects, multiDraft.subjectId)?.name}</SelectValue>
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

              <div className="space-y-2">
                <Label>Días</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((dayName, dayIndex) => {
                    const active = multiDraft.days.includes(dayIndex)
                    const shortLabel = dayIndex === 0 ? "L" : dayIndex === 1 ? "M" : dayIndex === 2 ? "Mi" : dayIndex === 3 ? "J" : "V"
                    const occupied = classes.some((c) => c.day === dayIndex && c.block === multiDraft.block)

                    return (
                      <button
                        key={dayName}
                        type="button"
                        onClick={() => toggleDraftDay(dayIndex)}
                        aria-label={dayName}
                        title={dayName}
                        className={`grid h-11 min-w-11 place-items-center rounded-full border px-3 text-sm font-semibold transition-all ${
                          active
                            ? occupied
                              ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
                              : "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                            : occupied
                              ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="leading-none">{shortLabel}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                  {multiDraft.days.length > 0 ? (
                    multiDraft.days
                      .slice()
                      .sort((a, b) => a - b)
                      .map((day) => (
                        <span key={day} className="rounded-full border bg-muted/40 px-2.5 py-1">
                          {DAYS[day]}: {availableSlotLabel(day)}
                        </span>
                      ))
                  ) : (
                    <span className="rounded-full border bg-muted/40 px-2.5 py-1">Selecciona al menos un día</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Horario</Label>
                <Select
                  value={String(multiDraft.block)}
                  onValueChange={(v) => v && setMultiDraft({ ...multiDraft, block: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue>{() => BLOCKS[multiDraft.block]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCKS.map((b, i) => (
                      <SelectItem key={b} value={String(i)}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-multi">Grupo</Label>
                <Input
                  id="group-multi"
                  value={multiDraft.group}
                  placeholder="Ej: 402"
                  onChange={(e) => setMultiDraft({ ...multiDraft, group: e.target.value })}
                  className="transition-all focus:scale-[1.01]"
                />
              </div>

              <div className="space-y-3">
                <Label>Salón por día</Label>
                <div className="space-y-3 rounded-2xl border bg-muted/20 p-3 shadow-sm">
                  {multiDraft.days.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Selecciona al menos un día para asignar su salón.</p>
                  ) : (
                    multiDraft.days
                      .slice()
                      .sort((a, b) => a - b)
                      .map((day) => (
                        <div key={day} className="space-y-1.5 rounded-xl border bg-background p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs font-semibold text-foreground">{DAYS[day]}</Label>
                            <span className="text-[11px] text-muted-foreground">
                              {classes.some((c) => c.day === day && c.block === multiDraft.block) ? "Ya existe un bloque en ese horario" : "Nuevo bloque"}
                            </span>
                          </div>
                          <Input
                            value={multiDraft.rooms[day] ?? ""}
                            placeholder={`Salón para ${DAYS[day]}`}
                            onChange={(e) =>
                              setMultiDraft({
                                ...multiDraft,
                                rooms: { ...multiDraft.rooms, [day]: e.target.value },
                              })
                            }
                            className="transition-all focus:scale-[1.01]"
                          />
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2 pt-2">
            {!isNew && draft ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => remove(draft.id)}
              >
                <Trash2 className="size-4 mr-1.5" /> Eliminar
              </Button>
            ) : (
              <div />
            )}
            <Button onClick={save} className="px-6 rounded-full">Guardar</Button>
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

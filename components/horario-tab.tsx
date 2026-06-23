"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react"
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
import { BLOCKS, DAYS, SUBJECTS, getSubject, type ClassSession } from "@/lib/horario-data"
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

type Props = {
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
}

type Draft = {
  id: string
  subjectId: string
  day: number
  block: number
  group: string
  room: string
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
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-60 p-1 hover:bg-black/10 rounded"
      >
        <Pencil className="size-3" />
      </button>
    </div>
  )
}

function ClassCardOverlay({ c }: { c: ClassSession }) {
  const subject = getSubject(c.subjectId)
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

export function HorarioTab({ classes, setClasses }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedMobileDay, setSelectedMobileDay] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  function openEdit(c: ClassSession) {
    setDraft({ ...c })
    setIsNew(false)
    setOpen(true)
  }

  function openNew() {
    setDraft({
      id: crypto.randomUUID(),
      subjectId: SUBJECTS[0].id,
      day: selectedMobileDay,
      block: 0,
      group: "",
      room: "",
    })
    setIsNew(true)
    setOpen(true)
  }

  function save() {
    if (!draft) return
    setClasses((prev) =>
      isNew ? [...prev, draft] : prev.map((c) => (c.id === draft.id ? draft : c)),
    )
    setOpen(false)
  }

  function remove(id: string) {
    setClasses((prev) => prev.filter((c) => c.id !== id))
    setOpen(false)
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
            Arrastra las clases para reordenarlas. Toca el ícono de lápiz para editar.
          </p>
          <p className="text-sm text-muted-foreground sm:hidden">
            Mantén presionado para reordenar.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="rounded-full shadow-sm hover:shadow">
          <Plus className="size-4 mr-1" /> Clase
        </Button>
      </div>

      {classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-card animate-scale-in">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <CalendarDays className="size-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Tu horario está vacío</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
            Agrega tu primera clase para empezar a organizar tu semestre.
          </p>
          <Button onClick={openNew} variant="secondary">
            Agregar primera clase
          </Button>
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
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setSelectedMobileDay(i)}
                  className={`snap-center shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedMobileDay === i
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="grid gap-3 animate-slide-up" key={selectedMobileDay}>
              {BLOCKS.map((blockLabel, block) => {
                const c = classAt(selectedMobileDay, block)
                const subject = c ? getSubject(c.subjectId) : undefined
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
                              subjectId: SUBJECTS[0].id,
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
                      const subject = c ? getSubject(c.subjectId) : undefined
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
            {activeClass ? <ClassCardOverlay c={activeClass} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Leyenda de materias */}
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4">
          {SUBJECTS.map((s) => (
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
                    <SelectValue>{() => getSubject(draft.subjectId)?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
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
    </div>
  )
}

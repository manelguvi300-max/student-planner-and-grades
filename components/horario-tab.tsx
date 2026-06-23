"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
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

type Props = {
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
}

type Draft = {
  id: string
  subjectId: string
  day: number
  block: number
  room: string
}

export function HorarioTab({ classes, setClasses }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isNew, setIsNew] = useState(false)

  function openEdit(c: ClassSession) {
    setDraft({ ...c })
    setIsNew(false)
    setOpen(true)
  }

  function openNew() {
    setDraft({
      id: crypto.randomUUID(),
      subjectId: SUBJECTS[0].id,
      day: 0,
      block: 0,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mi horario</h2>
          <p className="text-sm text-muted-foreground">
            Toca una clase para editar el salón y el bloque.
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="size-4" /> Agregar clase
        </Button>
      </div>

      {/* Leyenda de materias */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-neutral-900"
            style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
          >
            {s.name}
          </span>
        ))}
      </div>

      {/* Grilla */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-r p-3 text-left font-semibold text-muted-foreground">
                Bloque
              </th>
              {DAYS.map((d) => (
                <th key={d} className="border-b p-3 text-center font-semibold">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BLOCKS.map((blockLabel, block) => (
              <tr key={blockLabel}>
                <td className="border-r p-3 text-center font-semibold whitespace-nowrap text-muted-foreground">
                  {blockLabel}
                </td>
                {DAYS.map((d, day) => {
                  const c = classAt(day, block)
                  const subject = c ? getSubject(c.subjectId) : undefined
                  return (
                    <td key={d} className="p-1.5 align-top">
                      {c && subject ? (
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="group flex w-full flex-col gap-0.5 rounded-lg p-2 text-left text-neutral-900 transition hover:brightness-95"
                          style={{
                            backgroundColor: subject.bg,
                            border: `1px solid ${subject.border}`,
                          }}
                        >
                          <span className="text-xs font-semibold leading-tight">
                            {subject.name}
                          </span>
                          <span className="text-[11px] opacity-80">
                            Salón: {c.room || "—"}
                          </span>
                          <Pencil className="size-3 opacity-0 transition group-hover:opacity-60" />
                        </button>
                      ) : (
                        <div className="min-h-[44px]" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Agregar clase" : "Editar clase"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={draft.subjectId}
                  onValueChange={(v) => v && setDraft({ ...draft, subjectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue>{() => getSubject(draft.subjectId)?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
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
                  <Label>Bloque</Label>
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
                <Label htmlFor="room">Salón</Label>
                <Input
                  id="room"
                  value={draft.room}
                  placeholder="Ej: 402"
                  onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {!isNew && draft ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(draft.id)}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

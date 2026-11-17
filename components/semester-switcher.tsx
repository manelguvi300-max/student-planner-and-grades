"use client"

import { useState } from "react"
import { Check, ChevronDown, CalendarRange, Pencil, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { nextSemesterName, type SemestersMeta } from "@/lib/horario-data"
import { useSheetBack } from "@/lib/use-sheet-back"
import { cn } from "@/lib/utils"

type Props = {
  semesters: SemestersMeta
  /** Materias del semestre activo (el resto se cuentan desde el archivo) */
  activeSubjectCount: number
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  className?: string
}

/** Píldora con el semestre activo; al tocarla abre la hoja para cambiar, crear (desde cero), renombrar o borrar semestres. */
export function SemesterSwitcher({ semesters, activeSubjectCount, onSwitch, onCreate, onRename, onDelete, className }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const close = () => setOpen(false)
  useSheetBack(open, close)

  const active = semesters.list.find((s) => s.id === semesters.activeId) ?? semesters.list[0]
  const count = (id: string) => (id === semesters.activeId ? activeSubjectCount : semesters.archive[id]?.subjects.length ?? 0)

  function show() {
    setCreating(false); setEditing(null); setConfirmDel(null)
    setNewName(nextSemesterName(semesters.list[semesters.list.length - 1]?.name ?? ""))
    setOpen(true)
  }
  function pick(id: string) { onSwitch(id); close() }
  function create() {
    if (!newName.trim()) return
    onCreate(newName); close()
  }
  function saveRename() {
    if (editing && draft.trim()) onRename(editing, draft)
    setEditing(null)
  }

  return (
    <>
      <button type="button" onClick={show} aria-label={`Semestre ${active.name}. Cambiar de semestre`}
        className={cn("tap group/sem inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground active:scale-95", className)}>
        <CalendarRange className="size-3.5 shrink-0" />
        <span className="num truncate"><span className="max-[420px]:hidden">Semestre </span>{active.name}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60 transition-transform group-hover/sem:translate-y-px" />
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto sm:max-w-[420px]">
          <DialogHeader className="space-y-1">
            <DialogTitle>Semestres</DialogTitle>
            <DialogDescription>Notas, materias, horarios, exámenes y faltas se guardan por semestre.</DialogDescription>
          </DialogHeader>

          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {semesters.list.map((s) => {
              const isActive = s.id === semesters.activeId
              const n = count(s.id)
              return (
                <li key={s.id} className="animate-scale-in">
                  {editing === s.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); saveRename() }} className="flex items-center gap-2 p-2">
                      <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} aria-label="Nombre del semestre" />
                      <Button type="submit" size="sm" disabled={!draft.trim()}>Guardar</Button>
                    </form>
                  ) : confirmDel === s.id ? (
                    <div className="space-y-2.5 p-3">
                      <p className="text-sm">¿Borrar <b>{s.name}</b> con sus {n} materia{n === 1 ? "" : "s"}, notas, horarios y faltas? No se puede deshacer.</p>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>Cancelar</Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => { onDelete(s.id); setConfirmDel(null) }}>Borrar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center pr-1">
                      <button type="button" onClick={() => pick(s.id)} aria-current={isActive ? "true" : undefined}
                        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left transition hover:bg-foreground/[0.05] active:scale-[0.99]">
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", isActive ? "bg-emerald-500 text-white" : "border text-transparent")}>
                          <Check className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="num block truncate text-sm font-medium">{s.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{isActive ? "Activo · " : ""}{n ? `${n} materia${n === 1 ? "" : "s"}` : "Vacío"}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => { setEditing(s.id); setDraft(s.name) }} aria-label={`Renombrar ${s.name}`} title="Renombrar"
                        className="tap grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
                        <Pencil className="size-4" />
                      </button>
                      {!isActive && (
                        <button type="button" onClick={() => setConfirmDel(s.id)} aria-label={`Borrar ${s.name}`} title="Borrar"
                          className="tap grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {creating ? (
            <form onSubmit={(e) => { e.preventDefault(); create() }} className="animate-rise space-y-3 rounded-2xl border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <label htmlFor="new-semester" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre del nuevo semestre</label>
                <Input id="new-semester" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. 2027-1" maxLength={24} />
              </div>
              <p className="text-xs text-muted-foreground">Empieza desde cero. Tus profesores y la regla de faltas se mantienen; lo de {active.name} queda guardado y puedes volver a verlo cuando quieras.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={!newName.trim()}>Crear y empezar</Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="outline" onClick={() => setCreating(true)} className="h-11 w-full gap-2 pointer-coarse:h-12">
              <Plus className="size-4" />Nuevo semestre
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

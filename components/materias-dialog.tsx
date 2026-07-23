"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  COLORS_PALETTE,
  borderFromBg,
  loadCustomColors,
  saveCustomColor,
  removeCustomColor,
  type ColorSwatch,
  type Subject,
  type ClassSession,
  type Grade,
  type Exam,
} from "@/lib/horario-data"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
  setGrades: React.Dispatch<React.SetStateAction<Record<string, Grade[]>>>
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
}

export function MateriasDialog({
  open,
  onOpenChange,
  subjects,
  setSubjects,
  setClasses,
  setGrades,
  setExams,
}: Props) {
  const [draftName, setDraftName] = useState("")
  const [draftColor, setDraftColor] = useState<ColorSwatch>(COLORS_PALETTE[0])
  const [customColors, setCustomColors] = useState<ColorSwatch[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerHex, setPickerHex] = useState("#c9b8f0")
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCustomColors(loadCustomColors())
  }, [])

  function confirmCustomColor() {
    const swatch: ColorSwatch = { bg: pickerHex, border: borderFromBg(pickerHex) }
    const updated = saveCustomColor(swatch)
    setCustomColors(updated)
    setDraftColor(swatch)
    setPickerOpen(false)
  }

  function handleRemoveCustomColor(e: React.MouseEvent, bg: string) {
    e.stopPropagation()
    const updated = removeCustomColor(bg)
    setCustomColors(updated)
    if (draftColor.bg === bg) setDraftColor(COLORS_PALETTE[0])
  }

  function handleAdd() {
    if (!draftName.trim()) return
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: draftName.trim(),
      bg: draftColor.bg,
      border: draftColor.border,
    }
    setSubjects((prev) => [...prev, newSubject])
    setDraftName("")
  }

  function handleDelete(id: string) {
    if (!confirm("¿Seguro que deseas eliminar esta materia? Se perderán todas sus clases, notas y exámenes asociados.")) return
    
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setClasses((prev) => prev.filter((c) => c.subjectId !== id))
    setExams((prev) => prev.filter((e) => e.subjectId !== id))
    setGrades((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] animate-scale-in max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Administrar Materias</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Añadir materia */}
          <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
            <Label className="text-sm font-semibold">Nueva Materia</Label>
            <Input
              placeholder="Ej: Matemáticas"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
            />
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS_PALETTE.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setDraftColor(c)}
                    className={`size-6 rounded-full transition-transform ${
                      draftColor.bg === c.bg ? "scale-110 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
                    type="button"
                    title="Color"
                  />
                ))}

                {customColors.length > 0 && (
                  <span className="w-px h-5 bg-border mx-0.5" />
                )}

                {customColors.map((c, i) => (
                  <div key={`custom-${i}`} className="relative group">
                    <button
                      onClick={() => setDraftColor(c)}
                      className={`size-6 rounded-full transition-transform ${
                        draftColor.bg === c.bg ? "scale-110 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
                      type="button"
                      title="Color personalizado"
                    />
                    <button
                      onClick={(e) => handleRemoveCustomColor(e, c.bg)}
                      className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-neutral-800 text-white opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center"
                      type="button"
                      title="Quitar color"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}

                {!pickerOpen ? (
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="size-6 rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground grid place-items-center hover:scale-110 hover:border-primary hover:text-primary transition-all"
                    type="button"
                    title="Agregar color personalizado"
                  >
                    <Plus className="size-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-muted/50 rounded-full pl-1 pr-1.5 py-1 border animate-scale-in">
                    <button
                      onClick={() => colorInputRef.current?.click()}
                      className="size-6 rounded-full shrink-0 ring-1 ring-border"
                      style={{ backgroundColor: pickerHex }}
                      type="button"
                      title="Elegir tono"
                    />
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={pickerHex}
                      onChange={(e) => setPickerHex(e.target.value)}
                      className="sr-only"
                    />
                    <button
                      onClick={confirmCustomColor}
                      className="text-xs font-medium text-primary px-1"
                      type="button"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setPickerOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                      type="button"
                      title="Cancelar"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!draftName.trim()}>
              <Plus className="size-4 mr-1" /> Añadir
            </Button>
          </div>

          {/* Lista de materias */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tus Materias ({subjects.length})</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                No tienes materias creadas.
              </p>
            ) : (
              <ul className="space-y-2">
                {subjects.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md border animate-fade-in"
                    style={{ backgroundColor: s.bg, borderColor: s.border }}
                  >
                    <span className="text-sm font-medium text-neutral-900 truncate">{s.name}</span>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-neutral-900/50 hover:text-neutral-900 hover:bg-black/10 rounded transition-colors"
                      title="Eliminar materia"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
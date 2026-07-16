"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Users, User, FileText, Presentation, StickyNote, ChevronDown, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getSubject, type Subject, type Exam } from "@/lib/horario-data"

type Props = {
  subjects: Subject[]
  exams: Exam[]
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
}

// Detecta si el viewport es móvil (breakpoint sm de Tailwind = 640px)
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [breakpoint])

  return isMobile
}

export function ExamenesTab({ subjects, exams, setExams }: Props) {
  const [subjectId, setSubjectId] = useState(subjects.length > 0 ? subjects[0].id : "")
  const [date, setDate] = useState("")
  const [group, setGroup] = useState<Exam["group"]>("individual")
  const [kind, setKind] = useState<Exam["kind"]>("examen")
  const [weight, setWeight] = useState("")
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [draftNote, setDraftNote] = useState("")

  // El formulario de "agregar examen" inicia abierto en PC y cerrado en móvil,
  // para que en móvil no ocupe toda la pantalla al entrar a la pestaña.
  const isMobile = useIsMobile()
  const [formOpen, setFormOpen] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)
  useEffect(() => {
    if (isMobile === null || formInitialized) return
    setFormOpen(!isMobile)
    setFormInitialized(true)
  }, [isMobile, formInitialized])

  // Estado de expansión y borrador de nota por examen ya creado
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [noteDraftById, setNoteDraftById] = useState<Record<string, string>>({})

  function add() {
    if (!date) return
    const exam: Exam = {
      id: crypto.randomUUID(),
      subjectId,
      date,
      group,
      kind,
      weight: Number(weight) || 0,
      notes: draftNote.trim() || undefined,
    }
    setExams((prev) => [...prev, exam])
    setDate("")
    setWeight("")
    setDraftNote("")
    setShowNoteInput(false)
    if (isMobile) setFormOpen(false)
  }

  function remove(id: string) {
    setExams((prev) => prev.filter((e) => e.id !== id))
    setExpandedIds((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setNoteDraftById((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function toggleExpand(id: string, currentNotes?: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
    setNoteDraftById((prev) => (id in prev ? prev : { ...prev, [id]: currentNotes ?? "" }))
  }

  function saveNote(id: string) {
    const value = (noteDraftById[id] ?? "").trim()
    setExams((prev) => prev.map((ex) => (ex.id === id ? { ...ex, notes: value || undefined } : ex)))
  }

  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))

  function formatDate(d: string) {
    const date = new Date(d + "T00:00:00")
    return date.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold">Fechas de exámenes</h2>
        <p className="text-sm text-muted-foreground">
          Anota las fechas de tus exámenes.
        </p>
      </div>

      {/* Form (colapsable) */}
      <Card className="overflow-hidden p-0 animate-slide-up">
        <div
          onClick={() => setFormOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setFormOpen((o) => !o)
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={formOpen}
          className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CalendarPlus className="size-4 shrink-0 text-muted-foreground" />
            <h3 className="font-semibold leading-tight">Agregar examen</h3>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
              formOpen && "rotate-180"
            )}
          />
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t px-4 pb-4 pt-3 sm:px-6">
              <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-12 lg:items-end lg:gap-4">
                <div className="col-span-2 space-y-1 lg:col-span-4">
                  <Label>Materia</Label>
                  <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
                    <SelectTrigger disabled={subjects.length === 0}>
                      <SelectValue placeholder="Selecciona una materia">{() => getSubject(subjects, subjectId)?.name}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No hay materias</div>
                      ) : (
                        subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label htmlFor="exam-date">Fecha</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label>Modalidad</Label>
                  <Select value={group} onValueChange={(v) => v && setGroup(v as Exam["group"])}>
                    <SelectTrigger>
                      <SelectValue>{(v) => (v === "grupal" ? "Grupal" : "Individual")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="grupal">Grupal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label>Tipo</Label>
                  <Select value={kind} onValueChange={(v) => v && setKind(v as Exam["kind"])}>
                    <SelectTrigger>
                      <SelectValue>{(v) => (v === "presentacion" ? "Presentación" : "Examen")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="examen">Examen</SelectItem>
                      <SelectItem value="presentacion">Presentación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1 lg:col-span-2">
                  <Label htmlFor="exam-weight">Vale %</Label>
                  <div className="flex gap-2">
                    <Input
                      id="exam-weight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="25"
                      inputMode="numeric"
                    />
                    <Button onClick={add} size="icon" aria-label="Agregar examen" className="shrink-0" disabled={subjects.length === 0}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Nota / descripción opcional al crear */}
              <div className="mx-auto mt-3 max-w-3xl border-t pt-3">
                {showNoteInput ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="exam-note">Nota o descripción (opcional)</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNoteInput(false)
                          setDraftNote("")
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Quitar
                      </button>
                    </div>
                    <textarea
                      id="exam-note"
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      rows={2}
                      placeholder="Ej: Trae calculadora, tema: derivadas e integrales..."
                      className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNoteInput(true)}
                    disabled={subjects.length === 0}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    <StickyNote className="size-3.5" /> Agregar nota o descripción
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista */}
      {sorted.length > 0 ? (
        <div className="mx-auto max-w-5xl space-y-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {sorted.map((e) => {
            const subject = getSubject(subjects, e.subjectId)
            const isExpanded = expandedIds[e.id] ?? false
            const hasNotes = Boolean(e.notes && e.notes.trim())

            return (
              <div
                key={e.id}
                className="rounded-xl border bg-card overflow-hidden animate-pop"
              >
                {/* Fila principal (clic para ver/editar la nota) */}
                <div
                  onClick={() => toggleExpand(e.id, e.notes)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault()
                      toggleExpand(e.id, e.notes)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  className="flex flex-wrap items-center gap-3 p-3 cursor-pointer select-none"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: subject?.border }}
                    aria-hidden
                  />
                  <div className="min-w-35 flex-1">
                    <p className="font-medium leading-tight flex items-center gap-1.5">
                      {subject?.name}
                      {hasNotes && (
                        <StickyNote className="size-3.5 text-muted-foreground" aria-label="Tiene nota" />
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">{formatDate(e.date)}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    {e.group === "grupal" ? <Users className="size-3" /> : <User className="size-3" />}
                    {e.group === "grupal" ? "Grupal" : "Individual"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    {e.kind === "presentacion" ? (
                      <Presentation className="size-3" />
                    ) : (
                      <FileText className="size-3" />
                    )}
                    {e.kind === "presentacion" ? "Presentación" : "Examen"}
                  </Badge>
                  <Badge className="tabular-nums">{e.weight}%</Badge>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                      isExpanded && "rotate-180"
                    )}
                  />
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      remove(e.id)
                    }}
                    aria-label="Eliminar examen"
                    className="text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Nota colapsable (animación fluida con CSS grid) */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-in-out",
                    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2 border-t px-3 pb-3 pt-3">
                      <Label className="text-xs text-muted-foreground">Nota o descripción</Label>
                      <textarea
                        value={noteDraftById[e.id] ?? e.notes ?? ""}
                        onChange={(ev) =>
                          setNoteDraftById((prev) => ({ ...prev, [e.id]: ev.target.value }))
                        }
                        rows={3}
                        placeholder="Agrega detalles del examen: temas, materiales permitidos, etc."
                        className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" variant="secondary" onClick={() => saveNote(e.id)}>
                          Guardar nota
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No has agregado fechas todavía.
        </p>
      )}
    </div>
  )
}
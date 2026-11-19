"use client"

import { useEffect, useRef, useState } from "react"
import {
  Plus, Pencil, Trash2, X, ArrowLeft, GraduationCap, ChevronRight, Users, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  COLORS_PALETTE, borderFromBg, loadCustomColors, removeCustomColor, saveCustomColor, subjectsOf, teachersOf,
  type Absence, type ClassSession, type ColorSwatch, type Exam, type Grade, type Subject, type SubjectConfig, type Teacher,
} from "@/lib/horario-data"
import { MultiPicker } from "./multi-picker"
import { useSheetBack } from "@/lib/use-sheet-back"
import { Avatar, saveTeacher, teacherColor, toggleAssign, type TeacherOps } from "./teacher-parts"

const DAY_SHORT = ["L", "M", "Mi", "J", "V"]
const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"]
const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/** Primer color de la paleta que aún no usa ninguna materia (si todos se usan, vuelve a empezar). */
export function pickDefaultColor(subjects: Subject[]): ColorSwatch {
  return COLORS_PALETTE.find((c) => !subjects.some((s) => s.bg === c.bg)) ?? COLORS_PALETTE[subjects.length % COLORS_PALETTE.length]
}

const hoursText = (min: number) => { const h = min / 60; return `${Number.isInteger(h) ? h : h.toFixed(1)} h` }

/* ───────────── Selector de color (paleta + personalizados) ───────────── */

export function ColorPicker({ value, onChange }: { value: ColorSwatch; onChange: (c: ColorSwatch) => void }) {
  const [custom, setCustom] = useState<ColorSwatch[]>([])
  const [picking, setPicking] = useState(false)
  const [hex, setHex] = useState("#c9b8f0")
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => setCustom(loadCustomColors()), [])

  const dot = (c: ColorSwatch, key: string, removable = false) => (
    <div key={key} className="group relative">
      <button
        type="button"
        onClick={() => onChange(c)}
        aria-label="Elegir color"
        aria-pressed={value.bg === c.bg}
        className={cn("size-7 rounded-full transition-transform", value.bg === c.bg ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-popover" : "hover:scale-110")}
        style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
      />
      {removable && (
        <button
          type="button"
          onClick={() => { setCustom(removeCustomColor(c.bg)); if (value.bg === c.bg) onChange(COLORS_PALETTE[0]) }}
          aria-label="Quitar color"
          className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-neutral-800 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {COLORS_PALETTE.map((c, i) => dot(c, `p${i}`))}
      {custom.length > 0 && <span className="mx-0.5 h-5 w-px bg-border" />}
      {custom.map((c, i) => dot(c, `c${i}`, true))}
      {picking ? (
        <div className="flex animate-scale-in items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-1 pr-2">
          <button type="button" onClick={() => inputRef.current?.click()} aria-label="Elegir tono" className="size-6 rounded-full ring-1 ring-border" style={{ backgroundColor: hex }} />
          <input ref={inputRef} type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="sr-only" />
          <button
            type="button"
            className="px-1 text-xs font-medium"
            onClick={() => {
              const sw = { bg: hex, border: borderFromBg(hex) }
              setCustom(saveCustomColor(sw))
              onChange(sw)
              setPicking(false)
            }}
          >
            Guardar
          </button>
          <button type="button" onClick={() => setPicking(false)} aria-label="Cancelar" className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} aria-label="Color personalizado" title="Color personalizado"
          className="grid size-7 place-items-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground transition hover:scale-110 hover:border-foreground hover:text-foreground">
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/* ───────────── Formulario de materia ───────────── */

function SubjectForm({ subject, subjects, teachers, onCreateTeacher, onSave, onCancel }: {
  subject?: Subject
  subjects: Subject[]
  teachers: Teacher[]
  onCreateTeacher: (name: string) => string
  onSave: (name: string, color: ColorSwatch, teacherIds: string[], credits?: number) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(subject?.name ?? "")
  const [color, setColor] = useState<ColorSwatch>(subject ? { bg: subject.bg, border: subject.border } : pickDefaultColor(subjects))
  const [ids, setIds] = useState<string[]>(subject?.teacherIds ?? [])
  const [credits, setCredits] = useState<number | undefined>(subject?.credits)
  const ok = name.trim().length > 0

  function addTeacher(n: string) {
    const id = onCreateTeacher(n) // efecto fuera del updater: si no, StrictMode lo ejecuta dos veces
    setIds((x) => [...x, id])
  }

  // Misma estructura que la ficha de la materia: barra de color + nombre → (color) → profesores
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave(name.trim(), color, ids, credits) }} className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3 pr-6">
        <span className="h-11 w-1.5 shrink-0 rounded-full transition-colors" style={{ background: color.border }} />
        <Input id="subject-name" aria-label="Nombre de la materia" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la materia" maxLength={60} className="h-11 text-base font-semibold" />
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color</h3>
        <ColorPicker value={color} onChange={setColor} />
      </section>

      <section className="space-y-2">
        <h3 className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Créditos<span className="font-normal normal-case tracking-normal">opcional · ponderan tu promedio</span></h3>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Créditos">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={credits === n} onClick={() => setCredits(credits === n ? undefined : n)}
              className={cn("num grid size-10 place-items-center rounded-lg border text-sm font-semibold transition active:scale-95", credits === n ? "border-transparent bg-foreground text-background" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground")}>{n}</button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profesores</h3>
        <MultiPicker variant="rows" noun="profesor" value={ids} onChange={setIds} onCreate={addTeacher}
          items={teachers.map((t) => ({
            id: t.id, label: t.name || "Profesor", color: teacherColor(t, subjects),
            sub: t.role || undefined,
            lead: <Avatar name={t.name || "?"} color={teacherColor(t, subjects)} size="size-8 text-[11px]" />,
          }))} />
      </section>

      <div className="sheet-actions flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={!ok}>{subject ? "Guardar cambios" : "Crear materia"}</Button>
      </div>
    </form>
  )
}

/* ───────────── Pestaña Materias ───────────── */

export type MateriasRequest = { kind: "new" } | { kind: "open"; subjectId: string }

type Props = {
  subjects: Subject[]
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>
  classes: ClassSession[]
  setClasses: React.Dispatch<React.SetStateAction<ClassSession[]>>
  setGrades: React.Dispatch<React.SetStateAction<Record<string, Grade[]>>>
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>
  setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>
  setSubjectConfigs: React.Dispatch<React.SetStateAction<Record<string, SubjectConfig>>>
  teachers: Teacher[]
  setTeachers: TeacherOps["setTeachers"]
  timeLabel: (min: number) => string
  onAddClass: (subjectId: string) => void
  onEditClass: (c: ClassSession) => void
  onOpenTeacher: (teacherId: string) => void
  request: MateriasRequest | null // algo que abrir apenas se muestre (nueva materia, o la ficha de una materia)
  onRequestHandled: () => void
}

type Dlg = { subjectId: string | null; view: "detail" | "subject"; fresh?: boolean }

export function MateriasTab({
  subjects, setSubjects, classes, setClasses, setGrades, setExams, setAbsences, setSubjectConfigs, teachers, setTeachers,
  timeLabel, onAddClass, onEditClass, onOpenTeacher, request, onRequestHandled,
}: Props) {
  const ops: TeacherOps = { subjects, setSubjects, setTeachers, setClasses }
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [query, setQuery] = useState("")
  const q = norm(query.trim())
  const shownSubjects = q
    ? subjects.filter((s) => norm(s.name).includes(q) || teachersOf(s, teachers).some((t) => norm(t.name ?? "").includes(q)))
    : subjects

  // peticiones de fuera (botón del horario vacío, tocar una materia en Profesores): se atienden una vez y se avisa
  useEffect(() => {
    if (!request) return
    setConfirmDelete(false)
    setDlg(request.kind === "new" ? { subjectId: null, view: "subject" } : { subjectId: request.subjectId, view: "detail" })
    onRequestHandled()
  }, [request, onRequestHandled])

  const current = dlg?.subjectId ? subjects.find((s) => s.id === dlg.subjectId) : undefined
  const close = () => { setDlg(null); setConfirmDelete(false) }
  useSheetBack(dlg !== null, close)
  const open = (next: Dlg) => { setConfirmDelete(false); setDlg(next) }

  const classesOf = (id: string) => classes.filter((c) => c.subjectId === id).sort((a, b) => a.day - b.day || a.startTime - b.startTime)

  function createTeacherByName(name: string) {
    return saveTeacher(ops, undefined, { name }, [])
  }

  function saveSubject(name: string, color: ColorSwatch, teacherIds: string[], credits?: number) {
    if (current) {
      const removed = (current.teacherIds ?? []).filter((id) => !teacherIds.includes(id))
      setSubjects((prev) => prev.map((s) => (s.id === current.id ? { ...s, name, bg: color.bg, border: color.border, teacherIds, credits } : s)))
      if (removed.length) setClasses((prev) => prev.map((c) => (c.subjectId === current.id && c.teacherId && removed.includes(c.teacherId) ? { ...c, teacherId: undefined } : c)))
      open({ subjectId: current.id, view: "detail" })
    } else {
      const id = crypto.randomUUID()
      setSubjects((prev) => [...prev, { id, name, bg: color.bg, border: color.border, teacherIds, credits }])
      open({ subjectId: id, view: "detail", fresh: true })
    }
  }

  function deleteSubject(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setClasses((prev) => prev.filter((c) => c.subjectId !== id))
    setExams((prev) => prev.filter((e) => e.subjectId !== id))
    setAbsences((prev) => prev.filter((a) => a.subjectId !== id))
    setGrades((prev) => { const copy = { ...prev }; delete copy[id]; return copy })
    setSubjectConfigs((prev) => { const copy = { ...prev }; delete copy[id]; return copy })
    close()
  }

  /* ── tarjetas ── */

  const card = (s: Subject) => {
    const cl = classesOf(s.id)
    const own = teachersOf(s, teachers)
    const weekMin = cl.reduce((n, c) => n + (c.endTime - c.startTime), 0)
    const days = SHORT.filter((_, i) => cl.some((c) => c.day === i))
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => open({ subjectId: s.id, view: "detail" })}
        className="group animate-pop flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition duration-200 hover:border-foreground/25 hover:bg-foreground/[0.02] active:scale-[0.99]"
      >
        <span className="h-11 w-1.5 shrink-0 rounded-full" style={{ background: s.border }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-tight">{s.name}</span>
          <span className="num mt-0.5 block truncate text-xs text-muted-foreground">
            {cl.length === 0 ? "Sin clases aún" : `${days.join(" · ")} · ${hoursText(weekMin)} por semana`}{s.credits ? ` · ${s.credits} ${s.credits === 1 ? "crédito" : "créditos"}` : ""}
          </span>
          <span className={cn("mt-1.5 flex items-center gap-1.5 text-xs", own.length ? "text-foreground/80" : "text-muted-foreground/60")}>
            <Users className="size-3.5 shrink-0" />
            <span className="truncate">{own.length ? `${own[0].name || "Profesor"}${own.length > 1 ? ` +${own.length - 1}` : ""}` : "Sin profesor"}</span>
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </button>
    )
  }

  /* ── contenido del diálogo ── */

  const header = (title: string, desc?: string, back?: () => void, hidden?: boolean) => (
    <DialogHeader className={cn("space-y-1", hidden && "sr-only")}>
      <div className="flex items-center gap-2">
        {back && (
          <button type="button" onClick={back} aria-label="Volver" className="tap -ml-1 grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <DialogTitle className="min-w-0 truncate">{title}</DialogTitle>
      </div>
      <DialogDescription className={desc ? undefined : "sr-only"}>{desc ?? title}</DialogDescription>
    </DialogHeader>
  )

  let body: React.ReactNode = null
  if (dlg?.view === "subject") {
    const back = current ? () => open({ subjectId: current.id, view: "detail" }) : undefined
    body = (
      <>
        {/* Al editar no hay título: la cabecera es la de la ficha, para no perder el sitio */}
        {current ? header("Editar materia", undefined, undefined, true) : header("Nueva materia", "Después podrás agregar sus clases.", back)}
        <SubjectForm key={current?.id ?? "new"} subject={current} subjects={subjects} teachers={teachers} onCreateTeacher={createTeacherByName}
          onSave={saveSubject} onCancel={() => (back ? back() : close())} />
      </>
    )
  } else if (dlg?.view === "detail" && current) {
    const s = current
    const own = teachersOf(s, teachers)
    const cl = classesOf(s.id)
    body = (
      <>
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: s.border }} />
            <DialogTitle className="line-clamp-2 min-w-0 flex-1 break-words text-lg leading-snug">{s.name}</DialogTitle>
            <button type="button" onClick={() => open({ subjectId: s.id, view: "subject" })} aria-label="Editar materia" title="Editar nombre, color y profesores"
              className="tap mr-6 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground">
              <Pencil className="size-4" />
            </button>
          </div>
          <DialogDescription className="sr-only">Profesores y clases de {s.name}</DialogDescription>
        </DialogHeader>

        {dlg.fresh && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            ¡Materia creada! Ahora agrega sus clases.
          </p>
        )}

        {/* Profesores */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profesores</h3>
          <MultiPicker variant="rows" noun="profesor" value={s.teacherIds ?? []} onCreate={(name) => toggleAssign(ops, createTeacherByName(name), s.id, true)}
            onChange={(ids) => {
              const cur = s.teacherIds ?? []
              ids.filter((id) => !cur.includes(id)).forEach((id) => toggleAssign(ops, id, s.id, true))
              cur.filter((id) => !ids.includes(id)).forEach((id) => toggleAssign(ops, id, s.id, false))
            }}
            onOpen={(id) => { close(); onOpenTeacher(id) }}
            items={teachers.map((t) => ({
              id: t.id, label: t.name || "Profesor", color: teacherColor(t, subjects),
              sub: t.role || undefined,
              lead: <Avatar name={t.name || "?"} color={teacherColor(t, subjects)} size="size-8 text-[11px]" />,
            }))} />
        </section>

        {/* Clases */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clases</h3>
          {cl.length > 0 && (
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {cl.map((c) => {
                const t = own.find((x) => x.id === c.teacherId)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => { close(); onEditClass(c) }}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-foreground/[0.05] active:scale-[0.99]">
                      <span className="grid h-7 w-11 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-neutral-900" style={{ backgroundColor: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` }}>{SHORT[c.day]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="num block text-sm font-medium">{timeLabel(c.startTime)} – {timeLabel(c.endTime)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{[c.room, c.group && `Grupo ${c.group}`, t?.name].filter(Boolean).join(" · ") || "Sin salón asignado"}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <button type="button" onClick={() => { close(); onAddClass(s.id) }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
            <Plus className="size-4" />{cl.length === 0 ? "Agregar la primera clase" : "Agregar clase"}
          </button>
        </section>

        {/* Eliminar */}
        <div className="border-t pt-3">
          {confirmDelete ? (
            <div className="space-y-2.5 rounded-lg bg-destructive/10 p-3 text-sm">
              <p>Se eliminarán <b>{s.name}</b> y todo lo suyo: {cl.length} clase{cl.length === 1 ? "" : "s"}, notas, exámenes y faltas. Los profesores se conservan. No se puede deshacer.</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteSubject(s.id)}>Eliminar materia</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-destructive">
              <Trash2 className="size-3.5" />Eliminar materia
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {subjects.length === 0 ? (
        <div className="animate-scale-in rounded-xl border-2 border-dashed bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-foreground/10"><GraduationCap className="size-6" /></div>
          <h3 className="text-lg font-semibold">Aún no tienes materias</h3>
          <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-muted-foreground">Crea una materia, ponle un color y asígnale su profesor. Después ubicas sus clases en la semana.</p>
          <Button onClick={() => open({ subjectId: null, view: "subject" })}><Plus className="size-4" />Crear primera materia</Button>
        </div>
      ) : (
        <>
          {/* Buscador: por nombre de la materia o de su profesor (sin importar tildes ni mayúsculas) */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar materia o profesor" aria-label="Buscar materia"
              enterKeyHint="search" className="h-11 rounded-xl pl-10 pr-10 text-base [&::-webkit-search-cancel-button]:hidden" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda"
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          {shownSubjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{shownSubjects.map(card)}</div>
          ) : (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">Ninguna materia coincide con «{query.trim()}».</p>
              <button type="button" onClick={() => setQuery("")} className="mt-2 text-sm font-medium text-brand hover:underline">Ver todas</button>
            </div>
          )}
        </>
      )}

      <Dialog open={dlg !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-[480px]">{body}</DialogContent>
      </Dialog>
    </div>
  )
}

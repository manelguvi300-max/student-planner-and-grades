"use client"

import { useEffect, useRef, useState } from "react"
import {
  Plus, Pencil, Trash2, Mail, Phone, X, ArrowLeft, UserPlus, CalendarPlus, GraduationCap, ChevronRight, Check, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  COLORS_PALETTE, borderFromBg, loadCustomColors, removeCustomColor, saveCustomColor, subjectsOf, teachersOf,
  type Absence, type ClassSession, type ColorSwatch, type Exam, type Grade, type Subject, type SubjectConfig, type Teacher,
} from "@/lib/horario-data"
import { MultiPicker } from "./multi-picker"
import { Avatar, TeacherForm, saveTeacher, teacherColor, toggleAssign, type TeacherOps } from "./teacher-parts"

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
  onSave: (name: string, color: ColorSwatch, teacherIds: string[]) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(subject?.name ?? "")
  const [color, setColor] = useState<ColorSwatch>(subject ? { bg: subject.bg, border: subject.border } : pickDefaultColor(subjects))
  const [ids, setIds] = useState<string[]>(subject?.teacherIds ?? [])
  const ok = name.trim().length > 0

  function addTeacher(n: string) {
    const id = onCreateTeacher(n) // efecto fuera del updater: si no, StrictMode lo ejecuta dos veces
    setIds((x) => [...x, id])
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave(name.trim(), color, ids) }} className="space-y-5">
      {/* Vista previa */}
      <div className="flex items-center gap-3 rounded-2xl border p-3" style={{ backgroundColor: color.bg, borderColor: color.border }}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/10 text-neutral-900"><GraduationCap className="size-5" /></span>
        <p className="min-w-0 truncate font-semibold text-neutral-900">{name.trim() || "Nombre de la materia"}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject-name">Nombre</Label>
        <Input id="subject-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Cálculo diferencial" maxLength={60} />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker value={color} onChange={setColor} />
        <p className="text-xs text-muted-foreground">Es el color de sus clases en el horario, las notas y los exámenes.</p>
      </div>

      <div className="space-y-2">
        <Label>Profesores <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <MultiPicker noun="profesor" value={ids} onChange={setIds} onCreate={addTeacher}
          items={teachers.map((t) => ({
            id: t.id, label: t.name || "Profesor", color: teacherColor(t, subjects),
            sub: [t.role, subjectsOf(t.id, subjects).map((s) => s.name).join(", ")].filter(Boolean).join(" · ") || undefined,
            lead: <Avatar name={t.name || "?"} color={teacherColor(t, subjects)} size="size-6 text-[10px]" />,
          }))} />
        <p className="text-xs text-muted-foreground">Su correo y asesorías los completas en Profesores.</p>
      </div>

      <div className="flex justify-end gap-2">
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

type Dlg = { subjectId: string | null; view: "detail" | "subject" | "assign" | "teacher"; fresh?: boolean }

export function MateriasTab({
  subjects, setSubjects, classes, setClasses, setGrades, setExams, setAbsences, setSubjectConfigs, teachers, setTeachers,
  timeLabel, onAddClass, onEditClass, onOpenTeacher, request, onRequestHandled,
}: Props) {
  const ops: TeacherOps = { subjects, setSubjects, setTeachers, setClasses }
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [query, setQuery] = useState("")

  // peticiones de fuera (botón del horario vacío, tocar una materia en Profesores): se atienden una vez y se avisa
  useEffect(() => {
    if (!request) return
    setConfirmDelete(false)
    setDlg(request.kind === "new" ? { subjectId: null, view: "subject" } : { subjectId: request.subjectId, view: "detail" })
    onRequestHandled()
  }, [request, onRequestHandled])

  const current = dlg?.subjectId ? subjects.find((s) => s.id === dlg.subjectId) : undefined
  const close = () => { setDlg(null); setConfirmDelete(false); setQuery("") }
  const open = (next: Dlg) => { setConfirmDelete(false); setQuery(""); setDlg(next) }

  const classesOf = (id: string) => classes.filter((c) => c.subjectId === id).sort((a, b) => a.day - b.day || a.startTime - b.startTime)

  function createTeacherByName(name: string) {
    return saveTeacher(ops, undefined, { name }, [])
  }

  function saveSubject(name: string, color: ColorSwatch, teacherIds: string[]) {
    if (current) {
      const removed = (current.teacherIds ?? []).filter((id) => !teacherIds.includes(id))
      setSubjects((prev) => prev.map((s) => (s.id === current.id ? { ...s, name, bg: color.bg, border: color.border, teacherIds } : s)))
      if (removed.length) setClasses((prev) => prev.map((c) => (c.subjectId === current.id && c.teacherId && removed.includes(c.teacherId) ? { ...c, teacherId: undefined } : c)))
      open({ subjectId: current.id, view: "detail" })
    } else {
      const id = crypto.randomUUID()
      setSubjects((prev) => [...prev, { id, name, bg: color.bg, border: color.border, teacherIds }])
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
    const days = new Set(cl.map((c) => c.day))
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => open({ subjectId: s.id, view: "detail" })}
        className="group animate-pop flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-(--card-shadow) transition duration-200 hover:-translate-y-0.5 hover:border-foreground/25 active:scale-[0.99]"
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full" style={{ background: s.border }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-tight">{s.name}</span>
            <span className="num mt-0.5 block text-xs text-muted-foreground">
              {cl.length === 0 ? "Sin clases aún" : `${cl.length} clase${cl.length === 1 ? "" : "s"} · ${hoursText(weekMin)} por semana`}
            </span>
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </span>

        <span className="flex items-center justify-between gap-3">
          {own.length > 0 ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex -space-x-2">
                {own.slice(0, 3).map((t) => <Avatar key={t.id} name={t.name} color={s} size="size-7 ring-2 ring-card" />)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {own[0].name || "Profesor"}{own.length > 1 ? ` +${own.length - 1}` : ""}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs italic text-muted-foreground/70"><UserPlus className="size-3.5" />Asignar profesor</span>
          )}
          <span className="flex shrink-0 gap-1" aria-label="Días con clase">
            {DAY_SHORT.map((d, i) => (
              <span key={d} className={cn("grid size-5 place-items-center rounded-full text-[9px] font-semibold", days.has(i) ? "text-neutral-900" : "bg-foreground/[0.06] text-muted-foreground/60")}
                style={days.has(i) ? { backgroundColor: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` } : undefined}>
                {d}
              </span>
            ))}
          </span>
        </span>
      </button>
    )
  }

  /* ── contenido del diálogo ── */

  const header = (title: string, desc?: string, back?: () => void) => (
    <DialogHeader className="space-y-1">
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
        {header(current ? "Editar materia" : "Nueva materia", current ? "Cambia su nombre, su color o sus profesores." : "Después podrás agregar sus clases.", back)}
        <SubjectForm key={current?.id ?? "new"} subject={current} subjects={subjects} teachers={teachers} onCreateTeacher={createTeacherByName}
          onSave={saveSubject} onCancel={() => (back ? back() : close())} />
      </>
    )
  } else if (dlg?.view === "teacher" && current) {
    body = (
      <>
        {header("Nuevo profesor", current.name, () => open({ subjectId: current.id, view: "assign" }))}
        <TeacherForm subjects={subjects} presetSubjectIds={[current.id]} timeLabel={timeLabel}
          onSave={(data, subjectIds) => { saveTeacher(ops, undefined, data, subjectIds); open({ subjectId: current.id, view: "detail" }) }}
          onCancel={() => open({ subjectId: current.id, view: "assign" })} />
      </>
    )
  } else if (dlg?.view === "assign" && current) {
    const list = query.trim() ? teachers.filter((t) => norm(`${t.name} ${t.role ?? ""}`).includes(norm(query.trim()))) : teachers
    const assigned = new Set(current.teacherIds ?? [])
    body = (
      <>
        {header("Profesores de la materia", current.name, () => open({ subjectId: current.id, view: "detail" }))}
        {teachers.length > 5 && (
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar profesor…" aria-label="Buscar profesor"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        )}
        {teachers.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">Aún no tienes profesores guardados. Crea el primero.</p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto" role="listbox" aria-multiselectable aria-label="Profesores">
            {list.map((t) => {
              const on = assigned.has(t.id)
              return (
                <li key={t.id}>
                  <button type="button" role="option" aria-selected={on} onClick={() => toggleAssign(ops, t.id, current.id, !on)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]", on ? "border-foreground/40 bg-foreground/[0.05]" : "hover:border-foreground/25")}>
                    <Avatar name={t.name} color={teacherColor(t, subjects)} size="size-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.name || "Sin nombre"}</span>
                      {t.role && <span className="block truncate text-xs text-muted-foreground">{t.role}</span>}
                    </span>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", on ? "border-foreground bg-foreground text-background" : "border-muted-foreground/40")}>
                      {on && <Check className="size-3.5" />}
                    </span>
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">Nadie coincide con «{query.trim()}».</li>}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => open({ subjectId: current.id, view: "teacher" })}><UserPlus className="size-4" />Crear profesor nuevo</Button>
          <Button type="button" onClick={() => open({ subjectId: current.id, view: "detail" })}>Listo</Button>
        </div>
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
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            ¡Materia creada! Ahora agrega sus clases.
          </p>
        )}

        {/* Profesores */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profesores <span className="font-normal normal-case tracking-normal">{own.length || ""}</span></h3>
            {own.length > 0 && <Button size="sm" variant="secondary" onClick={() => open({ subjectId: s.id, view: "assign" })}><Plus className="size-3.5" />Asignar</Button>}
          </div>
          {own.length === 0 ? (
            <button type="button" onClick={() => open({ subjectId: s.id, view: "assign" })}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition hover:border-foreground/40 hover:bg-foreground/[0.03]">
              <UserPlus className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Asignar profesor</span>
              <span className="max-w-[17rem] text-xs text-muted-foreground">Elige uno de tus profesores o crea uno nuevo. Puedes asignar varios (teoría, laboratorio…).</span>
            </button>
          ) : (
            <ul className="space-y-1.5">
              {own.map((t) => {
                const n = cl.filter((c) => c.teacherId === t.id).length
                return (
                  <li key={t.id} className="flex items-center gap-2 rounded-xl border bg-card p-2 pl-3">
                    <button type="button" onClick={() => { close(); onOpenTeacher(t.id) }} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]">
                      <Avatar name={t.name} color={s} size="size-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.name || "Sin nombre"}</span>
                        <span className="block truncate text-xs text-muted-foreground">{[t.role, n > 0 && `Da ${n} clase${n === 1 ? "" : "s"}`].filter(Boolean).join(" · ") || "Ver datos"}</span>
                      </span>
                    </button>
                    {t.email && <a href={`mailto:${t.email}`} aria-label={`Escribir a ${t.name}`} className="tap grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground"><Mail className="size-4" /></a>}
                    {t.phone && <a href={`tel:${t.phone.replace(/\s/g, "")}`} aria-label={`Llamar a ${t.name}`} className="tap grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground"><Phone className="size-4" /></a>}
                    <button type="button" onClick={() => toggleAssign(ops, t.id, s.id, false)} aria-label={`Quitar a ${t.name} de esta materia`} title="Quitar de esta materia"
                      className="tap grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><X className="size-4" /></button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Clases */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clases <span className="font-normal normal-case tracking-normal">{cl.length || ""}</span></h3>
            {cl.length > 0 && <Button size="sm" variant="secondary" onClick={() => { close(); onAddClass(s.id) }}><Plus className="size-3.5" />Agregar</Button>}
          </div>
          {cl.length === 0 ? (
            <button type="button" onClick={() => { close(); onAddClass(s.id) }}
              className="flex w-full flex-col items-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition hover:border-foreground/40 hover:bg-foreground/[0.03]">
              <CalendarPlus className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Agregar clase al horario</span>
              <span className="text-xs text-muted-foreground">Elige los días y la hora en que se dicta.</span>
            </button>
          ) : (
            <ul className="space-y-1.5">
              {cl.map((c) => {
                const t = own.find((x) => x.id === c.teacherId)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => { close(); onEditClass(c) }}
                      className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition hover:border-foreground/25 active:scale-[0.99]">
                      <span className="grid h-7 w-11 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-neutral-900" style={{ backgroundColor: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` }}>{SHORT[c.day]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="num block text-sm font-medium">{timeLabel(c.startTime)} – {timeLabel(c.endTime)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{[c.room, c.group && `Grupo ${c.group}`, t?.name].filter(Boolean).join(" · ") || "Sin salón asignado"}</span>
                      </span>
                      <Pencil className="size-3.5 shrink-0 text-muted-foreground/60" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Eliminar */}
        <div className="border-t pt-3">
          {confirmDelete ? (
            <div className="space-y-2.5 rounded-xl bg-destructive/10 p-3 text-sm">
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
        <div className="animate-scale-in rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-foreground/10"><GraduationCap className="size-6" /></div>
          <h3 className="text-lg font-semibold">Aún no tienes materias</h3>
          <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-muted-foreground">Crea una materia, ponle un color y asígnale su profesor. Después ubicas sus clases en la semana.</p>
          <Button onClick={() => open({ subjectId: null, view: "subject" })}><Plus className="size-4" />Crear primera materia</Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Toca una materia para ver sus clases y asignar profesores.</p>
            <Button size="sm" onClick={() => open({ subjectId: null, view: "subject" })} className="shrink-0 rounded-full"><Plus className="size-4" />Materia</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{subjects.map(card)}</div>
        </>
      )}

      <Dialog open={dlg !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-[480px]">{body}</DialogContent>
      </Dialog>
    </div>
  )
}

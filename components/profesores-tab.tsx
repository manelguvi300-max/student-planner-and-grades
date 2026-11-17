"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Pencil, Trash2, Mail, Phone, MapPin, Clock, Search, UserPlus, Check, Users, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { subjectsOf, type ClassSession, type Subject, type Teacher } from "@/lib/horario-data"
import { Avatar, CopyButton, TeacherForm, deleteTeacher, saveTeacher, slotText, teacherColor, toggleAssign, type TeacherOps } from "./teacher-parts"
import { AsesoriasView } from "./asesorias-view"

export type ProfesoresRequest = { kind: "new" } | { kind: "open"; teacherId: string }

type Props = {
  teachers: Teacher[]
  setTeachers: TeacherOps["setTeachers"]
  subjects: Subject[]
  setSubjects: TeacherOps["setSubjects"]
  classes: ClassSession[]
  setClasses: TeacherOps["setClasses"]
  timeLabel: (min: number) => string
  nowMin: number | null
  todayIdx: number
  request: ProfesoresRequest | null
  onRequestHandled: () => void
  onOpenSubject: (subjectId: string) => void
}

type Dlg = { view: "detail" | "form"; teacherId?: string; fresh?: boolean }

const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

export function ProfesoresTab({ teachers, setTeachers, subjects, setSubjects, classes, setClasses, timeLabel, nowMin, todayIdx, request, onRequestHandled, onOpenSubject }: Props) {
  const ops: TeacherOps = { subjects, setSubjects, setTeachers, setClasses }
  const [mode, setMode] = useState<"directorio" | "asesorias">("directorio")
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [query, setQuery] = useState("")

  const hasOfficeHours = teachers.some((t) => t.slots?.length)
  const view = hasOfficeHours ? mode : "directorio"

  useEffect(() => {
    if (!request) return
    setConfirmDelete(false)
    setMode("directorio")
    setDlg(request.kind === "new" ? { view: "form" } : { view: "detail", teacherId: request.teacherId })
    onRequestHandled()
  }, [request, onRequestHandled])

  const sorted = useMemo(() => [...teachers].sort((a, b) => a.name.localeCompare(b.name, "es")), [teachers])
  const shown = query.trim() ? sorted.filter((t) => norm(`${t.name} ${t.role ?? ""} ${subjectsOf(t.id, subjects).map((s) => s.name).join(" ")}`).includes(norm(query.trim()))) : sorted
  const current = dlg?.teacherId ? teachers.find((t) => t.id === dlg.teacherId) : undefined
  const close = () => { setDlg(null); setConfirmDelete(false) }
  const open = (next: Dlg) => { setConfirmDelete(false); setDlg(next) }

  function onSave(data: Omit<Teacher, "id">, subjectIds: string[]) {
    const id = saveTeacher(ops, current?.id, data, subjectIds)
    open({ view: "detail", teacherId: id, fresh: !current })
  }

  /* ── tarjeta de la lista ── */
  const card = (t: Teacher) => {
    const own = subjectsOf(t.id, subjects)
    return (
      <div key={t.id} className="animate-pop flex items-center gap-2 rounded-2xl border bg-card p-3 shadow-(--card-shadow) transition duration-200 hover:border-foreground/25">
        <button type="button" onClick={() => open({ view: "detail", teacherId: t.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]">
          <Avatar name={t.name} color={teacherColor(t, subjects)} size="size-11" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-semibold leading-tight">{t.name || "Sin nombre"}</span>
              {t.slots && t.slots.length > 0 && <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Tiene asesorías" />}
            </span>
            <span className={cn("block truncate text-xs", own.length ? "text-muted-foreground" : "italic text-muted-foreground/70")}>
              {[t.role, own.map((s) => s.name).join(", ") || "Sin materia asignada"].filter(Boolean).join(" · ")}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 gap-1.5">
          {t.email && <a href={`mailto:${t.email}`} aria-label={`Escribir a ${t.name}`} title={t.email} className="tap grid size-9 place-items-center rounded-xl bg-foreground/[0.06] text-muted-foreground transition hover:bg-foreground/[0.12] hover:text-foreground"><Mail className="size-4" /></a>}
          {t.phone && <a href={`tel:${t.phone.replace(/\s/g, "")}`} aria-label={`Llamar a ${t.name}`} title={t.phone} className="tap grid size-9 place-items-center rounded-xl bg-foreground/[0.06] text-muted-foreground transition hover:bg-foreground/[0.12] hover:text-foreground"><Phone className="size-4" /></a>}
        </div>
      </div>
    )
  }

  /* ── contenido del diálogo ── */
  let body: React.ReactNode = null
  if (dlg?.view === "form") {
    body = (
      <>
        <DialogHeader className="space-y-1">
          <DialogTitle>{current ? "Editar profesor" : "Nuevo profesor"}</DialogTitle>
          <DialogDescription>{current ? "Cambia sus datos o las materias que da." : "Guarda sus datos y, si quieres, elige qué materias da."}</DialogDescription>
        </DialogHeader>
        <TeacherForm key={current?.id ?? "new"} teacher={current} subjects={subjects} timeLabel={timeLabel} onSave={onSave}
          onCancel={() => (current ? open({ view: "detail", teacherId: current.id }) : close())} />
      </>
    )
  } else if (dlg?.view === "detail" && current) {
    const t = current
    const own = subjectsOf(t.id, subjects)
    const color = teacherColor(t, subjects)
    const row = (icon: React.ReactNode, content: React.ReactNode, copy?: { text: string; label: string }) => (
      <div className="flex min-h-9 items-center gap-3 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1 break-words">{content}</span>
        {copy && <CopyButton text={copy.text} label={copy.label} />}
      </div>
    )
    const hasContact = t.email || t.phone || t.office
    body = (
      <>
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Avatar name={t.name} color={color} size="size-12" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="line-clamp-2 break-words text-lg leading-snug">{t.name || "Sin nombre"}</DialogTitle>
              {t.role && <span className="mt-0.5 inline-block rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/80">{t.role}</span>}
            </div>
            <button type="button" onClick={() => open({ view: "form", teacherId: t.id })} aria-label="Editar profesor" title="Editar"
              className="tap mr-6 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground">
              <Pencil className="size-4" />
            </button>
          </div>
          <DialogDescription className="sr-only">Datos de contacto, asesorías y materias de {t.name}</DialogDescription>
        </DialogHeader>

        {dlg.fresh && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">¡Profesor guardado!</p>}

        <section className="space-y-1 rounded-2xl border bg-card p-3">
          {hasContact ? (
            <>
              {t.email && row(<Mail className="size-4" />, <a href={`mailto:${t.email}`} className="underline-offset-4 hover:underline">{t.email}</a>, { text: t.email, label: "Copiar correo" })}
              {t.phone && row(<Phone className="size-4" />, <a href={`tel:${t.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">{t.phone}</a>, { text: t.phone, label: "Copiar teléfono" })}
              {t.office && row(<MapPin className="size-4" />, t.office)}
            </>
          ) : (
            <button type="button" onClick={() => open({ view: "form", teacherId: t.id })} className="w-full rounded-xl border border-dashed py-2.5 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
              Agregar correo, teléfono u oficina
            </button>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asesorías</h3>
          {t.slots && t.slots.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {t.slots.map((sl) => (
                <span key={sl.id} className="num rounded-full px-2.5 py-1 text-xs font-medium text-neutral-900" style={{ backgroundColor: color.bg, boxShadow: `inset 0 0 0 1px ${color.border}` }}>{slotText(sl, timeLabel)}</span>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => open({ view: "form", teacherId: t.id })} className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              <Plus className="size-3.5" />Agregar horario de asesoría
            </button>
          )}
          {t.hours && <p className="text-xs text-muted-foreground">{t.hours}</p>}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Materias que da</h3>
          {subjects.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no tienes materias. Créalas en la pestaña Materias.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const on = own.some((x) => x.id === s.id)
                  return (
                    <button key={s.id} type="button" aria-pressed={on} onClick={() => toggleAssign(ops, t.id, s.id, !on)}
                      className={cn("flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95", on ? "text-neutral-900" : "text-muted-foreground hover:text-foreground")}
                      style={on ? { backgroundColor: s.bg, borderColor: s.border } : undefined}>
                      {on ? <Check className="size-3.5 shrink-0" /> : <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.bg, boxShadow: `0 0 0 1.5px ${s.border}` }} />}
                      <span className="truncate">{s.name}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Toca una materia para asignarla o quitarla.</p>
              {own.length > 0 && (
                <button type="button" onClick={() => { close(); onOpenSubject(own[0].id) }} className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  <BookOpen className="size-3.5" />Ver {own[0].name}
                </button>
              )}
            </>
          )}
        </section>

        <div className="border-t pt-3">
          {confirmDelete ? (
            <div className="space-y-2.5 rounded-xl bg-destructive/10 p-3 text-sm">
              <p>Se eliminará a <b>{t.name}</b> de tus profesores y de las clases donde estaba asignado. No se puede deshacer.</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                <Button size="sm" variant="destructive" onClick={() => { deleteTeacher(ops, t.id); close() }}>Eliminar profesor</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-destructive">
              <Trash2 className="size-3.5" />Eliminar profesor
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {teachers.length === 0 ? (
        <div className="animate-scale-in rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-foreground/10"><Users className="size-6" /></div>
          <h3 className="text-lg font-semibold">Aún no tienes profesores</h3>
          <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-muted-foreground">Guarda su correo, teléfono y horario de asesorías para tenerlos a un toque. Después los asignas a sus materias.</p>
          <Button onClick={() => open({ view: "form" })}><UserPlus className="size-4" />Agregar primer profesor</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {hasOfficeHours ? (
              <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 text-xs font-medium" role="group" aria-label="Vista de profesores">
                {([["directorio", "Directorio"], ["asesorias", "Asesorías"]] as const).map(([m, label]) => (
                  <button key={m} type="button" aria-pressed={view === m} onClick={() => setMode(m)}
                    className={cn("rounded-md px-3 py-1.5 transition", view === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{label}</button>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Tus profesores y sus datos, a un toque.</p>}
            <Button size="sm" onClick={() => open({ view: "form" })} className="shrink-0 rounded-full"><Plus className="size-4" />Profesor</Button>
          </div>

          {view === "asesorias" ? (
            <AsesoriasView teachers={teachers} subjects={subjects} nowMin={nowMin} todayIdx={todayIdx} timeLabel={timeLabel} onOpen={(id) => open({ view: "detail", teacherId: id })} />
          ) : (
            <>
              {teachers.length > 5 && (
                <div className="flex items-center gap-2 rounded-xl border bg-card px-3">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar profesor o materia…" aria-label="Buscar profesor"
                    className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                </div>
              )}
              {shown.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Ningún profesor coincide con «{query.trim()}».</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{shown.map(card)}</div>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={dlg !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-[480px]">{body}</DialogContent>
      </Dialog>
    </div>
  )
}

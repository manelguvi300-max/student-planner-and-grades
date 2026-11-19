"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { Plus, CalendarDays, GraduationCap, Download, Users, CalendarPlus, Share } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSheetBack } from "@/lib/use-sheet-back"
import { downloadIcs, nextWeekday } from "@/lib/ics"
import { Button } from "@/components/ui/button"
import {
  DAYS,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  getSubject,
  teachersOf,
  hourLabel,
  minutesToLabel,
  type Absence,
  type ClassSession,
  type Exam,
  type Grade,
  type Subject,
  type SubjectConfig,
  type Teacher,
} from "@/lib/horario-data"
import { ClaseDialog, type ClassDialogState } from "./clase-dialog"
import { MateriasTab, type MateriasRequest } from "./materias-tab"
import { ProfesoresTab, type ProfesoresRequest } from "./profesores-tab"
import { ROW_PX, useSettings } from "@/lib/settings"
import { Fab } from "@/components/fab"
import { cn } from "@/lib/utils"
import { HorarioPrint } from "./horario-print"

// Espacio reservado arriba/abajo del grid para que las etiquetas de hora
// nunca se encimen con el encabezado de días ni se corten al final
const GRID_PAD_TOP = 14
const GRID_PAD_BOTTOM = 6

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
  setTeachers: (u: Teacher[] | ((prev: Teacher[]) => Teacher[])) => void
}

/** Minutos desde medianoche "ahora", refrescado cada 30 s (null hasta montar, para no romper la hidratación). */
function useNowMinutes() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => { const d = new Date(); setNow(d.getHours() * 60 + d.getMinutes()) }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function HorarioTab({ subjects, setSubjects, classes, setClasses, setGrades, setExams, setAbsences, setSubjectConfigs, teachers, setTeachers }: Props) {
  const { settings } = useSettings()
  const PX_PER_HOUR = ROW_PX[settings.rowHeight]
  const timeLabel = (minutes: number) => minutesToLabel(minutes, settings.timeFormat)
  const nowMin = useNowMinutes()
  const todayIdx = new Date().getDay() - 1 // 0=Lunes … 4=Viernes; -1 / 5 = fin de semana
  const [dialog, setDialog] = useState<ClassDialogState | null>(null)
  const [view, setView] = useState<"semana" | "materias" | "profesores">("semana")
  const [request, setRequest] = useState<MateriasRequest | null>(null)
  const [teacherRequest, setTeacherRequest] = useState<ProfesoresRequest | null>(null)
  const clearRequest = useCallback(() => setRequest(null), [])
  const clearTeacherRequest = useCallback(() => setTeacherRequest(null), [])
  const [selectedMobileDay, setSelectedMobileDay] = useState(() => {
    // 0=Domingo, 1=Lunes ... 6=Sábado (estándar de JS Date)
    const jsDay = new Date().getDay()
    // Nuestro arreglo DAYS es Lunes(0)…Viernes(4). Si es fin de semana, caemos en Lunes.
    if (jsDay === 0 || jsDay === 6) return 0
    return jsDay - 1
  })
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY

    const diffX = touchStartX.current - touchEndX
    const diffY = touchStartY.current - touchEndY

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setSelectedMobileDay((prev) => Math.min(prev + 1, DAYS.length - 1))
      } else {
        setSelectedMobileDay((prev) => Math.max(prev - 1, 0))
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Calcular rango horario dinámico
  const { gridStartMin, gridEndMin, hours } = useMemo(() => {
    const startH = DEFAULT_START_HOUR
    let endH = DEFAULT_END_HOUR

    if (classes.length > 0) {
      const maxEnd = Math.max(...classes.map((c) => c.endTime))
      const maxEndHour = Math.ceil(maxEnd / 60)
      const desiredEndH = maxEndHour + 1 // siempre 1 hora extra en blanco tras la última clase
      if (desiredEndH > endH) endH = desiredEndH
    }

    const startMin = startH * 60
    const endMin = endH * 60
    const hrs: number[] = []
    for (let h = startH; h <= endH; h++) hrs.push(h)

    return { gridStartMin: startMin, gridEndMin: endMin, hours: hrs }
  }, [classes])

  const totalMinutes = gridEndMin - gridStartMin
  const gridHeight = (totalMinutes / 60) * PX_PER_HOUR + GRID_PAD_TOP + GRID_PAD_BOTTOM

  function minutesToPx(minutes: number) {
    return ((minutes - gridStartMin) / 60) * PX_PER_HOUR + GRID_PAD_TOP
  }

  function durationPx(startTime: number, endTime: number) {
    return ((endTime - startTime) / 60) * PX_PER_HOUR
  }

  /** Línea roja de "ahora" solo en la columna del día de hoy. */
  function nowLine(dayIndex: number) {
    if (nowMin === null || dayIndex !== todayIdx || nowMin < gridStartMin || nowMin > gridEndMin) return null
    return (
      <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: minutesToPx(nowMin) }}>
        <span className="size-2 shrink-0 -translate-x-1 animate-glow rounded-full bg-destructive" />
        <span className="h-px flex-1 bg-destructive/70" />
      </div>
    )
  }

  function openNew(subjectId?: string) {
    setDialog({ day: selectedMobileDay, startMin: 6 * 60, subjectId })
  }

  /** Nueva clase en un día y hora concretos (clic en un hueco de la semana). */
  function openNewAt(day: number, startMin: number) {
    setDialog({ day, startMin })
  }

  /** Hora (redondeada hacia abajo) bajo el cursor dentro de una columna de día. */
  function slotAt(e: React.MouseEvent<HTMLDivElement>) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top - GRID_PAD_TOP
    const hour = Math.floor(gridStartMin / 60 + y / PX_PER_HOUR)
    return Math.max(gridStartMin / 60, Math.min(hour, gridEndMin / 60 - 1)) * 60
  }
  function hoverSlot(e: React.MouseEvent<HTMLDivElement>, day: number) {
    if (subjects.length === 0 || (e.target as HTMLElement).closest("button")) return setGhost(null)
    const min = slotAt(e)
    setGhost((g) => (g && g.day === day && g.min === min ? g : { day, min }))
  }
  function clickSlot(e: React.MouseEvent<HTMLDivElement>, day: number) {
    if (subjects.length === 0) return
    openNewAt(day, slotAt(e))
  }

  function openEdit(c: ClassSession) {
    setDialog({ cls: c, day: c.day, startMin: c.startTime })
  }


  function classesForDay(day: number) {
    return classes.filter((c) => c.day === day).sort((a, b) => a.startTime - b.startTime)
  }


  const DAY_SHORT = ["L", "M", "Mi", "J", "V"]
  const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"]
  const spring = "cubic-bezier(.34,1.4,.5,1)"

  // Subject resaltada (toca un chip para atenuar las demás) y vista móvil (lista o cuadrícula de horas)
  const [mobileView, setMobileView] = useState<"lista" | "horas">("lista")
  // fantasma "+" al pasar el cursor por un hueco de la semana (escritorio): clic = nueva clase ahí
  const [ghost, setGhost] = useState<{ day: number; min: number } | null>(null)

  const tabs = [
    ["semana", "Semana", CalendarDays],
    ["materias", "Materias", GraduationCap],
    ["profesores", "Profesores", Users],
  ] as const

  const totalHours = classes.reduce((n, c) => n + (c.endTime - c.startTime), 0) / 60
  const durText = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`)

  // número de día de la semana en curso (si es fin de semana, la siguiente); solo tras montar
  const mounted = nowMin !== null
  const weekDates = useMemo(() => {
    if (!mounted) return null
    const d = new Date()
    const js = d.getDay()
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((js + 6) % 7) + (js === 0 || js === 6 ? 7 : 0))
    return DAYS.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).getDate())
  }, [mounted])

  /** Nombre del profesor que da esta clase (si se asignó). */
  function teacherOf(c: ClassSession) {
    const sub = getSubject(subjects, c.subjectId)
    return sub ? teachersOf(sub, teachers).find((t) => t.id === c.teacherId)?.name : undefined
  }

  function stateOf(c: ClassSession): "live" | "done" | "next" {
    if (nowMin === null || c.day !== todayIdx) return "next"
    return c.endTime <= nowMin ? "done" : c.startTime <= nowMin ? "live" : "next"
  }

  /** Bloque de clase: color plano de la materia y barra lateral (sin sombras ni degradados). */
  function block(c: ClassSession, mobile: boolean, delay = 0) {
    const subject = getSubject(subjects, c.subjectId)
    if (!subject) return null
    const st = stateOf(c)
    const h = Math.max(durationPx(c.startTime, c.endTime) - 3, mobile ? 26 : 28)
    const compact = h < (mobile ? 42 : 46)
    return (
      <button
        key={c.id}
        onClick={(e) => { e.stopPropagation(); openEdit(c) }}
        aria-label={`${subject.name}, ${timeLabel(c.startTime)} a ${timeLabel(c.endTime)}`}
        title={[subject.name, `${timeLabel(c.startTime)}–${timeLabel(c.endTime)}`, c.room, c.group && `Grupo ${c.group}`, teacherOf(c)].filter(Boolean).join(" · ")}
        className={cn(
          "absolute left-1.5 right-1.5 cursor-pointer overflow-hidden rounded-lg py-1.5 pl-3 pr-2 text-left text-[11px] leading-tight text-neutral-900 transition duration-300 ease-out",
          "shadow-[inset_3px_0_0_var(--c)] hover:z-20 hover:brightness-[0.96] active:scale-[0.98] lg:py-2 lg:pl-3.5",
          !mobile && "animate-pop",
          st === "done" && "opacity-50",
          st === "live" && "z-10 ring-2 ring-foreground/60",
        )}
        style={{ "--c": subject.border, top: minutesToPx(c.startTime) + 1, height: h, backgroundColor: subject.bg, animationDelay: `${delay}ms` } as React.CSSProperties}
      >
        {st === "live" && <span aria-hidden className="absolute top-2 right-2 size-1.5 animate-glow rounded-full bg-emerald-600" />}
        <p className="truncate pr-2 text-xs font-semibold lg:text-[13px]">{subject.name}</p>
        {!compact && <p className="num mt-0.5 text-[10px] opacity-70 lg:text-[11px]">{timeLabel(c.startTime)}–{timeLabel(c.endTime)}</p>}
        {!compact && c.room && (mobile || h >= 60) && <p className="mt-0.5 truncate text-[10px] opacity-70 lg:text-[11px]">{c.room}</p>}
        {!mobile && h >= 96 && teacherOf(c) && <p className="mt-0.5 hidden truncate text-[11px] opacity-70 lg:block">{teacherOf(c)}</p>}
      </button>
    )
  }

  /** Abre el diálogo de impresión con solo el horario (ahí eliges "Guardar como PDF"). */
  function exportPdf() {
    const title = document.title
    document.title = "Mi horario"
    window.print()
    document.title = title
  }

  /** Cada clase como evento semanal (16 semanas, lo típico de un semestre; se puede recortar en el calendario). */
  function exportIcs() {
    downloadIcs("horario.ics", classes.map((c) => {
      const subject = subjects.find((s) => s.id === c.subjectId)
      return {
        uid: c.id, title: subject?.name ?? "Clase", date: nextWeekday(c.day), startMin: c.startTime, endMin: c.endTime,
        location: c.room || undefined, description: c.group ? `Grupo ${c.group}` : undefined, weeklyCount: 16,
      }
    }))
  }

  const [exportOpen, setExportOpen] = useState(false)
  useSheetBack(exportOpen, () => setExportOpen(false))

  const dayList = classesForDay(selectedMobileDay)
  const dayHours = dayList.reduce((n, c) => n + (c.endTime - c.startTime), 0) / 60

  return (
    <div className="space-y-5 pb-16 animate-fade-in md:pb-0">
      {mounted && <HorarioPrint subjects={subjects} classes={classes} format={settings.timeFormat} />}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="gap-4 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar horario</DialogTitle>
            <DialogDescription>Lleva tus clases a otro lugar.</DialogDescription>
          </DialogHeader>
          <div className="divide-y overflow-hidden rounded-2xl border">
            {[
              { Icon: CalendarPlus, title: "Agregar a mi calendario", sub: "Google, Apple u Outlook · se repite 16 semanas", run: exportIcs },
              { Icon: Download, title: "Guardar como PDF", sub: "Para imprimir o compartir", run: exportPdf },
            ].map(({ Icon, title, sub, run }) => (
              <button key={title} type="button" onClick={() => { setExportOpen(false); setTimeout(run, 250) }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/60 active:bg-muted">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-muted-foreground">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Cabecera (en PC: título · pestañas · acciones en una fila) */}
      <div className="space-y-5 lg:flex lg:items-center lg:gap-6 lg:space-y-0">
      <header className="flex items-end justify-between gap-3 lg:contents">
        <div className="min-w-0 lg:mr-auto">
          <h2 className="text-xl font-semibold tracking-tight">{view === "semana" ? "Mi horario" : view === "materias" ? "Mis materias" : "Mis profesores"}</h2>
          <p className="num hidden text-sm text-muted-foreground md:block">
            {view === "materias"
              ? `${subjects.length} materia${subjects.length === 1 ? "" : "s"}`
              : view === "profesores"
              ? `${teachers.length} profesor${teachers.length === 1 ? "" : "es"}`
              : classes.length === 0 ? "Toca una clase para editarla." : `${classes.length} clase${classes.length === 1 ? "" : "s"} · ${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)} h por semana`}
          </p>
        </div>
        {view === "materias" && subjects.length > 0 && (
          <Button onClick={() => setRequest({ kind: "new" })} size="sm" className="hidden shrink-0 rounded-full md:inline-flex lg:order-3"><Plus className="mr-1 size-4" /> Materia</Button>
        )}
        {view === "profesores" && teachers.length > 0 && (
          <Button onClick={() => setTeacherRequest({ kind: "new" })} size="sm" className="hidden shrink-0 rounded-full md:inline-flex lg:order-3"><Plus className="mr-1 size-4" /> Profesor</Button>
        )}
        {view === "semana" && (
          <div className="flex items-center gap-2 lg:order-3">
            {/* Un solo botón para sacar el horario de la app: calendario o PDF */}
            {classes.length > 0 && (
              <Button onClick={() => setExportOpen(true)} variant="outline" size="sm" aria-label="Exportar horario" className="rounded-full">
                <Share className="size-4 sm:mr-1" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            )}
            <Button onClick={() => openNew()} size="sm" className="hidden rounded-full md:inline-flex" disabled={subjects.length === 0}>
              <Plus className="mr-1 size-4" /> Clase
            </Button>
          </div>
        )}
      </header>
      {/* Semana | Materias | Profesores */}
      <div className={cn("relative grid rounded-xl bg-muted p-1 text-sm font-medium sm:inline-grid lg:order-2", "grid-cols-3 sm:w-[26rem] lg:w-[24rem]")} role="tablist" aria-label="Sección del horario">
        <span aria-hidden className="absolute inset-y-1 left-1 rounded-lg bg-background shadow-sm ring-1 ring-border/60" style={{ width: `calc((100% - 0.5rem) / ${tabs.length})`, transform: `translateX(${Math.max(0, tabs.findIndex((t) => t[0] === view)) * 100}%)`, transition: `transform .4s ${spring}` }} />
        {tabs.map(([v, label, Icon]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => { setRequest(null); setTeacherRequest(null); setView(v) }}
            className={cn("relative flex items-center justify-center gap-1.5 rounded-lg py-2 transition-colors active:scale-95", view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="size-4 max-[350px]:hidden" />{label}
          </button>
        ))}
      </div>
      </div>
      {/* Móvil: agregar con el botón flotante, como en la agenda */}
      {view === "semana" && classes.length > 0 && <Fab label="Nueva clase" onClick={() => openNew()} disabled={subjects.length === 0} />}
      {view === "materias" && subjects.length > 0 && <Fab label="Nueva materia" onClick={() => setRequest({ kind: "new" })} />}
      {view === "profesores" && teachers.length > 0 && <Fab label="Nuevo profesor" onClick={() => setTeacherRequest({ kind: "new" })} />}


      {view === "profesores" ? (
        <ProfesoresTab
          teachers={teachers}
          setTeachers={setTeachers}
          subjects={subjects}
          setSubjects={setSubjects}
          classes={classes}
          setClasses={setClasses}
          timeLabel={timeLabel}
          nowMin={nowMin}
          todayIdx={todayIdx}
          request={teacherRequest}
          onRequestHandled={clearTeacherRequest}
          onOpenSubject={(subjectId) => { setRequest({ kind: "open", subjectId }); setView("materias") }}
        />
      ) : view === "materias" ? (
        <MateriasTab
          subjects={subjects}
          setSubjects={setSubjects}
          classes={classes}
          setClasses={setClasses}
          setGrades={setGrades}
          setExams={setExams}
          setAbsences={setAbsences}
          setSubjectConfigs={setSubjectConfigs}
          teachers={teachers}
          setTeachers={setTeachers}
          timeLabel={timeLabel}
          onAddClass={(subjectId) => openNew(subjectId)}
          onEditClass={openEdit}
          onOpenTeacher={(teacherId) => { setTeacherRequest({ kind: "open", teacherId }); setView("profesores") }}
          request={request}
          onRequestHandled={clearRequest}
        />
      ) : (
        <>
      {classes.length === 0 && (
        <div className="animate-scale-in rounded-xl border-2 border-dashed bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-xl bg-foreground/10">
            <CalendarDays className="size-6" />
          </div>
          <h3 className="text-lg font-semibold">Tu horario está vacío</h3>
          <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-muted-foreground">
            {subjects.length === 0
              ? "Primero crea tus materias; después las ubicas en la semana."
              : "Agrega tu primera clase para empezar a organizar tu semestre."}
          </p>
          {subjects.length === 0 ? (
            <Button onClick={() => { setRequest({ kind: "new" }); setView("materias") }}>Crear primera materia</Button>
          ) : (
            <Button onClick={() => openNew()}>Agregar primera clase</Button>
          )}
        </div>
      )}

      {classes.length > 0 && (
        <>
          {/* ───────── Móvil ───────── */}
          <div className="space-y-4 sm:hidden">
            {/* Selector de día con fecha y puntos de "hay clases" */}
            <div className="relative grid grid-cols-5">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-lg bg-foreground/[0.08]"
                style={{ width: "20%", transform: `translateX(${selectedMobileDay * 100}%)`, transition: `transform .45s ${spring}` }}
              />
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedMobileDay(i)}
                  aria-label={d}
                  aria-pressed={selectedMobileDay === i}
                  className="relative flex select-none flex-col items-center gap-0.5 rounded-lg py-1.5 active:scale-95"
                >
                  <span className={cn("text-[10px] font-medium uppercase transition-colors", selectedMobileDay === i ? "text-foreground" : "text-muted-foreground")}>{SHORT[i]}</span>
                  <span className={cn("num grid size-7 place-items-center rounded-full text-sm font-semibold transition-colors", i === todayIdx && "bg-primary text-primary-foreground")}>
                    {weekDates?.[i] ?? "·"}
                  </span>
                  <span className={cn("size-1.5 rounded-full", classesForDay(i).length ? "bg-muted-foreground/60" : "bg-transparent")} />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="num min-w-0 truncate text-sm text-muted-foreground">
                <b className="font-semibold text-foreground">{DAYS[selectedMobileDay]}</b>
                {` · ${dayList.length} clase${dayList.length === 1 ? "" : "s"}${dayList.length ? ` · ${Number.isInteger(dayHours) ? dayHours : dayHours.toFixed(1)} h` : ""}`}
              </p>
              <div className="flex shrink-0 gap-1 rounded-lg bg-muted p-0.5 text-xs font-medium" role="group" aria-label="Tipo de vista">
                {(["lista", "horas"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={mobileView === v}
                    onClick={() => setMobileView(v)}
                    className={cn("rounded-md px-3 py-1.5 capitalize transition", mobileView === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div key={selectedMobileDay} className="animate-rise touch-pan-y" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {mobileView === "lista" ? (
                dayList.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
                    Sin clases este día.
                    {subjects.length > 0 && (
                      <button type="button" onClick={() => openNew()} className="mt-3 block w-full text-foreground underline underline-offset-4">Agregar una clase</button>
                    )}
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {dayList.map((c, i) => {
                      const subject = getSubject(subjects, c.subjectId)
                      if (!subject) return null
                      const st = stateOf(c)
                      const prev = dayList[i - 1]
                      const gap = prev ? c.startTime - prev.endTime : 0
                      const pct = st === "live" && nowMin !== null ? Math.round(((nowMin - c.startTime) / (c.endTime - c.startTime)) * 100) : 0
                      return (
                        <li key={c.id}>
                          {gap >= 30 && (
                            <div className="my-2.5 flex items-center gap-3 pl-1 text-[11px] text-muted-foreground">
                              <span className="h-px w-5 bg-border" />
                              <span className="num">Libre · {durText(gap)}</span>
                              <span className="h-px flex-1 bg-border" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className={cn(
                              "flex w-full items-stretch gap-3 rounded-xl border bg-card p-3 text-left transition duration-300 active:scale-[0.99]",
                              st === "done" && "opacity-55",
                              st === "live" && "border-foreground/40 shadow-(--card-shadow)",
                            )}
                          >
                            <span className="num flex w-[4.75rem] shrink-0 flex-col justify-between text-xs">
                              <b className="font-semibold">{timeLabel(c.startTime)}</b>
                              <span className="text-muted-foreground">{timeLabel(c.endTime)}</span>
                            </span>
                            <span className="w-1 shrink-0 rounded-full" style={{ background: subject.border }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{subject.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {[c.room, teacherOf(c), durText(c.endTime - c.startTime)].filter(Boolean).join(" · ")}
                              </span>
                              {st === "live" && (
                                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-foreground/10">
                                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: subject.border }} />
                                </span>
                              )}
                            </span>
                            {st === "live" && <span className="h-fit shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">En curso</span>}
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="flex overflow-hidden">
                    <div className="relative w-12 shrink-0 border-r bg-muted/20" style={{ height: gridHeight }}>
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="num absolute right-0 left-0 flex items-start justify-end pr-2 text-[10px] font-medium text-muted-foreground"
                          style={{ top: minutesToPx(h * 60) - 6 }}
                        >
                          {hourLabel(h, settings.timeFormat)}
                        </div>
                      ))}
                    </div>
                    <div className="relative flex-1" style={{ height: gridHeight }}>
                      {hours.map((h) => (
                        <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: minutesToPx(h * 60) }} />
                      ))}
                      {nowLine(selectedMobileDay)}
                      {dayList.map((c) => block(c, true))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ───────── Tablet / escritorio: semana completa ───────── */}
          <div className="relative hidden animate-slide-up overflow-x-auto rounded-2xl border bg-card sm:block">
            <div className="relative min-w-[600px]">
              {/* Días */}
              <div className="flex px-1 pt-2 pb-1.5">
                <div className="w-[4.5rem] shrink-0" />
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedMobileDay(i)}
                    className="group mx-0.5 flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 transition duration-300 hover:bg-foreground/[0.06] active:scale-[0.97]"
                  >
                    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors", i === todayIdx ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{SHORT[i]}</span>
                    <span className={cn("num grid size-7 place-items-center rounded-full text-sm font-semibold transition-transform duration-300 group-hover:scale-110", i === todayIdx && "bg-primary text-primary-foreground")}>
                      {weekDates?.[i] ?? ""}
                    </span>
                  </button>
                ))}
              </div>

              {/* Cuadrícula */}
              <div className="flex overflow-hidden border-t" style={{ height: gridHeight }}>
                <div className="relative w-[4.5rem] shrink-0">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="num absolute right-0 left-0 flex items-start justify-end pr-3 text-[11px] text-muted-foreground/80"
                      style={{ top: minutesToPx(h * 60) - 7 }}
                    >
                      {hourLabel(h, settings.timeFormat)}
                    </div>
                  ))}
                  {nowMin !== null && todayIdx >= 0 && todayIdx <= 4 && nowMin >= gridStartMin && nowMin <= gridEndMin && (
                    <span className="num absolute right-1.5 z-10 -translate-y-1/2 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white shadow" style={{ top: minutesToPx(nowMin) }}>
                      {timeLabel(nowMin)}
                    </span>
                  )}
                </div>

                {DAYS.map((d, dayIndex) => (
                  <div
                    key={d}
                    className={cn("relative flex-1 border-l border-border/50", subjects.length > 0 && "cursor-cell")}
                    onMouseMove={(e) => hoverSlot(e, dayIndex)}
                    onMouseLeave={() => setGhost(null)}
                    onClick={(e) => clickSlot(e, dayIndex)}
                  >
                    {dayIndex === todayIdx && (
                      <div aria-hidden className="pointer-events-none absolute inset-x-1 inset-y-0 rounded-xl bg-foreground/[0.04]" />
                    )}
                    {hours.map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-t border-dashed border-border/40" style={{ top: minutesToPx(h * 60) }} />
                    ))}
                    {nowLine(dayIndex)}
                    {ghost?.day === dayIndex && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute right-1.5 left-1.5 z-[5] grid animate-fade-in place-items-center rounded-lg border border-dashed border-foreground/30 bg-foreground/[0.04] text-xs text-muted-foreground"
                        style={{ top: minutesToPx(ghost.min) + 1, height: PX_PER_HOUR * 2 - 3 }}
                      >
                        <span className="num flex items-center gap-1"><Plus className="size-3.5" />{timeLabel(ghost.min)}</span>
                      </div>
                    )}
                    {classesForDay(dayIndex).map((c, i) => block(c, false, dayIndex * 70 + i * 60))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
        </>
      )}

      <ClaseDialog
        state={dialog}
        onClose={() => setDialog(null)}
        teachers={teachers}
        subjects={subjects}
        setSubjects={setSubjects}
        classes={classes}
        setClasses={setClasses}
        timeLabel={timeLabel}
      />
    </div>
  )
}
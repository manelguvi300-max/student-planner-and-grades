"use client"

import { useEffect, useState } from "react"
import { ArrowRight, GraduationCap, Play, Timer, UserX } from "lucide-react"
import { Ring } from "@/components/ui/ring"
import { dailyGoalOf, focusStats, fmtMin } from "@/components/focus"
import { cn } from "@/lib/utils"
import { useSettings } from "@/lib/settings"
import {
  DAYS,
  findKind,
  kindsFromConfigs,
  KIND_COLORS,
  PASSING_GRADE,
  goalPlan,
  absenceStatus,
  fmtHours,
  GLOBAL_CONFIG_KEY,
  averageOf,
  coveredWeight,
  getSubject,
  minutesToLabel,
  studyFromConfigs,
  type Absence,
  type ClassSession,
  type Exam,
  type Grade,
  type Subject,
  type SubjectConfig,
} from "@/lib/horario-data"

type Props = {
  subjects: Subject[]
  classes: ClassSession[]
  grades: Record<string, Grade[]>
  exams: Exam[]
  absences: Absence[]
  subjectConfigs: Record<string, SubjectConfig>
  hiddenNotas: string[]
  onNavigate: (tab: string) => void
  onFocus: () => void
}

const fmtDur = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`)
const dateOf = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d) }

/** Fecha/hora actual, refrescada cada 30 s. null hasta montar (evita diferencias servidor/cliente). */
function useNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Encabezado pequeño de cada bloque, con un enlace opcional a la pestaña completa */
function Heading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="tap group flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
          {action}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  )
}

const card = "overflow-hidden rounded-2xl border bg-card"
const row = "w-full px-4 py-3 text-left transition hover:bg-muted/60 active:bg-muted"
const tile = "min-w-0 rounded-2xl border bg-card px-3 py-3 text-left transition hover:bg-muted/60 active:scale-[0.97]"

export function HoyTab({ subjects, classes, grades, exams, absences, subjectConfigs, hiddenNotas, onNavigate, onFocus }: Props) {
  const { settings } = useSettings()
  const now = useNow()
  const label = (m: number) => minutesToLabel(m, settings.timeFormat)

  if (!now) return <div className="skeleton h-56 rounded-2xl" />

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayIdx = now.getDay() - 1 // 0=Lunes … 4=Viernes; -1 / 5 = fin de semana
  const byStart = (a: ClassSession, b: ClassSession) => a.startTime - b.startTime
  const todays = todayIdx >= 0 && todayIdx <= 4 ? classes.filter((c) => c.day === todayIdx && getSubject(subjects, c.subjectId)).sort(byStart) : []
  const current = todays.find((c) => c.startTime <= nowMin && nowMin < c.endTime)
  const next = todays.find((c) => c.startTime > nowMin)

  // primera clase de los próximos días (cuando hoy ya no hay más)
  let later: { day: number; cls: ClassSession } | null = null
  if (!current && !next) {
    for (let off = 1; off <= 7 && !later; off++) {
      const d = (todayIdx + off + 7) % 7 // todayIdx puede ser -1 (domingo) o 5 (sábado)
      const cls = classes.filter((c) => c.day === d && getSubject(subjects, c.subjectId)).sort(byStart)[0]
      if (cls) later = { day: d, cls }
    }
  }

  // próximos eventos de la agenda
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysUntil = (s: string) => Math.round((dateOf(s).getTime() - today0) / 86_400_000)
  const upcoming = exams
    .filter((e) => !e.done && daysUntil(e.date) >= 0 && (e.subjectId === "" || getSubject(subjects, e.subjectId)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"))
  const dueLabel = (n: number) => (n === 0 ? "Hoy" : n === 1 ? "Mañana" : `En ${n} días`)

  // promedio del acumulado de las materias con notas, sin contar las ocultas en Notas
  const { avg, weighted } = averageOf(subjects.filter((s) => !hiddenNotas.includes(s.id)), grades)

  // alertas de faltas y notas
  type Alert = { id: string; level: "bad" | "warn"; subject: Subject; text: string; tab: string }
  const alerts: Alert[] = []
  let atRisk = 0
  for (const s of subjects) {
    const st = absenceStatus(subjectConfigs[s.id], subjectConfigs[GLOBAL_CONFIG_KEY], absences.filter((a) => a.subjectId === s.id))
    if (st.remaining !== null) {
      if (st.cancelled) alerts.push({ id: `f${s.id}`, level: "bad", subject: s, text: "Superaste el límite de faltas", tab: "faltas" })
      else if (st.atRisk) {
        const text = st.unit === "hours" ? `Te quedan ${fmtHours(st.remaining)} h de faltas` : st.remaining === 0 ? "No te quedan faltas disponibles" : "Te queda 1 falta disponible"
        alerts.push({ id: `f${s.id}`, level: "warn", subject: s, text, tab: "faltas" })
      }
      if (st.cancelled || st.atRisk) atRisk++
    }
    const g = grades[s.id] ?? []
    if (coveredWeight(g) > 0) {
      const plan = goalPlan(g, PASSING_GRADE)
      if (plan.state === "out" || plan.state === "lost") alerts.push({ id: `n${s.id}`, level: "bad", subject: s, text: "Con lo que falta ya no alcanzas a pasar", tab: "notas" })
      else if (plan.state === "open" && plan.needed >= 4) alerts.push({ id: `n${s.id}`, level: "warn", subject: s, text: `Necesitas ${plan.needed.toFixed(1).replace(".", ",")} de promedio en el ${plan.remaining}% que falta`, tab: "notas" })
    }
  }
  alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "bad" ? -1 : 1))

  if (subjects.length === 0 && classes.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-dashed px-6 py-14 text-center">
        <h2 className="text-lg font-semibold">Empecemos tu semestre</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Crea tus materias y clases en el horario; aquí verás qué sigue cada día, tu agenda y los avisos importantes.</p>
        <button
          type="button"
          onClick={() => onNavigate("horario")}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
        >
          Ir al horario <ArrowRight className="size-4" />
        </button>
      </div>
    )
  }

  // ── Lo que toca ahora ──
  const heroCls = current ?? next ?? later?.cls
  const heroSubject = heroCls ? getSubject(subjects, heroCls.subjectId) : undefined
  const pct = current ? Math.round(((nowMin - current.startTime) / (current.endTime - current.startTime)) * 100) : 0
  const heroLabel = current ? "Ahora" : next ? "Sigue" : later ? `Próxima clase · ${DAYS[later.day].toLowerCase()}` : todays.length ? "Por hoy ya terminaste" : "Hoy no tienes clases"

  // lo que queda del día después de la clase de arriba (en móvil, como línea de tiempo con los huecos libres)
  const rest = todays.filter((c) => c !== heroCls && c.endTime > nowMin)
  const nextEvent = upcoming[0]

  // estudio de hoy (modo enfoque)
  const { today: studied, streak } = focusStats(studyFromConfigs(subjectConfigs), now)
  const studyGoal = dailyGoalOf(subjectConfigs)
  const goalMet = studied >= studyGoal
  const avgText = avg === null ? "—" : avg.toFixed(2).replace(".", ",")


  return (
    <div className="animate-fade-in space-y-6">
      {/* Qué sigue (y, en móvil, lo próximo de la agenda en la misma tarjeta) */}
      <section className={cn(card, "flex")}>
        <span aria-hidden className="w-1.5 shrink-0" style={{ background: heroSubject?.border ?? "var(--border)" }} />
        <div className="min-w-0 flex-1">
          <div className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{heroLabel}</p>
            {heroCls && heroSubject ? (
              <>
                <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{heroSubject.name}</h2>
                <p className="num mt-1 text-sm text-muted-foreground">
                  {label(heroCls.startTime)} – {label(heroCls.endTime)}
                  {heroCls.room && ` · ${heroCls.room}`}
                </p>
                {current ? (
                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${pct}%`, background: heroSubject.border }} />
                    </div>
                    <p className="num mt-1.5 text-sm">Termina en {fmtDur(current.endTime - nowMin)}</p>
                  </div>
                ) : next ? (
                  <p className="num mt-3 text-sm font-medium">Empieza en {fmtDur(next.startTime - nowMin)}</p>
                ) : null}
              </>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {classes.length === 0 ? "Aún no has agregado clases al horario." : "Nada pendiente por ahora."}
              </p>
            )}
          </div>

          {nextEvent && (() => {
            const s = getSubject(subjects, nextEvent.subjectId)
            const k = findKind(kindsFromConfigs(subjectConfigs), nextEvent.kind)
            const n = daysUntil(nextEvent.date)
            const t = nextEvent.time ? ` · ${label(Number(nextEvent.time.slice(0, 2)) * 60 + Number(nextEvent.time.slice(3, 5)))}` : ""
            return (
              <button type="button" onClick={() => onNavigate("examenes")} className="flex w-full items-center gap-3 border-t px-4 py-3 text-left transition active:bg-muted lg:hidden">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">Agenda</span>
                <span className={cn("shrink-0 text-sm font-semibold", n <= 1 && "text-amber-600 dark:text-amber-400")}>{n <= 1 ? dueLabel(n) : `${n} días`}</span>
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: s ? s.border : KIND_COLORS[k.color] }} />
                <span className="min-w-0 flex-1 truncate text-sm">{nextEvent.title || s?.name || k.name}{t}</span>
                {upcoming.length > 1 && <span className="num shrink-0 text-xs text-muted-foreground">+{upcoming.length - 1}</span>}
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            )
          })()}
        </div>
      </section>

      {/* Móvil: un solo bloque. Arriba el estudio de hoy (con acceso directo a Enfoque); abajo promedio y faltas */}
      <section className={cn(card, "md:hidden")}>
        <button type="button" onClick={onFocus} className="flex w-full items-center gap-3.5 p-4 text-left transition active:bg-muted">
          <span className={cn("shrink-0", goalMet ? "text-emerald-500" : "text-brand")}>
            <Ring value={studied / studyGoal} size={52} stroke={5} className="text-current">
              <Timer className="size-5" />
            </Ring>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Estudio de hoy</span>
            <span className="num block text-xl font-semibold leading-tight">
              {fmtMin(studied)}<span className="text-sm font-normal text-muted-foreground"> de {fmtMin(studyGoal)}</span>
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {goalMet ? "¡Meta cumplida!" : `Te faltan ${fmtMin(studyGoal - studied)}`}{streak > 1 ? ` · 🔥 ${streak} días` : ""}
            </span>
          </span>
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-background">
            <Play className="size-4 translate-x-px fill-current" />
          </span>
        </button>
        <div className="grid grid-cols-2 divide-x border-t">
          <button type="button" onClick={() => onNavigate("notas")} className="flex min-w-0 items-center gap-3 px-4 py-3.5 text-left transition active:bg-muted">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground/[0.06] text-muted-foreground"><GraduationCap className="size-[18px]" /></span>
            <span className="min-w-0">
              <span className="num block text-lg font-semibold leading-tight">{avgText}</span>
              <span className="block truncate text-xs text-muted-foreground">{avg === null ? "Sin notas aún" : "Promedio"}</span>
            </span>
          </button>
          <button type="button" onClick={() => onNavigate("faltas")} className="flex min-w-0 items-center gap-3 px-4 py-3.5 text-left transition active:bg-muted">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", atRisk ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-foreground/[0.06] text-muted-foreground")}><UserX className="size-[18px]" /></span>
            <span className="min-w-0">
              <span className="num block text-lg font-semibold leading-tight">{absences.length}</span>
              <span className={cn("block truncate text-xs", atRisk ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{atRisk ? `${atRisk} en riesgo` : absences.length === 1 ? "Falta" : "Faltas"}</span>
            </span>
          </button>
        </div>
      </section>

      {/* Tablet y PC: tres tarjetas */}
      <div className="hidden grid-cols-3 gap-2 md:grid">
        <button type="button" onClick={() => onNavigate("notas")} className={tile}>
          <span className="block text-xs text-muted-foreground">Promedio</span>
          <span className="num mt-1 block text-xl font-semibold">{avgText}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{avg === null ? "Sin notas" : weighted ? "Ponderado" : "Acumulado"}</span>
        </button>
        <button type="button" onClick={onFocus} className={cn(tile, "relative overflow-hidden")}>
          <span className="flex items-center justify-between text-xs text-muted-foreground">Estudio <Timer className="size-3.5 text-brand" /></span>
          <span className="mt-1 flex items-center gap-2">
            <span className={goalMet ? "text-emerald-500" : "text-brand"}><Ring value={studied / studyGoal} size={26} stroke={3.5} className="text-current" /></span>
            <span className="num text-xl font-semibold">{studied}<span className="text-xs font-normal text-muted-foreground">m</span></span>
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{goalMet ? "¡Meta cumplida!" : `meta ${fmtMin(studyGoal)}`}</span>
        </button>
        <button type="button" onClick={() => onNavigate("faltas")} className={tile}>
          <span className="block text-xs text-muted-foreground">Faltas</span>
          <span className="num mt-1 block text-xl font-semibold">{absences.length}</span>
          <span className={cn("block truncate text-[11px]", atRisk ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{atRisk ? `${atRisk} en riesgo` : "Todo en orden"}</span>
        </button>
      </div>

      <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]", alerts.length === 0 && "max-lg:hidden")}>
        {/* Agenda del día (solo PC; en móvil se resume en la tarjeta principal) */}
        <section className="max-lg:hidden lg:col-start-1 lg:row-start-1">
          <Heading title={todayIdx >= 0 && todayIdx <= 4 ? `Tu ${DAYS[todayIdx].toLowerCase()}` : "Tu día"} action="Ver horario" onAction={() => onNavigate("horario")} />
          {todays.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Sin clases hoy. Un buen día para ponerte al día.</p>
          ) : (
            <ol className={cn(card, "divide-y")}>
              {todays.map((c) => {
                const s = getSubject(subjects, c.subjectId)!
                const state = c.endTime <= nowMin ? "done" : c.startTime <= nowMin ? "now" : "next"
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => onNavigate("horario")} className={cn(row, "flex items-center gap-3", state === "now" && "bg-foreground/[0.04]")}>
                      <span className={cn("num w-12 shrink-0 text-sm", state === "done" ? "text-muted-foreground" : "font-medium")}>{label(c.startTime)}</span>
                      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: s.border, opacity: state === "done" ? 0.4 : 1 }} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", state === "done" && "text-muted-foreground")}>{s.name}</span>
                        <span className="num block truncate text-xs text-muted-foreground">
                          hasta {label(c.endTime)}{c.room && ` · ${c.room}`}
                        </span>
                      </span>
                      {state === "now" && <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">En curso</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <div className="space-y-6 lg:col-start-2 lg:row-start-1">
          {/* Avisos: solo aparecen si hay algo que atender */}
          {alerts.length > 0 && (
            <section>
              <Heading title="Para atender" />
              <ul className={cn(card, "divide-y")}>
                {alerts.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onNavigate(a.tab)} className={cn(row, "flex items-start gap-3")}>
                      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.level === "bad" ? "bg-destructive" : "bg-amber-500")} />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-medium">{a.subject.name}</span>
                        <span className="block text-xs text-muted-foreground">{a.text}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="max-lg:hidden">
            <Heading title="Tu agenda" action="Ver todos" onAction={() => onNavigate("examenes")} />
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Nada programado.</p>
            ) : (
              <ul className={cn(card, "divide-y")}>
                {upcoming.slice(0, 4).map((e) => {
                  const s = getSubject(subjects, e.subjectId)
                  const k = findKind(kindsFromConfigs(subjectConfigs), e.kind)
                  const n = daysUntil(e.date)
                  const d = dateOf(e.date)
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => onNavigate("examenes")} className={cn(row, "flex items-center gap-3")}>
                        <span className="w-10 shrink-0 text-center leading-none">
                          <span className="num block text-lg font-semibold">{d.getDate()}</span>
                          <span className="block text-[11px] text-muted-foreground">{d.toLocaleDateString("es", { month: "short" }).replace(".", "")}</span>
                        </span>
                        <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: s ? s.border : KIND_COLORS[k.color] }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{e.title || s?.name || k.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{e.title && s ? `${s.name} · ` : ""}{k.name}{e.weight > 0 ? ` · ${e.weight}%` : ""}</span>
                        </span>
                        <span className={cn("shrink-0 text-xs", n <= 3 ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{dueLabel(n)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
      {/* Móvil: el resto del día como línea de tiempo, con los huecos libres entre clases */}
      {rest.length > 0 && (
        <section className="lg:hidden">
          <Heading title="Resto del día" action="Ver horario" onAction={() => onNavigate("horario")} />
          <ol className={cn(card, "px-4 py-2")}>
            {rest.map((c, i) => {
              const s = getSubject(subjects, c.subjectId)!
              const prevEnd = i === 0 ? heroCls?.endTime : rest[i - 1].endTime
              const gap = prevEnd !== undefined ? c.startTime - prevEnd : 0
              const first = i === 0 && gap < 30
              const last = i === rest.length - 1
              return (
                <li key={c.id}>
                  {gap >= 30 && (
                    <div className="flex items-center gap-3">
                      <span className="w-11 shrink-0" />
                      <span aria-hidden className={cn("flex w-3 shrink-0 justify-center self-stretch", i === 0 && "pt-3")}><span className="border-l border-dashed border-foreground/25" /></span>
                      <span className="num py-2 text-xs text-muted-foreground">Libre · {fmtDur(gap)}</span>
                    </div>
                  )}
                  <button type="button" onClick={() => onNavigate("horario")} className="flex w-full items-center gap-3 py-2.5 text-left transition active:opacity-70">
                    <span className="num w-11 shrink-0 text-sm font-semibold">{label(c.startTime)}</span>
                    <span aria-hidden className="relative flex w-3 shrink-0 items-center justify-center self-stretch">
                      <span className={cn("absolute w-px bg-foreground/15", first ? "top-1/2" : "top-0", last ? "bottom-1/2" : "bottom-0")} />
                      <span className="relative size-3 rounded-full ring-4 ring-card" style={{ background: s.border }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="num block truncate text-xs text-muted-foreground">{[c.room, `hasta ${label(c.endTime)}`].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}

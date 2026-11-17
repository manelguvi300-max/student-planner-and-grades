"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettings } from "@/lib/settings"
import {
  DAYS,
  FINAL_WEIGHT,
  absenceStatus,
  fmtHours,
  GLOBAL_CONFIG_KEY,
  accumulatedPoints,
  coveredWeight,
  getSubject,
  minutesToLabel,
  neededOnFinal,
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

export function HoyTab({ subjects, classes, grades, exams, absences, subjectConfigs, hiddenNotas, onNavigate }: Props) {
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
  const remaining = todays.filter((c) => c.endTime > nowMin).length

  // primera clase de los próximos días (cuando hoy ya no hay más)
  let later: { day: number; cls: ClassSession } | null = null
  if (!current && !next) {
    for (let off = 1; off <= 7 && !later; off++) {
      const d = (todayIdx + off + 7) % 7 // todayIdx puede ser -1 (domingo) o 5 (sábado)
      const cls = classes.filter((c) => c.day === d && getSubject(subjects, c.subjectId)).sort(byStart)[0]
      if (cls) later = { day: d, cls }
    }
  }

  // exámenes próximos
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysUntil = (s: string) => Math.round((dateOf(s).getTime() - today0) / 86_400_000)
  const upcoming = exams
    .filter((e) => !e.done && daysUntil(e.date) >= 0 && getSubject(subjects, e.subjectId))
    .sort((a, b) => a.date.localeCompare(b.date))
  const dueLabel = (n: number) => (n === 0 ? "Hoy" : n === 1 ? "Mañana" : `En ${n} días`)

  // promedio del acumulado de las materias con notas, sin contar las ocultas en Notas
  const graded = subjects.filter((s) => !hiddenNotas.includes(s.id) && coveredWeight(grades[s.id] ?? []) > 0)
  const avg = graded.length ? graded.reduce((n, s) => n + accumulatedPoints(grades[s.id]), 0) / graded.length : null

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
      const need = neededOnFinal(g)
      if (need > 5) alerts.push({ id: `n${s.id}`, level: "bad", subject: s, text: "Ya no alcanzas a pasar con el final", tab: "notas" })
      else if (need >= 4) alerts.push({ id: `n${s.id}`, level: "warn", subject: s, text: `Necesitas ${need.toFixed(1)} en el final (${FINAL_WEIGHT}%)`, tab: "notas" })
    }
  }
  alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "bad" ? -1 : 1))

  if (subjects.length === 0 && classes.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-dashed px-6 py-14 text-center">
        <h2 className="text-lg font-semibold">Empecemos tu semestre</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Crea tus materias y clases en el horario; aquí verás qué sigue cada día, tus exámenes y los avisos importantes.</p>
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

  const stats = [
    { tab: "horario", label: "Clases hoy", value: String(todays.length), sub: todays.length ? `${remaining} por ver` : "Día libre", warn: false },
    { tab: "examenes", label: "Próximo examen", value: upcoming[0] ? dueLabel(daysUntil(upcoming[0].date)) : "Ninguno", sub: upcoming[0] ? getSubject(subjects, upcoming[0].subjectId)?.name ?? "" : "Sin exámenes a la vista", warn: false },
    { tab: "notas", label: "Promedio", value: avg === null ? "—" : avg.toFixed(2).replace(".", ","), sub: avg === null ? "Aún sin notas" : "Acumulado", warn: false },
    { tab: "faltas", label: "Faltas", value: String(absences.length), sub: atRisk ? `${atRisk} materia${atRisk > 1 ? "s" : ""} en riesgo` : "Todo en orden", warn: atRisk > 0 },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {/* Qué sigue */}
      <section className={cn(card, "flex")}>
        <span aria-hidden className="w-1.5 shrink-0" style={{ background: heroSubject?.border ?? "var(--border)" }} />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
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
      </section>

      {/* Resumen en una sola tira */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
        {stats.map((st) => (
          <button key={st.tab} type="button" onClick={() => onNavigate(st.tab)}
            className="min-w-0 bg-card px-4 py-3 text-left transition hover:bg-muted/60 active:bg-muted">
            <span className="block text-xs text-muted-foreground">{st.label}</span>
            <span className="num mt-0.5 block truncate text-xl font-semibold">{st.value}</span>
            <span className={cn("block truncate text-xs", st.warn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{st.sub}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Agenda del día */}
        <section>
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

        <div className="space-y-6">
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

          <section>
            <Heading title="Próximos exámenes" action="Ver todos" onAction={() => onNavigate("examenes")} />
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Nada programado.</p>
            ) : (
              <ul className={cn(card, "divide-y")}>
                {upcoming.slice(0, 4).map((e) => {
                  const s = getSubject(subjects, e.subjectId)!
                  const n = daysUntil(e.date)
                  const d = dateOf(e.date)
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => onNavigate("examenes")} className={cn(row, "flex items-center gap-3")}>
                        <span className="w-10 shrink-0 text-center leading-none">
                          <span className="num block text-lg font-semibold">{d.getDate()}</span>
                          <span className="block text-[11px] text-muted-foreground">{d.toLocaleDateString("es", { month: "short" }).replace(".", "")}</span>
                        </span>
                        <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: s.border }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{e.title || s.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{e.title ? `${s.name} · ` : ""}{e.kind === "examen" ? "Examen" : "Presentación"}{e.weight > 0 ? ` · ${e.weight}%` : ""}</span>
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
    </div>
  )
}

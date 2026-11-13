"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, Sparkles, UserX } from "lucide-react"
import { CountUp } from "@/components/ui/count-up"
import { cn } from "@/lib/utils"
import { useSettings } from "@/lib/settings"
import {
  DAYS,
  FINAL_WEIGHT,
  PASSING_GRADE,
  absenceLimit,
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

function Tile({ icon: Icon, label, onClick, i, children }: { icon: typeof CalendarDays; label: string; onClick: () => void; i: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${120 + i * 70}ms` }}
      className="group animate-rise rounded-2xl border bg-card p-4 text-left shadow-(--card-shadow) transition duration-300 hover:-translate-y-0.5 hover:border-foreground/25 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em]">{label}</span>
        <Icon className="size-4 transition-transform duration-300 group-hover:scale-125" />
      </div>
      {children}
    </button>
  )
}

function Section({ title, action, onAction, children, delay = 0 }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode; delay?: number }) {
  return (
    <section className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action && (
          <button type="button" onClick={onAction} className="group flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
            {action}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export function HoyTab({ subjects, classes, grades, exams, absences, subjectConfigs, hiddenNotas, onNavigate }: Props) {
  const { settings } = useSettings()
  const now = useNow()
  const label = (m: number) => minutesToLabel(m, settings.timeFormat)

  if (!now) return <div className="skeleton h-56 rounded-3xl" />

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
    .filter((e) => daysUntil(e.date) >= 0 && getSubject(subjects, e.subjectId))
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
    const cfg = subjectConfigs[s.id]
    if (cfg) {
      const count = absences.filter((a) => a.subjectId === s.id).length
      const left = absenceLimit(cfg.directHours) - count
      if (left < 0) alerts.push({ id: `f${s.id}`, level: "bad", subject: s, text: "Superaste el límite de faltas", tab: "faltas" })
      else if (left <= 1) { alerts.push({ id: `f${s.id}`, level: "warn", subject: s, text: left === 0 ? "No te quedan faltas disponibles" : "Te queda 1 falta disponible", tab: "faltas" }) }
      if (left <= 1) atRisk++
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
      <div className="animate-scale-in rounded-3xl border-2 border-dashed bg-card px-6 py-16 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-foreground/10"><Sparkles className="size-6" /></div>
        <h2 className="text-xl font-semibold">Empecemos tu semestre</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Crea tus materias y clases en el horario; aquí verás cada día qué sigue, tus exámenes y tus alertas.</p>
        <button
          type="button"
          onClick={() => onNavigate("horario")}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 active:scale-[0.97]"
        >
          Ir al horario <ArrowRight className="size-4" />
        </button>
      </div>
    )
  }

  // ── Tarjeta principal: qué toca ahora ──
  const heroCls = current ?? next ?? later?.cls
  const heroSubject = heroCls ? getSubject(subjects, heroCls.subjectId) : undefined
  const pct = current ? Math.round(((nowMin - current.startTime) / (current.endTime - current.startTime)) * 100) : 0

  return (
    <div className="space-y-6">
      <section className="relative animate-rise overflow-hidden rounded-3xl border bg-card p-5 shadow-(--card-shadow) sm:p-7">
        {heroSubject && <span aria-hidden className="absolute inset-y-5 left-0 w-1.5 rounded-r-full sm:inset-y-7" style={{ background: heroSubject.border }} />}
        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", current ? "animate-glow bg-emerald-500" : "bg-foreground/40")} />
            {current ? "En clase ahora" : next ? "Siguiente clase" : todays.length ? "Terminaste por hoy" : "Hoy no tienes clases"}
          </p>

          {heroCls && heroSubject ? (
            <>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{heroSubject.name}</h2>
              <p className="num mt-1.5 text-sm text-muted-foreground">
                {later && `${DAYS[later.day]} · `}
                {label(heroCls.startTime)} – {label(heroCls.endTime)}
                {heroCls.room && ` · ${heroCls.room}`}
              </p>
              {current ? (
                <div className="mt-5">
                  <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${pct}%`, background: heroSubject.border }} />
                  </div>
                  <p className="num mt-2 text-sm">Termina en <b>{fmtDur(current.endTime - nowMin)}</b> <span className="text-muted-foreground">· {pct}%</span></p>
                </div>
              ) : next ? (
                <p className="num mt-5 text-2xl font-light">en <b className="font-semibold">{fmtDur(next.startTime - nowMin)}</b></p>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">Tu próxima clase es el {DAYS[later!.day].toLowerCase()}.</p>
              )}
            </>
          ) : (
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              {todays.length === 0 && classes.length === 0 ? "Aún no has agregado clases al horario." : "Disfruta el descanso; nada pendiente por ahora."}
            </p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile i={0} icon={CalendarDays} label="Clases hoy" onClick={() => onNavigate("horario")}>
          <p className="num mt-3 text-4xl font-light"><CountUp value={todays.length} /></p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{todays.length ? `${remaining} por ver` : "Día libre"}</p>
        </Tile>
        <Tile i={1} icon={ClipboardList} label="Próx. examen" onClick={() => onNavigate("examenes")}>
          {upcoming[0] ? (
            <>
              <p className="mt-3 text-2xl font-semibold leading-none tracking-tight">{dueLabel(daysUntil(upcoming[0].date))}</p>
              <p className="mt-1.5 truncate text-xs text-muted-foreground">{getSubject(subjects, upcoming[0].subjectId)?.name}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-semibold leading-none tracking-tight">Libre</p>
              <p className="mt-1.5 text-xs text-muted-foreground">Sin exámenes a la vista</p>
            </>
          )}
        </Tile>
        <Tile i={2} icon={GraduationCap} label="Promedio" onClick={() => onNavigate("notas")}>
          {avg === null ? (
            <p className="mt-3 text-sm text-muted-foreground">Agrega notas para ver tu promedio</p>
          ) : (
            <>
              <p className="mt-3 text-4xl font-light"><CountUp value={avg} decimals={2} /></p>
              <p className="mt-1 text-xs text-muted-foreground">Acumulado promedio</p>
            </>
          )}
        </Tile>
        <Tile i={3} icon={UserX} label="Faltas" onClick={() => onNavigate("faltas")}>
          <p className="num mt-3 text-4xl font-light"><CountUp value={absences.length} /></p>
          <p className={cn("mt-1 truncate text-xs", atRisk ? "text-amber-500" : "text-muted-foreground")}>{atRisk ? `${atRisk} materia${atRisk > 1 ? "s" : ""} en riesgo` : "Todo en orden"}</p>
        </Tile>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Línea de tiempo del día */}
        <Section title={todayIdx >= 0 && todayIdx <= 4 ? `Tu ${DAYS[todayIdx].toLowerCase()}` : "Tu día"} action="Ver horario" onAction={() => onNavigate("horario")} delay={300}>
          {todays.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">Sin clases hoy. Un buen día para ponerte al día.</div>
          ) : (
            <ol className="relative space-y-2.5">
              {todays.map((c, i) => {
                const s = getSubject(subjects, c.subjectId)!
                const state = c.endTime <= nowMin ? "done" : c.startTime <= nowMin ? "now" : "next"
                return (
                  <li key={c.id} className="animate-rise" style={{ animationDelay: `${340 + i * 70}ms` }}>
                    <button
                      type="button"
                      onClick={() => onNavigate("horario")}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition duration-300 hover:border-foreground/25 active:scale-[0.99]",
                        state === "done" && "opacity-55",
                        state === "now" && "border-foreground/30 shadow-(--card-shadow)"
                      )}
                    >
                      <span className="num w-14 shrink-0 text-xs text-muted-foreground">{label(c.startTime)}</span>
                      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: s.border }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{s.name}</span>
                        <span className="num block truncate text-xs text-muted-foreground">
                          {label(c.startTime)} – {label(c.endTime)}{c.room && ` · ${c.room}`}
                        </span>
                      </span>
                      {state === "done" && <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />}
                      {state === "now" && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">En curso</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Atención" delay={360}>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> Sin alertas de faltas ni notas.
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onNavigate(a.tab)} className="flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-foreground/25 active:scale-[0.99]">
                      <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", a.level === "bad" ? "text-destructive" : "text-amber-500")} />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-medium">{a.subject.name}</span>
                        <span className="block text-xs text-muted-foreground">{a.text}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Próximos exámenes" action="Calendario" onAction={() => onNavigate("examenes")} delay={420}>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">Nada programado.</div>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 4).map((e) => {
                  const s = getSubject(subjects, e.subjectId)!
                  const n = daysUntil(e.date)
                  const d = dateOf(e.date)
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => onNavigate("examenes")} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-foreground/25 active:scale-[0.99]">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-neutral-900" style={{ background: s.bg }}>
                          <span className="text-center leading-none">
                            <span className="num block text-base font-bold">{d.getDate()}</span>
                            <span className="block text-[9px] font-semibold uppercase">{d.toLocaleDateString("es", { month: "short" }).replace(".", "")}</span>
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s.name}</span>
                          <span className="block text-xs text-muted-foreground">{e.kind === "examen" ? "Examen" : "Presentación"} · {e.weight}%</span>
                        </span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", n <= 3 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-foreground/[0.07] text-muted-foreground")}>{dueLabel(n)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
